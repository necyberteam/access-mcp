import { describe, it, expect, vi } from "vitest";
import { resolveGlobalResourceId, normalizeGlobalResourceId } from "./resource-resolver.js";

const mkSearch = (items: Array<{ name: string; info_resourceid: string }>) =>
  async (_q: string) => items;

describe("resolveGlobalResourceId", () => {
  it("passes through a dotted global resource id without consulting search", async () => {
    const search = mkSearch([{ name: "Delta", info_resourceid: "somethingelse.access-ci.org" }]);
    const r = await resolveGlobalResourceId("delta.ncsa.access-ci.org", { search });
    expect(r).toEqual({ ok: true, resourceId: "delta.ncsa.access-ci.org" });
  });

  it("resolves an exact name to its info_resourceid", async () => {
    const search = mkSearch([{ name: "Delta", info_resourceid: "delta.ncsa.access-ci.org" }]);
    const r = await resolveGlobalResourceId("Delta", { search });
    expect(r).toEqual({ ok: true, resourceId: "delta.ncsa.access-ci.org" });
  });

  it("is case-insensitive on the name match", async () => {
    const search = mkSearch([{ name: "Delta", info_resourceid: "delta.ncsa.access-ci.org" }]);
    const r = await resolveGlobalResourceId("delta", { search });
    expect(r).toEqual({ ok: true, resourceId: "delta.ncsa.access-ci.org" });
  });

  it("fails clearly when a name matches nothing", async () => {
    const r = await resolveGlobalResourceId("Nonesuch", { search: mkSearch([]) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/no.*match|not found/i);
  });

  it("fails with the candidate names when a name is ambiguous (multiple matches)", async () => {
    const search = mkSearch([
      { name: "Delta", info_resourceid: "delta.ncsa.access-ci.org" },
      { name: "Delta AI", info_resourceid: "deltaai.ncsa.access-ci.org" },
    ]);
    const r = await resolveGlobalResourceId("Delta system", { search });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/delta/i);
  });

  it("does not accept a match whose info_resourceid is empty", async () => {
    const search = mkSearch([{ name: "Delta", info_resourceid: "" }]);
    const r = await resolveGlobalResourceId("Delta", { search });
    expect(r.ok).toBe(false);
  });

  it("normalizes a legacy dotted input on passthrough (resolveGlobalResourceId)", async () => {
    const r = await resolveGlobalResourceId("delta-gpu.ncsa.xsede.org", { search: mkSearch([]) });
    expect(r).toEqual({ ok: true, resourceId: "delta.ncsa.access-ci.org" });
  });
});

describe("normalizeGlobalResourceId", () => {
  it("converts legacy xsede.org to access-ci.org", () => {
    expect(normalizeGlobalResourceId("bridges2.psc.xsede.org")).toBe("bridges2.psc.access-ci.org");
  });
  it("converts .illinois.edu and bare .edu to access-ci.org", () => {
    expect(normalizeGlobalResourceId("delta.ncsa.illinois.edu")).toBe("delta.ncsa.access-ci.org");
    expect(normalizeGlobalResourceId("foo.bar.edu")).toBe("foo.bar.access-ci.org");
  });
  it("strips resource-type suffixes (-gpu/-cpu/-storage/-compute)", () => {
    expect(normalizeGlobalResourceId("delta-gpu.ncsa.access-ci.org")).toBe("delta.ncsa.access-ci.org");
    expect(normalizeGlobalResourceId("delta-storage.ncsa.access-ci.org")).toBe("delta.ncsa.access-ci.org");
  });
  it("strips connective suffixes (-login/-data/-transfer)", () => {
    expect(normalizeGlobalResourceId("anvil-login.purdue.access-ci.org")).toBe("anvil.purdue.access-ci.org");
  });
  it("passes an already-canonical id through unchanged", () => {
    expect(normalizeGlobalResourceId("delta.ncsa.access-ci.org")).toBe("delta.ncsa.access-ci.org");
  });
});
