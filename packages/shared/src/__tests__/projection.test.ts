import { describe, test, expect } from "vitest";
import { projectFields } from "../projection.js";

// Representative envelope sample, modeled on the shape Pillar 1 produced.
const sample = {
  total: 3,
  items: [
    {
      id: "anvil.purdue.access-ci.org",
      name: "Anvil",
      url: "https://anvil.example",
      description: "A compute resource",
      tags: ["cpu", "gpu"],
    },
    {
      id: "delta.ncsa.access-ci.org",
      name: "Delta",
      url: "https://delta.example",
      description: "Another compute resource",
      tags: ["gpu"],
    },
    {
      id: "bridges2.psc.access-ci.org",
      name: "Bridges-2",
      url: "https://bridges2.example",
      description: "Yet another",
      tags: ["cpu"],
    },
  ],
  metadata: {
    pagination: { limit: 25, offset: 0, has_more: false },
    aggregations: {
      counts: { operational: 2, affected: 1 },
      popular_tags: ["cpu", "gpu"],
    },
    filters_applied: { query: "compute" },
  },
  documentation: {
    related_tools: ["get_resource_details"],
    links: { see_all_url: "https://example.test/all" },
  },
} as const;

describe("projectFields", () => {
  describe("guard rails", () => {
    test("returns response unchanged when fields is undefined", () => {
      const out = projectFields(sample as any, undefined);
      expect(out).toBe(sample);
    });

    test("returns response unchanged when fields is null", () => {
      const out = projectFields(sample as any, null);
      expect(out).toBe(sample);
    });

    test("does not mutate input when projecting", () => {
      const before = JSON.stringify(sample);
      projectFields(sample as any, ["items[].name"]);
      expect(JSON.stringify(sample)).toBe(before);
    });
  });

  describe("always-preserve total", () => {
    test("includes total even when fields omits it", () => {
      const out = projectFields(sample as any, ["items[].name"]);
      expect(out.total).toBe(3);
    });

    test("empty fields array returns only total", () => {
      const out = projectFields(sample as any, []);
      expect(out).toEqual({ total: 3 });
    });

    test("does not invent total when response has no total", () => {
      const out = projectFields({ items: [{ a: 1 }] } as any, ["items[].a"]);
      expect(out).toEqual({ items: [{ a: 1 }] });
      expect(out).not.toHaveProperty("total");
    });
  });

  describe("path syntax", () => {
    test("projects items[].field to per-element subset", () => {
      const out = projectFields(sample as any, ["items[].name", "items[].url"]);
      expect(out).toEqual({
        total: 3,
        items: [
          { name: "Anvil", url: "https://anvil.example" },
          { name: "Delta", url: "https://delta.example" },
          { name: "Bridges-2", url: "https://bridges2.example" },
        ],
      });
    });

    test("bare 'items' includes the array as-is", () => {
      const out = projectFields(sample as any, ["items"]);
      expect(out.items).toEqual(sample.items);
      expect(out.total).toBe(3);
    });

    test("'items[]' alone is equivalent to bare 'items'", () => {
      const a = projectFields(sample as any, ["items"]);
      const b = projectFields(sample as any, ["items[]"]);
      expect(b).toEqual(a);
    });

    test("nested object projection — metadata.pagination.has_more", () => {
      const out = projectFields(sample as any, [
        "metadata.pagination.has_more",
      ]);
      expect(out).toEqual({
        total: 3,
        metadata: { pagination: { has_more: false } },
      });
    });

    test("includes whole subtree when path ends at an interior node", () => {
      const out = projectFields(sample as any, ["metadata.aggregations"]);
      expect(out).toEqual({
        total: 3,
        metadata: { aggregations: sample.metadata.aggregations },
      });
    });

    test("nested arrays — items[].tags returns each element's tags array", () => {
      const out = projectFields(sample as any, ["items[].tags"]);
      expect(out).toEqual({
        total: 3,
        items: [
          { tags: ["cpu", "gpu"] },
          { tags: ["gpu"] },
          { tags: ["cpu"] },
        ],
      });
    });

    test("union of paths combines under shared prefix", () => {
      const out = projectFields(sample as any, [
        "items[].name",
        "items[].id",
        "metadata.pagination",
        "documentation.links.see_all_url",
      ]);
      expect(out).toEqual({
        total: 3,
        items: [
          { id: "anvil.purdue.access-ci.org", name: "Anvil" },
          { id: "delta.ncsa.access-ci.org", name: "Delta" },
          { id: "bridges2.psc.access-ci.org", name: "Bridges-2" },
        ],
        metadata: { pagination: { limit: 25, offset: 0, has_more: false } },
        documentation: { links: { see_all_url: "https://example.test/all" } },
      });
    });

    test("terminal path wins over child path under same prefix", () => {
      // Asking for both "metadata" (whole) and "metadata.pagination.has_more"
      // (narrow) should include the whole metadata subtree — the broader path
      // is more permissive.
      const out = projectFields(sample as any, [
        "metadata",
        "metadata.pagination.has_more",
      ]);
      expect(out).toEqual({ total: 3, metadata: sample.metadata });
    });
  });

  describe("missing-field handling", () => {
    test("silently omits keys that do not exist on the response", () => {
      const out = projectFields(sample as any, [
        "items[].name",
        "items[].fancy_color",
      ]);
      expect(out).toEqual({
        total: 3,
        items: [
          { name: "Anvil" },
          { name: "Delta" },
          { name: "Bridges-2" },
        ],
      });
    });

    test("missing top-level branch silently omitted", () => {
      const out = projectFields(sample as any, [
        "items[].name",
        "experimental.thing",
      ]);
      expect(out).toEqual({
        total: 3,
        items: [
          { name: "Anvil" },
          { name: "Delta" },
          { name: "Bridges-2" },
        ],
      });
      expect(out).not.toHaveProperty("experimental");
    });

    test("all-missing paths still yield total-only", () => {
      const out = projectFields(sample as any, ["nope", "nada.zilch"]);
      expect(out).toEqual({ total: 3 });
    });
  });

  describe("structural edge cases", () => {
    test("non-items envelope projects correctly (lookup-by-id shape)", () => {
      const lookup = {
        total: 1,
        items: [{ id: 42, name: "found", description: "long text…" }],
      };
      const out = projectFields(lookup as any, ["items[].name"]);
      expect(out).toEqual({ total: 1, items: [{ name: "found" }] });
    });

    test("empty items array projects to empty array (not dropped)", () => {
      const empty = { total: 0, items: [] };
      const out = projectFields(empty as any, ["items[].name"]);
      expect(out).toEqual({ total: 0, items: [] });
    });

    test("projection without an items path drops items entirely", () => {
      const out = projectFields(sample as any, [
        "metadata.pagination.has_more",
      ]);
      expect(out).not.toHaveProperty("items");
    });

    test("response with only total returns identity after projection", () => {
      const out = projectFields({ total: 5 } as any, []);
      expect(out).toEqual({ total: 5 });
    });

    test("path with whitespace trimmed", () => {
      const out = projectFields(sample as any, [" items[].name "]);
      expect(out).toEqual({
        total: 3,
        items: [{ name: "Anvil" }, { name: "Delta" }, { name: "Bridges-2" }],
      });
    });
  });
});
