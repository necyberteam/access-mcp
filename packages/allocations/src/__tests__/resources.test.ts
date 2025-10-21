import { describe, it, expect, beforeEach } from "vitest";
import { AllocationsServer } from "../server.js";

describe("Allocations Server - Resources", () => {
  let server: AllocationsServer;

  beforeEach(() => {
    server = new AllocationsServer();
  });

  describe("getResources", () => {
    it("should list all available resources", () => {
      const resources = server["getResources"]();

      expect(resources).toHaveLength(4);
      expect(resources).toContainEqual(
        expect.objectContaining({
          uri: "accessci://allocations/field-taxonomy",
          name: "Field of Science Taxonomy",
        })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({
          uri: "accessci://allocations/allocation-types",
          name: "Allocation Types and Tiers",
        })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({
          uri: "accessci://allocations/search-guide",
          name: "Advanced Search Guide",
        })
      );
    });
  });

  describe("handleResourceRead - field-taxonomy", () => {
    it("should return JSON with fields of science", async () => {
      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://allocations/field-taxonomy" },
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe("application/json");

      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty("fields_of_science");
      expect(data).toHaveProperty("available_fields");
      expect(data).toHaveProperty("usage_notes");

      // Verify specific fields exist
      expect(data.fields_of_science).toHaveProperty("Computer Science");
      expect(data.fields_of_science).toHaveProperty("Biological Sciences");

      // Verify field structure
      const csField = data.fields_of_science["Computer Science"];
      expect(csField).toHaveProperty("keywords");
      expect(csField).toHaveProperty("typical_resources");
      expect(csField).toHaveProperty("common_software");
      expect(csField).toHaveProperty("allocation_range");

      // Verify allocation range has correct structure
      expect(csField.allocation_range).toHaveProperty("min");
      expect(csField.allocation_range).toHaveProperty("max");
      expect(csField.allocation_range).toHaveProperty("typical");
    });

    it("should include usage notes about ACCESS Credits", async () => {
      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://allocations/field-taxonomy" },
      });

      const data = JSON.parse(result.contents[0].text);
      expect(data.usage_notes.allocation_ranges).toContain("computational resource units");
      expect(data.usage_notes.allocation_ranges).toContain("not monetary");
    });
  });

  describe("handleResourceRead - allocation-types", () => {
    it("should return JSON with allocation tiers", async () => {
      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://allocations/allocation-types" },
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe("application/json");

      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty("allocation_types");
      expect(data).toHaveProperty("quick_guide");
      expect(data).toHaveProperty("choosing_a_tier");

      // Verify all tiers exist
      expect(data.allocation_types).toHaveProperty("Discover");
      expect(data.allocation_types).toHaveProperty("Explore");
      expect(data.allocation_types).toHaveProperty("Accelerate");
      expect(data.allocation_types).toHaveProperty("Maximize");

      // Verify tier structure
      const discover = data.allocation_types.Discover;
      expect(discover).toHaveProperty("name");
      expect(discover).toHaveProperty("description");
      expect(discover).toHaveProperty("credit_range");
      expect(discover).toHaveProperty("use_cases");
      expect(discover).toHaveProperty("eligibility");

      // Verify credit ranges
      expect(discover.credit_range.min).toBe(1000);
      expect(discover.credit_range.max).toBe(400000);
    });

    it("should include choosing a tier guide", async () => {
      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://allocations/allocation-types" },
      });

      const data = JSON.parse(result.contents[0].text);
      expect(data.choosing_a_tier).toHaveProperty("step_1");
      expect(data.choosing_a_tier).toHaveProperty("step_2");
      expect(data.choosing_a_tier).toHaveProperty("step_3");
      expect(data.choosing_a_tier).toHaveProperty("step_4");
    });
  });

  describe("handleResourceRead - search-guide", () => {
    it("should return Markdown search guide", async () => {
      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://allocations/search-guide" },
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe("text/markdown");

      const markdown = result.contents[0].text;
      expect(markdown).toContain("# Advanced Search Guide");
      expect(markdown).toContain("Boolean Operators");
      expect(markdown).toContain("AND Operator");
      expect(markdown).toContain("OR Operator");
      expect(markdown).toContain("NOT Operator");
    });

    it("should include examples for all operators", async () => {
      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://allocations/search-guide" },
      });

      const markdown = result.contents[0].text;

      // AND examples
      expect(markdown).toContain("machine learning AND gpu");

      // OR examples
      expect(markdown).toContain("genomics OR bioinformatics");

      // NOT examples
      expect(markdown).toContain("machine learning NOT tensorflow");

      // Exact phrases
      expect(markdown).toContain('"large language model"');
    });

    it("should include workflow examples", async () => {
      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://allocations/search-guide" },
      });

      const markdown = result.contents[0].text;
      expect(markdown).toContain("Example Workflows");
      expect(markdown).toContain("Find Similar GPU Projects");
      expect(markdown).toContain("Genomics Projects with High Memory");
      expect(markdown).toContain("Recent Climate Modeling Projects");
    });

    it("should include field of science list", async () => {
      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://allocations/search-guide" },
      });

      const markdown = result.contents[0].text;
      expect(markdown).toContain("Computer Science");
      expect(markdown).toContain("Biological Sciences");
      expect(markdown).toContain("Physics");
    });

    it("should explain sorting options", async () => {
      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://allocations/search-guide" },
      });

      const markdown = result.contents[0].text;
      expect(markdown).toContain("Sorting Results");
      expect(markdown).toContain("relevance");
      expect(markdown).toContain("date_desc");
      expect(markdown).toContain("allocation_desc");
    });
  });

  describe("Resource Error Handling", () => {
    it("should throw error for unknown resource", async () => {
      await expect(
        server["handleResourceRead"]({
          params: { uri: "accessci://allocations/nonexistent" },
        })
      ).rejects.toThrow("Unknown resource");
    });
  });
});
