import { describe, it, expect } from "vitest";
import { resolveInstitution, normalizeForMatch, type AliasTable } from "./institution-resolver.js";
import { orgsSample } from "./__fixtures__/orgs-sample.js";

const VOCAB = orgsSample;

// A small acronym table (subset of the real one), targets are full names that
// resolve against the vocab after normalization.
const ALIASES: AliasTable = {
  MIT: "Massachusetts Institute of Technology",
  Caltech: "California Institute of Technology",
  CMU: "Carnegie Mellon University",
  "Georgia Tech": "Georgia Institute of Technology",
  TAMU: "Texas A&M University",
  "UC Berkeley": "University of California, Berkeley", // not in the sample fixture; tests the miss path
};

describe("normalizeForMatch", () => {
  it("drops punctuation and lowercases but preserves word order", () => {
    expect(normalizeForMatch("University of California, Berkeley")).toBe(
      "university of california berkeley",
    );
    expect(normalizeForMatch("Texas A&M University")).toBe("texas a and m university");
    expect(normalizeForMatch("Texas A&M University–Texarkana")).toBe(
      "texas a and m university texarkana",
    );
  });
});

describe("resolveInstitution — collisions stay distinct", () => {
  it("does NOT resolve 'Washington University' to University of Washington", () => {
    // The fixture has George/Eastern Washington University but no "University of
    // Washington" — the point is the needle must never bridge to a U-of-X form.
    const r = resolveInstitution("Washington University", VOCAB, ALIASES);
    // Whatever it returns, it must never be a "University of ... Washington" entry.
    const all = [r.resolved, ...r.candidates].filter(Boolean) as string[];
    expect(all.every((c) => !/^university of .*washington/i.test(c))).toBe(true);
  });

  it("keeps George Washington and Eastern Washington as separate candidates", () => {
    const r = resolveInstitution("Washington University", VOCAB, ALIASES);
    const all = [r.resolved, ...r.candidates].filter(Boolean) as string[];
    // Both distinct 'X Washington University' entries are reachable, not merged.
    expect(all).toContain("George Washington University");
    expect(all).toContain("Eastern Washington University");
  });

  it("resolves 'Miami University' exactly and not to any 'University of Miami'", () => {
    const r = resolveInstitution("Miami University", VOCAB, ALIASES);
    expect(r.resolved).toBe("Miami University");
  });
});

describe("resolveInstitution — exact and punctuation-variant hits", () => {
  it("resolves an exact vocab string", () => {
    const r = resolveInstitution("Stanford University", VOCAB, ALIASES);
    expect(r.resolved).toBe("Stanford University");
  });

  it("resolves a punctuation variant (comma) via symmetric normalization", () => {
    // Fixture has 'Southern Illinois University, Carbondale'
    const r = resolveInstitution("Southern Illinois University Carbondale", VOCAB, ALIASES);
    expect(r.resolved).toBe("Southern Illinois University, Carbondale");
  });
});

describe("resolveInstitution — acronyms via the alias table", () => {
  it("resolves MIT -> Massachusetts Institute of Technology", () => {
    const r = resolveInstitution("MIT", VOCAB, ALIASES);
    expect(r.resolved).toBe("Massachusetts Institute of Technology");
  });

  it("resolves Caltech -> California Institute of Technology (not a substring of other 'California' orgs)", () => {
    const r = resolveInstitution("Caltech", VOCAB, ALIASES);
    expect(r.resolved).toBe("California Institute of Technology");
  });

  it("resolves 'Georgia Tech' -> Georgia Institute of Technology", () => {
    const r = resolveInstitution("Georgia Tech", VOCAB, ALIASES);
    expect(r.resolved).toBe("Georgia Institute of Technology");
  });

  it("resolves TAMU -> Texas A&M University exactly, not a sibling campus", () => {
    const r = resolveInstitution("TAMU", VOCAB, ALIASES);
    expect(r.resolved).toBe("Texas A&M University");
  });

  it("a raw acronym with no alias and no vocab hit resolves to nothing", () => {
    const r = resolveInstitution("ZZZQ", VOCAB, ALIASES);
    expect(r.resolved).toBeUndefined();
    expect(r.candidates).toEqual([]);
  });
});

describe("resolveInstitution — ambiguous partials return candidates, not a guess", () => {
  it("'Texas A&M' returns the family of campuses without picking one", () => {
    const r = resolveInstitution("Texas A&M", VOCAB, ALIASES);
    expect(r.resolved).toBeUndefined();
    expect(r.candidates.length).toBeGreaterThan(1);
    expect(r.candidates).toContain("Texas A&M University");
    expect(r.candidates).toContain("Texas A&M International University");
  });

  it("'California State University' returns many CSU campuses as candidates", () => {
    const r = resolveInstitution("California State University", VOCAB, ALIASES);
    expect(r.resolved).toBeUndefined();
    expect(r.candidates.length).toBeGreaterThan(2);
    expect(r.candidates.every((c) => /california/i.test(c))).toBe(true);
  });

  it("caps the candidate list", () => {
    const r = resolveInstitution("University", VOCAB, ALIASES, 5);
    expect(r.candidates.length).toBeLessThanOrEqual(5);
  });

  it("prefers an exact hit even when weaker substrings also match", () => {
    // 'Purdue University' is exact; 'Purdue University in Indianapolis' also contains it.
    const r = resolveInstitution("Purdue University", VOCAB, ALIASES);
    expect(r.resolved).toBe("Purdue University");
  });
});

describe("resolveInstitution — a lone WEAK substring hit does not auto-resolve", () => {
  it("does not resolve a short mid-name fragment to the only org that contains it", () => {
    // "A&M" (normalizes to "a and m") is a mid-name fragment. It must not silently
    // resolve to one Texas A&M campus; it is not a confident institution match.
    const r = resolveInstitution("A&M", VOCAB, ALIASES);
    expect(r.resolved).toBeUndefined();
  });

  it("returns a lone weak (mid-name) hit as a candidate, not resolved", () => {
    // "Mellon" appears mid-name in exactly one fixture org (rank 1). A lone weak
    // hit is offered as a candidate to confirm, never auto-resolved.
    const r = resolveInstitution("Mellon", VOCAB, ALIASES);
    expect(r.resolved).toBeUndefined();
    expect(r.candidates).toContain("Carnegie Mellon University");
  });

  it("still auto-resolves a lone STRONG hit (whole-token prefix/suffix)", () => {
    // "Carnegie Mellon" is a whole-token prefix of exactly one org (rank 2): resolves.
    const r = resolveInstitution("Carnegie Mellon", VOCAB, ALIASES);
    expect(r.resolved).toBe("Carnegie Mellon University");
  });

  it("auto-resolves a lone suffix-token hit (rank 2)", () => {
    // "Carbondale" is a trailing whole token of exactly one org (rank 2): resolves.
    const r = resolveInstitution("Carbondale", VOCAB, ALIASES);
    expect(r.resolved).toBe("Southern Illinois University, Carbondale");
  });
});
