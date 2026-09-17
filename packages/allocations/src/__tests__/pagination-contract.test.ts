import { describe, it, expect, vi } from "vitest";
import { AllocationsServer } from "../server.js";

type Resource = { resourceName: string; units: string | null; allocation: number | null; resourceId: number };

type Project = {
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
  resources: Resource[];
};

/**
 * Stub the resident corpus so tests are deterministic — no live API, no
 * assumptions about real data shape. Matches the CorpusSnapshot shape
 * ensureCorpus/corpusListingEnvelope actually consume.
 */
function stubCorpus(server: AllocationsServer, records: Project[]) {
  vi.spyOn(server as unknown as { ensureCorpus: () => Promise<unknown> }, "ensureCorpus").mockResolvedValue({
    records,
    fetchedAt: 1_700_000_000_000,
    pages: 1,
    truncated: false,
  });
}

async function callSearchProjects(server: AllocationsServer, args: Record<string, unknown>) {
  const result = await server["handleToolCall"]({
    method: "tools/call",
    params: { name: "search_projects", arguments: args },
  });
  const content = (result as { content: Array<{ type: string; text?: string }> }).content;
  return JSON.parse(content[0].text as string);
}

/**
 * Tier-A conformance (spec §8): a static drift guard asserting the schema
 * declares the universal pagination params and a representative response
 * carries honest pagination metadata. No live upstream. Phase 1 covers
 * search_projects only; later phases extend to more tools.
 */
describe("Tier-A pagination conformance: search_projects", () => {
  it("declares limit and offset in its schema", () => {
    const server = new AllocationsServer();
    const tools = server["getTools"]();
    const sp = tools.find((t: { name: string }) => t.name === "search_projects") as {
      inputSchema: { properties: Record<string, unknown> };
    };
    expect(sp.inputSchema.properties.limit).toBeDefined();
    expect(sp.inputSchema.properties.offset).toBeDefined();
  });

  it("response carries {limit, offset, total, has_more}", async () => {
    const server = new AllocationsServer();
    stubCorpus(server, [
      {
        projectId: 1,
        requestNumber: "R",
        requestTitle: "P",
        pi: "x",
        piInstitution: "y",
        fos: "Physics",
        abstract: "",
        allocationType: "Explore",
        beginDate: "2024-01-01",
        endDate: "2026-01-01",
        resources: [],
      },
    ]);

    const res = await callSearchProjects(server, { field_of_science: "Physics", limit: 5 });
    const p = res.metadata.pagination;
    for (const k of ["limit", "offset", "total", "has_more"]) {
      expect(p[k]).toBeDefined();
    }
  });

  it("has_more is false at the final page boundary", async () => {
    const server = new AllocationsServer();
    const recs: Project[] = Array.from({ length: 25 }, (_, i) => ({
      projectId: i + 1,
      requestNumber: `R${i}`,
      requestTitle: `P${i}`,
      pi: "x",
      piInstitution: "y",
      fos: "Physics",
      abstract: "",
      allocationType: "Explore",
      beginDate: "2024-01-01",
      endDate: "2026-01-01",
      resources: [],
    }));
    stubCorpus(server, recs);

    // 25 total records, last page: offset 20 + limit 10 -> 5 returned, 20 + 5 = 25 = total.
    const lastPage = await callSearchProjects(server, {
      field_of_science: "Physics",
      limit: 10,
      offset: 20,
    });

    expect(lastPage.items).toHaveLength(5);
    expect(lastPage.metadata.pagination.total).toBe(25);
    expect(lastPage.metadata.pagination.offset).toBe(20);
    expect(lastPage.metadata.pagination.has_more).toBe(false);
  });
});
