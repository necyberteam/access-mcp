import { describe, it, expect, vi } from "vitest";
import { AllocationsServer } from "./server.js";
import type { CorpusSnapshot } from "./corpus-cache.js";

/**
 * H5 regression: analyze_funding's NSF fan-out must stay bounded by fixed caps,
 * NOT by how many ACCESS projects match. Now that institution lookups filter the
 * full resident corpus (instead of ~100 projects), a naive design could issue one
 * NSF call per matched project. It must not. The institutional funding profile
 * fans out on two fixed-size loops only:
 *   - institution variants: capped at the first 3 (Step 3), and
 *   - PI cross-reference: capped at the first 10 projects (crossReferenceInstitutionPIs).
 * So the NSF call count is <= 13 regardless of match count — never O(matches).
 */
const MAX_NSF_CALLS = 3 /* variants */ + 10 /* PIs */;

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

function rec(id: number, institution: string): Rec {
  return {
    projectId: id,
    requestNumber: `REQ${id}`,
    requestTitle: `Project ${id}`,
    pi: `PI ${id}`,
    piInstitution: institution,
    fos: "Computer Science",
    abstract: "abstract",
    allocationType: "Explore",
    beginDate: "2026-01-01",
    endDate: "2027-01-01",
    resources: [],
  };
}

/** A corpus where MANY projects match one institution (would blow up a per-project fan-out). */
function corpusWithManyMatches(institution: string, count: number): CorpusSnapshot<Rec> {
  const records = Array.from({ length: count }, (_, i) => rec(i + 1, institution));
  return { records: records as never, pages: 1, truncated: false, fetchedAt: Date.now() };
}

describe("analyze_funding NSF fan-out is bounded by variants, not match count", () => {
  it("issues a bounded number of NSF calls even when 200 projects match the institution", async () => {
    const server = new AllocationsServer();

    // 200 corpus projects all at Stanford — a per-project fan-out would be 200 NSF calls.
    vi.spyOn(
      server as unknown as { ensureCorpus: () => Promise<CorpusSnapshot<Rec>> },
      "ensureCorpus",
    ).mockResolvedValue(corpusWithManyMatches("Stanford University", 200));

    // Count NSF calls at the remote-server seam; return an empty NSF result each time.
    const nsfCalls: unknown[] = [];
    vi.spyOn(
      server as unknown as {
        callRemoteServer: (s: string, t: string, a: unknown) => Promise<unknown>;
      },
      "callRemoteServer",
    ).mockImplementation(async (_server, _tool, args) => {
      nsfCalls.push(args);
      return { content: [{ text: "No awards found" }] };
    });

    const limit = 20;
    await (
      server as unknown as {
        institutionalFundingProfile: (n: string, l: number) => Promise<unknown>;
      }
    ).institutionalFundingProfile("Stanford University", limit);

    // Bounded by fixed caps (3 variants + 10 PIs), never once per matched
    // project: 200 matches must not become 200 NSF calls.
    expect(nsfCalls.length).toBeGreaterThan(0);
    expect(nsfCalls.length).toBeLessThanOrEqual(MAX_NSF_CALLS);
    expect(nsfCalls.length).toBeLessThan(200);
  });
});
