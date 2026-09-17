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

  describe("adversarial offset input", () => {
    it("coerces a negative offset to 0 rather than slicing from the end", () => {
      const p = buildPagination({ requestedLimit: 10, offset: -3, total: 25, defaultLimit: 20 });
      expect(p.offset).toBe(0);
    });

    it("coerces NaN offset to 0", () => {
      const p = buildPagination({ requestedLimit: 10, offset: NaN, total: 25, defaultLimit: 20 });
      expect(p.offset).toBe(0);
    });

    it("coerces Infinity offset to 0", () => {
      const p = buildPagination({ requestedLimit: 10, offset: Infinity, total: 25, defaultLimit: 20 });
      expect(p.offset).toBe(0);
    });

    it("truncates a non-integer offset", () => {
      const p = buildPagination({ requestedLimit: 10, offset: 2.9, total: 25, defaultLimit: 20 });
      expect(p.offset).toBe(2);
    });
  });

  describe("adversarial limit input", () => {
    it("throws for limit: 0", () => {
      expect(() =>
        buildPagination({ requestedLimit: 0, offset: 0, total: 25, defaultLimit: 20 })
      ).toThrow(/limit must be at least 1/i);
    });

    it("throws for a negative limit", () => {
      expect(() =>
        buildPagination({ requestedLimit: -5, offset: 0, total: 25, defaultLimit: 20 })
      ).toThrow(/limit must be at least 1/i);
    });

    it("throws for NaN limit", () => {
      expect(() =>
        buildPagination({ requestedLimit: NaN, offset: 0, total: 25, defaultLimit: 20 })
      ).toThrow(/limit must be at least 1/i);
    });

    it("truncates a fractional limit instead of echoing it back", () => {
      const p = buildPagination({ requestedLimit: 5.5, offset: 0, total: 25, defaultLimit: 20 });
      expect(p.limit).toBe(5);
    });
  });
});
