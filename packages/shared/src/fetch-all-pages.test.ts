import { describe, it, expect, vi } from "vitest";
import { fetchAllPages, type PageResult } from "./fetch-all-pages.js";

interface Rec {
  id: number;
  abstract?: string;
  publications?: string[];
}

/**
 * Build a fake paginated upstream: `pages` pages of `perPage` records with
 * sequential ids, reporting `reportedPages` on every page. Optional `onPage`
 * hook lets a test inject a failure or duplicate for a specific page.
 */
function fakeUpstream(opts: {
  pages: number;
  perPage?: number;
  reportedPages?: number;
  onPage?: (page: number) => PageResult<Rec> | Promise<PageResult<Rec>> | undefined;
}) {
  const { pages, perPage = 20, reportedPages = pages, onPage } = opts;
  return async (page: number): Promise<PageResult<Rec>> => {
    const injected = onPage?.(page);
    if (injected !== undefined) return injected;
    const startId = (page - 1) * perPage + 1;
    const items: Rec[] = [];
    // last page may be short
    const count = page === pages ? perPage : perPage;
    for (let i = 0; i < count; i++) items.push({ id: startId + i });
    return { items, totalPages: reportedPages };
  };
}

describe("fetchAllPages", () => {
  it("fetches every page and returns the complete deduped set", async () => {
    const fetchPage = fakeUpstream({ pages: 5, perPage: 20 });
    const r = await fetchAllPages<Rec>(fetchPage, (x) => x.id);
    expect(r.pages).toBe(5);
    expect(r.truncated).toBe(false);
    expect(r.records).toHaveLength(100);
    expect(r.records[0].id).toBe(1);
    expect(r.records[99].id).toBe(100);
  });

  it("fetches page 1 exactly once and each other page once", async () => {
    const base = fakeUpstream({ pages: 4 });
    const spy = vi.fn(base);
    await fetchAllPages<Rec>(spy, (x) => x.id);
    const pagesFetched = spy.mock.calls.map((c) => c[0]).sort((a, b) => a - b);
    expect(pagesFetched).toEqual([1, 2, 3, 4]);
  });

  it("throws (never NaN/0) when the upstream reports an invalid page count", async () => {
    const bad = async (): Promise<PageResult<Rec>> => ({
      items: [{ id: 1 }],
      totalPages: undefined as unknown as number,
    });
    await expect(fetchAllPages<Rec>(bad, (x) => x.id)).rejects.toThrow(/invalid page count/);
  });

  it("propagates a hard error from a malformed later page (after retries)", async () => {
    const fetchPage = fakeUpstream({
      pages: 3,
      onPage: (p) => {
        if (p === 2) throw new Error("HTTP 500");
        return undefined;
      },
    });
    await expect(
      fetchAllPages<Rec>(fetchPage, (x) => x.id, { retries: 1, backoffMs: 1 }),
    ).rejects.toThrow(/page 2 failed/);
  });

  it("detects the over-range fail-open: a later page that re-serves page 1", async () => {
    // Upstream reports 3 pages but page 3 returns page-1 content (id 1..20).
    const fetchPage = fakeUpstream({
      pages: 3,
      onPage: (p) => {
        if (p === 3) {
          const items: Rec[] = [];
          for (let i = 1; i <= 20; i++) items.push({ id: i }); // page-1 keys
          return { items, totalPages: 3 };
        }
        return undefined;
      },
    });
    await expect(fetchAllPages<Rec>(fetchPage, (x) => x.id)).rejects.toThrow(
      /duplicate page-1 content|over-range/,
    );
  });

  it("dedupes genuinely duplicated ids across pages without double-counting", async () => {
    // Pages overlap by one id (pagination drift), but NOT a page-1 re-serve.
    const fetchPage = async (page: number): Promise<PageResult<Rec>> => {
      if (page === 1) return { items: [{ id: 1 }, { id: 2 }], totalPages: 2 };
      // page 2 repeats id 2 (drift) plus a new id 3 — first key (2) != page-1 first key (1)
      return { items: [{ id: 2 }, { id: 3 }], totalPages: 2 };
    };
    const r = await fetchAllPages<Rec>(fetchPage, (x) => x.id);
    expect(r.records.map((x) => x.id)).toEqual([1, 2, 3]); // id 2 not doubled
  });

  it("sets truncated:true and stops at hardCap when the corpus exceeds it", async () => {
    const fetchPage = fakeUpstream({ pages: 50, reportedPages: 50 });
    const r = await fetchAllPages<Rec>(fetchPage, (x) => x.id, { hardCap: 5 });
    expect(r.truncated).toBe(true);
    expect(r.pages).toBe(50); // reports the real count
    expect(r.records).toHaveLength(100); // but only fetched 5 pages * 20
  });

  it("applies the projection at ingest (drops publications)", async () => {
    const fetchPage = async (): Promise<PageResult<Rec>> => ({
      items: [{ id: 1, abstract: "keep me", publications: ["heavy", "unused"] }],
      totalPages: 1,
    });
    const r = await fetchAllPages<Rec, { id: number; abstract?: string }>(
      fetchPage,
      (x) => x.id,
      {},
      ({ id, abstract }) => ({ id, abstract }),
    );
    expect(r.records[0]).toEqual({ id: 1, abstract: "keep me" });
    expect(r.records[0]).not.toHaveProperty("publications");
  });
});
