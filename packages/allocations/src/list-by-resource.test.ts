import { describe, it, expect, vi } from "vitest";
import { AllocationsServer } from "./server.js";
import type { CorpusSnapshot } from "./corpus-cache.js";

/**
 * Regression for the reported bug: filtering by resource used to scan only the
 * first ~10 pages, so a resource whose matching projects sat past the cap
 * returned total:0 (PNRP: 0 shown, 9 real). With the corpus fix, `total` is the
 * true count over the complete set. These tests inject a controlled corpus so
 * the bug is reproduced deterministically (no dependence on the live PNRP count).
 */

type Rec = {
  projectId: number;
  requestNumber: string;
  requestTitle: string;
  pi: string;
  piInstitution: string;
  fos: string;
  abstract: string;
  allocationType: string;
  beginDate: string;
  endDate: string;
  resources: { resourceName: string; units: null; allocation: null; resourceId: number }[];
};

function rec(id: number, resourceNames: string[]): Rec {
  return {
    projectId: id,
    requestNumber: `REQ${id}`,
    requestTitle: `Project ${id}`,
    pi: `PI ${id}`,
    piInstitution: "Test University",
    fos: "Computer Science",
    abstract: "abstract",
    allocationType: "Explore",
    beginDate: "2026-01-01",
    endDate: "2027-01-01",
    resources: resourceNames.map((resourceName, i) => ({
      resourceName,
      units: null,
      allocation: null,
      resourceId: 1000 + i,
    })),
  };
}

/** Build a corpus where N projects reference a "deep" resource, all past page 10. */
function corpusWithDeepResource(deepName: string, deepCount: number): CorpusSnapshot<Rec> {
  const records: Rec[] = [];
  // 250 filler projects (past the old 10-page * 20 = 200 cap) on other resources
  for (let i = 1; i <= 250; i++) records.push(rec(i, ["Some Other Resource"]));
  // then the deep-resource projects, sitting at the tail (past page 10)
  for (let i = 0; i < deepCount; i++) records.push(rec(1000 + i, [deepName]));
  return { records: records as never, pages: 13, truncated: false, fetchedAt: Date.now() };
}

function makeServer(snapshot: CorpusSnapshot<Rec>): AllocationsServer {
  const server = new AllocationsServer();
  // Inject the corpus: stub ensureCorpus to return our fixture.
  vi.spyOn(
    server as unknown as { ensureCorpus: () => Promise<CorpusSnapshot<Rec>> },
    "ensureCorpus",
  ).mockResolvedValue(snapshot);
  return server;
}

async function listByResource(server: AllocationsServer, name: string, limit = 20) {
  const res = await (
    server as unknown as {
      listProjectsByResource: (n: string, l?: number) => Promise<{ content: { text: string }[] }>;
    }
  ).listProjectsByResource(name, limit);
  return JSON.parse(res.content[0].text);
}

describe("listProjectsByResource over the complete corpus", () => {
  it("returns the TRUE total for a resource whose matches sit past the old page cap (the PNRP bug)", async () => {
    const server = makeServer(corpusWithDeepResource("Prototype National Research Platform (PNRP)", 9));
    const out = await listByResource(server, "PNRP");
    expect(out.total).toBe(9); // not 0 (old bug), not capped
    expect(out.items).toHaveLength(9);
  });

  it("total is the full match count even when it exceeds the page limit; items are sliced", async () => {
    const server = makeServer(corpusWithDeepResource("Prototype National Research Platform (PNRP)", 55));
    const out = await listByResource(server, "PNRP", 20);
    expect(out.total).toBe(55); // true count, NOT capped at limit (the M3 fix)
    expect(out.items).toHaveLength(20); // items sliced to limit
    expect(out.metadata.pagination.has_more).toBe(true);
  });

  it("surfaces corpus freshness and no spurious truncated flag", async () => {
    const server = makeServer(corpusWithDeepResource("PNRP", 3));
    const out = await listByResource(server, "PNRP");
    expect(out.metadata.fetched_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(out.metadata.corpus_truncated).toBeUndefined();
  });

  it("flags corpus_truncated when the snapshot is incomplete (never reports a partial as complete)", async () => {
    const snapshot = corpusWithDeepResource("PNRP", 3);
    (snapshot as { truncated: boolean }).truncated = true; // corpus exceeded the fetch hardCap
    const server = makeServer(snapshot);
    const out = await listByResource(server, "PNRP");
    expect(out.metadata.corpus_truncated).toBe(true);
  });

  it("flags stale when the snapshot is past the staleness ceiling", async () => {
    const snapshot = corpusWithDeepResource("PNRP", 3);
    const server = makeServer(snapshot);
    // The envelope reads staleness from the live cache, not the snapshot object.
    vi.spyOn(
      (server as unknown as { corpus: { isStale: () => boolean } }).corpus,
      "isStale",
    ).mockReturnValue(true);
    const out = await listByResource(server, "PNRP");
    expect(out.metadata.stale).toBe(true);
  });
});
