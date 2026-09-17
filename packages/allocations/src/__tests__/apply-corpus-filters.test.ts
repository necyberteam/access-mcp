import { describe, it, expect } from "vitest";
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

type Filters = {
  dateRange?: { start_date?: string; end_date?: string };
  minAllocation?: number;
};

function applyCorpusFilters(
  server: AllocationsServer,
  records: Project[],
  filters: Filters
): { filtered: Project[]; applied: Record<string, unknown> } {
  return (
    server as unknown as {
      applyCorpusFilters: (
        records: Project[],
        filters: Filters
      ) => { filtered: Project[]; applied: Record<string, unknown> };
    }
  ).applyCorpusFilters(records, filters);
}

// Minimal Project fixtures — only the fields applyCorpusFilters reads
// (beginDate/endDate, resources for accessCreditsAmount) are populated with
// real values; the rest are placeholder strings/arrays to satisfy the shape.
function makeProject(overrides: Partial<Project>): Project {
  return {
    projectId: 0,
    requestNumber: "R",
    requestTitle: "Title",
    pi: "PI",
    piInstitution: "Institution",
    fos: "Physics",
    abstract: "",
    allocationType: "Explore",
    beginDate: "2024-01-01",
    endDate: "2024-06-01",
    resources: [],
    ...overrides,
  };
}

describe("applyCorpusFilters", () => {
  it("filters by date-range overlap and reports the applied filter", () => {
    const server = new AllocationsServer();
    const recs = [
      makeProject({ projectId: 1, beginDate: "2024-01-01", endDate: "2024-06-01" }),
      makeProject({ projectId: 2, beginDate: "2025-01-01", endDate: "2025-06-01" }),
    ];

    const out = applyCorpusFilters(server, recs, {
      dateRange: { start_date: "2024-12-01" },
    });

    // project 1 ends before 2024-12-01 -> excluded; project 2 overlaps -> included
    expect(out.filtered.map((p) => p.projectId)).toEqual([2]);
    expect(out.applied).toHaveProperty("date_range");
  });

  it("filters by min_allocation using accessCreditsAmount and reports the applied filter", () => {
    const server = new AllocationsServer();
    const recs = [
      makeProject({
        projectId: 1,
        resources: [{ resourceName: "R1", units: "ACCESS Credits", allocation: 500, resourceId: 1 }],
      }),
      makeProject({
        projectId: 2,
        resources: [{ resourceName: "R2", units: "ACCESS Credits", allocation: 2000, resourceId: 2 }],
      }),
    ];

    const out = applyCorpusFilters(server, recs, { minAllocation: 1000 });

    expect(out.filtered.map((p) => p.projectId)).toEqual([2]);
    expect(out.applied).toHaveProperty("min_allocation", 1000);
  });

  it("treats min_allocation: 0 as unset (falsy gate preserved)", () => {
    const server = new AllocationsServer();
    const recs = [
      makeProject({ projectId: 1, resources: [] }),
      makeProject({ projectId: 2, resources: [] }),
    ];

    const out = applyCorpusFilters(server, recs, { minAllocation: 0 });

    expect(out.filtered.map((p) => p.projectId)).toEqual([1, 2]);
    expect(out.applied).not.toHaveProperty("min_allocation");
  });

  it("with no filters, returns all records and an empty applied object", () => {
    const server = new AllocationsServer();
    const recs = [makeProject({ projectId: 1 }), makeProject({ projectId: 2 })];

    const out = applyCorpusFilters(server, recs, {});

    expect(out.filtered.map((p) => p.projectId)).toEqual([1, 2]);
    expect(out.applied).toEqual({});
  });

  it("combines date_range and min_allocation, both reported in applied", () => {
    const server = new AllocationsServer();
    const recs = [
      makeProject({
        projectId: 1,
        beginDate: "2024-01-01",
        endDate: "2024-06-01",
        resources: [{ resourceName: "R1", units: "ACCESS Credits", allocation: 5000, resourceId: 1 }],
      }),
      makeProject({
        projectId: 2,
        beginDate: "2025-01-01",
        endDate: "2025-06-01",
        resources: [{ resourceName: "R2", units: "ACCESS Credits", allocation: 5000, resourceId: 2 }],
      }),
    ];

    const out = applyCorpusFilters(server, recs, {
      dateRange: { start_date: "2024-12-01" },
      minAllocation: 1000,
    });

    expect(out.filtered.map((p) => p.projectId)).toEqual([2]);
    expect(out.applied).toHaveProperty("date_range");
    expect(out.applied).toHaveProperty("min_allocation", 1000);
  });
});
