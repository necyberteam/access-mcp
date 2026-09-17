import { describe, it, expect } from "vitest";
import { MAX_LIMIT, buildPagination } from "../pagination.js";

describe("buildPagination", () => {
  it("MAX_LIMIT is 500", () => {
    expect(MAX_LIMIT).toBe(500);
  });

  it("honors an in-range limit and computes has_more from total", () => {
    const p = buildPagination({ requestedLimit: 100, offset: 0, total: 7147, defaultLimit: 100 });
    expect(p).toEqual({ limit: 100, offset: 0, total: 7147, has_more: true });
  });

  it("advancing offset reports the correct has_more near the end", () => {
    const p = buildPagination({ requestedLimit: 100, offset: 7100, total: 7147, defaultLimit: 100 });
    // 7100 + 47 returned... but returned_count is derived by caller; here total-offset < limit
    expect(p.has_more).toBe(false); // 7100 + min(100, 47) = 7147, not < 7147
    expect(p.offset).toBe(7100);
  });

  it("clamps above MAX_LIMIT and flags capped", () => {
    const p = buildPagination({ requestedLimit: 5000, offset: 0, total: 7147, defaultLimit: 100 });
    expect(p.limit).toBe(500);
    expect(p.capped).toBe(true);
    expect(p.has_more).toBe(true);
  });

  it("uses defaultLimit when requestedLimit is undefined and omits capped", () => {
    const p = buildPagination({ requestedLimit: undefined, offset: 0, total: 40, defaultLimit: 100 });
    expect(p.limit).toBe(100);
    expect(p.has_more).toBe(false); // 40 < 100
    expect("capped" in p).toBe(false);
  });
});
