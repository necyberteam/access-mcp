import { describe, it, expect, vi } from "vitest";
import { AllocationsServer } from "./server.js";
import type { CorpusSnapshot } from "./corpus-cache.js";

/**
 * D2 freshness for point lookups (findProjectById, which backs get project
 * details / analyze_funding / similar-projects). The corpus is real-time and
 * page 1 is newest-first, so a project approved after the last snapshot would be
 * a false "not found". On an EXPIRED-snapshot miss we do a bounded live scan.
 *
 * Contracts under test:
 *  - corpus HIT returns the corpus record, never touches the network.
 *  - miss + snapshot within TTL returns undefined WITHOUT a live scan.
 *  - miss + expired snapshot runs the bounded (<=3 page) live scan and finds a
 *    just-approved project on page 1.
 *  - a revalidated hit is PROJECTED (no leaked `publications`), matching corpus shape.
 *  - the live scan is capped at 3 pages and swallows upstream errors into undefined.
 */

type Raw = Record<string, unknown> & { projectId: number };

function corpusOf(ids: number[]): CorpusSnapshot<Raw> {
  return {
    records: ids.map((projectId) => ({ projectId })) as never,
    pages: 1,
    truncated: false,
    fetchedAt: Date.now(),
  };
}

function server() {
  return new AllocationsServer() as unknown as {
    findProjectById: (id: number) => Promise<Raw | undefined>;
    ensureCorpus: () => Promise<CorpusSnapshot<Raw>>;
    fetchProjects: (page: number) => Promise<{ projects: Raw[]; pages: number }>;
    corpus: { isExpiredNow: () => boolean };
  };
}

describe("findProjectById D2 revalidation", () => {
  it("returns a corpus hit without touching the network", async () => {
    const s = server();
    vi.spyOn(s, "ensureCorpus").mockResolvedValue(corpusOf([1, 2, 3]));
    const fetchSpy = vi.spyOn(s, "fetchProjects");

    const got = await s.findProjectById(2);
    expect(got?.projectId).toBe(2);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does NOT hit the network on a miss when the snapshot is within TTL", async () => {
    const s = server();
    vi.spyOn(s, "ensureCorpus").mockResolvedValue(corpusOf([1, 2, 3]));
    vi.spyOn(s.corpus, "isExpiredNow").mockReturnValue(false); // fresh
    const fetchSpy = vi.spyOn(s, "fetchProjects");

    const got = await s.findProjectById(999);
    expect(got).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("runs a bounded live scan on an expired-snapshot miss and finds a just-approved project", async () => {
    const s = server();
    vi.spyOn(s, "ensureCorpus").mockResolvedValue(corpusOf([1, 2, 3]));
    vi.spyOn(s.corpus, "isExpiredNow").mockReturnValue(true); // expired
    const fetchSpy = vi.spyOn(s, "fetchProjects").mockResolvedValue({
      // newest-first page 1 carries a project newer than the snapshot, with a
      // heavy `publications` field the corpus projector normally strips.
      projects: [{ projectId: 999, publications: ["heavy", "unused"], abstract: "keep" }],
      pages: 5,
    });

    const got = await s.findProjectById(999);
    expect(got?.projectId).toBe(999);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // found on page 1
    // Revalidated hit is PROJECTED — publications must not leak back out.
    expect(got).not.toHaveProperty("publications");
    expect(got).toHaveProperty("abstract", "keep");
  });

  it("caps the live scan at 3 pages when the project is never found", async () => {
    const s = server();
    vi.spyOn(s, "ensureCorpus").mockResolvedValue(corpusOf([1]));
    vi.spyOn(s.corpus, "isExpiredNow").mockReturnValue(true);
    const fetchSpy = vi
      .spyOn(s, "fetchProjects")
      .mockResolvedValue({ projects: [{ projectId: 42 }], pages: 100 });

    const got = await s.findProjectById(999);
    expect(got).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(3); // REVALIDATE_PAGES, not all 100
  });

  it("swallows an upstream error during the scan and returns undefined", async () => {
    const s = server();
    vi.spyOn(s, "ensureCorpus").mockResolvedValue(corpusOf([1]));
    vi.spyOn(s.corpus, "isExpiredNow").mockReturnValue(true);
    vi.spyOn(s, "fetchProjects").mockRejectedValue(new Error("upstream 503"));

    await expect(s.findProjectById(999)).resolves.toBeUndefined();
  });
});
