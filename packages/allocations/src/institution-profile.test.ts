import { describe, it, expect, vi } from "vitest";
import { AllocationsServer } from "./server.js";
import type { CorpusSnapshot } from "./corpus-cache.js";

/**
 * Wiring tests for institutionalFundingProfile's resolution behavior (the
 * resolver algorithm itself is covered in institution-resolver.test.ts). An
 * exact/unambiguous institution is profiled by EXACT join; an ambiguous query
 * returns a disambiguation list instead of guessing a campus.
 */

type Rec = { projectId: number; pi: string; piInstitution: string; fos: string; resources: unknown[] };

function proj(id: number, inst: string): Rec {
  return { projectId: id, pi: `PI ${id}`, piInstitution: inst, fos: "Computer Science", resources: [] };
}

function server(records: Rec[]): AllocationsServer {
  const s = new AllocationsServer();
  const snapshot: CorpusSnapshot<Rec> = { records: records as never, pages: 1, truncated: false, fetchedAt: Date.now() };
  vi.spyOn(s as unknown as { ensureCorpus: () => Promise<CorpusSnapshot<Rec>> }, "ensureCorpus").mockResolvedValue(snapshot);
  // Stub NSF fan-out so the profile doesn't hit the network.
  vi.spyOn(s as unknown as { callRemoteServer: (...a: unknown[]) => Promise<unknown> }, "callRemoteServer")
    .mockResolvedValue({ content: [{ text: "No awards found" }] });
  return s;
}

async function profile(s: AllocationsServer, query: string): Promise<string> {
  const res = await (
    s as unknown as { institutionalFundingProfile: (n: string, l?: number) => Promise<{ content: { text: string }[] }> }
  ).institutionalFundingProfile(query, 20);
  return res.content[0].text;
}

// A corpus with the collision family and a multi-campus system.
const CORPUS = [
  proj(1, "University of Washington"),
  proj(2, "University of Washington"),
  proj(3, "Washington University in St. Louis"),
  proj(4, "George Washington University"),
  proj(5, "Texas A&M University"),
  proj(6, "Texas A&M International University"),
  proj(7, "Stanford University"),
];

describe("institutionalFundingProfile resolution", () => {
  it("profiles an exact institution by exact join, not fuzzy", async () => {
    const text = await profile(server(CORPUS), "University of Washington");
    expect(text).toMatch(/Resolved To:\*\* University of Washington/);
    // 2 UW projects, and NOT the other Washington schools.
    expect(text).toMatch(/2 projects/);
    expect(text).not.toMatch(/St\. Louis/);
    expect(text).not.toMatch(/George Washington/);
  });

  it("does not conflate 'University of Washington' with 'Washington University'", async () => {
    const text = await profile(server(CORPUS), "Washington University in St. Louis");
    expect(text).toMatch(/Resolved To:\*\* Washington University in St\. Louis/);
    expect(text).toMatch(/1 projects/);
  });

  it("returns a disambiguation list for an ambiguous query instead of guessing", async () => {
    const text = await profile(server(CORPUS), "Texas A&M");
    expect(text).toMatch(/Multiple institutions match "Texas A&M"/);
    expect(text).toMatch(/Texas A&M University/);
    expect(text).toMatch(/Texas A&M International University/);
    // It must NOT have profiled one of them.
    expect(text).not.toMatch(/Institutional Funding Profile/);
  });

  it("reports no match cleanly for an unknown institution", async () => {
    const text = await profile(server(CORPUS), "Nonexistent Polytechnic ZZZ");
    expect(text).toMatch(/No ACCESS institution matches/);
  });
});
