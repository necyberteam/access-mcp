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

describe("search_projects offset + filters + honest pagination metadata", () => {
  it("honors offset on a non-query branch (different window than offset:0)", async () => {
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

    const page0 = await callSearchProjects(server, {
      field_of_science: "Physics",
      limit: 10,
      offset: 0,
    });
    const page1 = await callSearchProjects(server, {
      field_of_science: "Physics",
      limit: 10,
      offset: 10,
    });

    expect(page0.metadata.pagination.offset).toBe(0);
    expect(page1.metadata.pagination.offset).toBe(10);
    expect(page1.items[0]).not.toEqual(page0.items[0]);
    expect(page0.metadata.pagination.total).toBe(25);
    expect(page0.metadata.pagination.has_more).toBe(true);
  });

  it("honors offset on the query branch (searchProjects)", async () => {
    const server = new AllocationsServer();
    const recs: Project[] = Array.from({ length: 15 }, (_, i) => ({
      projectId: i + 1,
      requestNumber: `R${i}`,
      requestTitle: `Machine learning project ${i}`,
      pi: "x",
      piInstitution: "y",
      fos: "Computer Science",
      abstract: "machine learning research",
      allocationType: "Explore",
      beginDate: "2024-01-01",
      endDate: "2026-01-01",
      resources: [],
    }));
    stubCorpus(server, recs);

    const page0 = await callSearchProjects(server, { query: "machine learning", limit: 5, offset: 0 });
    const page1 = await callSearchProjects(server, { query: "machine learning", limit: 5, offset: 5 });

    expect(page0.metadata.pagination.offset).toBe(0);
    expect(page1.metadata.pagination.offset).toBe(5);
    expect(page1.items[0]).not.toEqual(page0.items[0]);
    expect(page0.metadata.pagination.total).toBe(15);
  });

  it("clamps limit over MAX_LIMIT and flags capped (non-query branch)", async () => {
    const server = new AllocationsServer();
    const recs: Project[] = Array.from({ length: 3 }, (_, i) => ({
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

    const res = await callSearchProjects(server, { field_of_science: "Physics", limit: 5000 });

    expect(res.metadata.pagination.limit).toBe(500);
    expect(res.metadata.pagination.capped).toBe(true);
  });

  it("clamps limit over MAX_LIMIT and flags capped (query branch)", async () => {
    const server = new AllocationsServer();
    const recs: Project[] = [
      {
        projectId: 1,
        requestNumber: "R1",
        requestTitle: "Machine learning project",
        pi: "x",
        piInstitution: "y",
        fos: "Computer Science",
        abstract: "machine learning research",
        allocationType: "Explore",
        beginDate: "2024-01-01",
        endDate: "2026-01-01",
        resources: [],
      },
    ];
    stubCorpus(server, recs);

    const res = await callSearchProjects(server, { query: "machine learning", limit: 5000 });

    expect(res.metadata.pagination.limit).toBe(500);
    expect(res.metadata.pagination.capped).toBe(true);
  });

  it("no longer throws when limit exceeds the old 200 ceiling on a list branch", async () => {
    const server = new AllocationsServer();
    stubCorpus(server, []);

    const res = await callSearchProjects(server, { field_of_science: "Physics", limit: 250 });

    expect(res.metadata.pagination.limit).toBe(250);
    expect(res.metadata.pagination.capped).toBeUndefined();
  });

  it("still rejects limit < 1 on a list branch", async () => {
    const server = new AllocationsServer();
    stubCorpus(server, []);

    const res = await callSearchProjects(server, { field_of_science: "Physics", limit: 0 });

    expect(res.status).toBe("error");
    expect(res.error.message).toMatch(/limit/i);
  });

  it("discloses applied filters on a non-query branch (object-keyed, merged with branch's own filters)", async () => {
    const server = new AllocationsServer();
    const recs: Project[] = [
      {
        projectId: 1,
        requestNumber: "R1",
        requestTitle: "P1",
        pi: "x",
        piInstitution: "y",
        fos: "Physics",
        abstract: "",
        allocationType: "Explore",
        beginDate: "2024-01-01",
        endDate: "2026-01-01",
        resources: [{ resourceName: "R1", units: "ACCESS Credits", allocation: 5000, resourceId: 1 }],
      },
      {
        projectId: 2,
        requestNumber: "R2",
        requestTitle: "P2",
        pi: "x",
        piInstitution: "y",
        fos: "Physics",
        abstract: "",
        allocationType: "Explore",
        beginDate: "2024-01-01",
        endDate: "2026-01-01",
        resources: [{ resourceName: "R2", units: "ACCESS Credits", allocation: 500, resourceId: 2 }],
      },
    ];
    stubCorpus(server, recs);

    const res = await callSearchProjects(server, { allocation_type: "Explore", min_allocation: 1000 });

    expect(res.metadata.filters_applied).toHaveProperty("min_allocation", 1000);
    // The branch's own filter must survive the merge.
    expect(res.metadata.filters_applied).toHaveProperty("allocation_type", "Explore");
    expect(res.items.map((p: { projectId: number }) => p.projectId)).toEqual([1]);
  });

  it("discloses applied filters on the query branch (object-keyed)", async () => {
    const server = new AllocationsServer();
    const recs: Project[] = [
      {
        projectId: 1,
        requestNumber: "R1",
        requestTitle: "Machine learning project",
        pi: "x",
        piInstitution: "y",
        fos: "Computer Science",
        abstract: "machine learning research",
        allocationType: "Explore",
        beginDate: "2024-01-01",
        endDate: "2026-01-01",
        resources: [{ resourceName: "R1", units: "ACCESS Credits", allocation: 5000, resourceId: 1 }],
      },
    ];
    stubCorpus(server, recs);

    const res = await callSearchProjects(server, {
      query: "machine learning",
      min_allocation: 1000,
    });

    expect(res.metadata.filters_applied).toHaveProperty("min_allocation", 1000);
  });

  it("sort_by orders a non-query branch (date_desc)", async () => {
    const server = new AllocationsServer();
    const recs: Project[] = [
      {
        projectId: 1,
        requestNumber: "R1",
        requestTitle: "Older",
        pi: "x",
        piInstitution: "y",
        fos: "Physics",
        abstract: "",
        allocationType: "Explore",
        beginDate: "2020-01-01",
        endDate: "2026-01-01",
        resources: [],
      },
      {
        projectId: 2,
        requestNumber: "R2",
        requestTitle: "Newer",
        pi: "x",
        piInstitution: "y",
        fos: "Physics",
        abstract: "",
        allocationType: "Explore",
        beginDate: "2024-01-01",
        endDate: "2026-01-01",
        resources: [],
      },
    ];
    stubCorpus(server, recs);

    const res = await callSearchProjects(server, { field_of_science: "Physics", sort_by: "date_desc" });

    expect(res.items.map((p: { projectId: number }) => p.projectId)).toEqual([2, 1]);
  });
});
