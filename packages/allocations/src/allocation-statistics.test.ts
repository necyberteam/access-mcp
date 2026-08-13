import { describe, it, expect, vi } from "vitest";
import { AllocationsServer } from "./server.js";
import type { CorpusSnapshot } from "./corpus-cache.js";

/**
 * get_allocation_statistics is a census over the COMPLETE resident corpus, not a
 * recent-pages sample. Counts must reflect every project (including legacy
 * allocationType values like "Research" that the current-facets enum omits), and
 * the header must not claim "census" when the corpus is truncated.
 */

type Rec = {
  fos: string;
  piInstitution: string;
  allocationType: string;
  resources: { resourceName: string }[];
};

function proj(fos: string, inst: string, type: string, resources: string[]): Rec {
  return { fos, piInstitution: inst, allocationType: type, resources: resources.map((resourceName) => ({ resourceName })) };
}

function makeServer(records: Rec[], truncated = false): AllocationsServer {
  const server = new AllocationsServer();
  const snapshot: CorpusSnapshot<Rec> = {
    records: records as never,
    pages: 1,
    truncated,
    fetchedAt: Date.now(),
  };
  vi.spyOn(
    server as unknown as { ensureCorpus: () => Promise<CorpusSnapshot<Rec>> },
    "ensureCorpus",
  ).mockResolvedValue(snapshot);
  return server;
}

async function stats(server: AllocationsServer): Promise<string> {
  const res = await (
    server as unknown as { getAllocationStatistics: () => Promise<{ content: { text: string }[] }> }
  ).getAllocationStatistics();
  return res.content[0].text;
}

describe("get_allocation_statistics census", () => {
  const corpus = [
    proj("Computer Science", "Purdue University", "Explore", ["Delta"]),
    proj("Computer Science", "Purdue University", "Maximize", ["Delta", "Anvil"]),
    proj("Physics", "MIT", "Discover", ["Anvil"]),
    proj("Physics", "MIT", "Research", ["Anvil"]), // legacy tier absent from the facet enum
  ];

  it("counts every project in the corpus, including the legacy 'Research' tier", async () => {
    const text = await stats(makeServer(corpus));
    // Top field: Computer Science (2) and Physics (2) both present with counts.
    expect(text).toMatch(/Computer Science: 2 projects/);
    expect(text).toMatch(/Physics: 2 projects/);
    // Resource counts aggregate across the whole corpus (Anvil appears in 3).
    expect(text).toMatch(/Anvil: 3 projects/);
    // The legacy 'Research' tier is not silently dropped.
    expect(text).toMatch(/Research: 1 projects/);
    expect(text).toMatch(/Explore: 1 projects/);
  });

  it("labels a complete corpus as a census", async () => {
    const text = await stats(makeServer(corpus));
    expect(text).toMatch(/Census of all 4 current projects/);
  });

  it("does NOT claim a census when the corpus is truncated", async () => {
    const text = await stats(makeServer(corpus, /* truncated */ true));
    expect(text).not.toMatch(/Census/);
    expect(text).toMatch(/lower bound/);
  });
});
