import { describe, it, expect, beforeEach } from "vitest";
import { ComputeResourcesServer } from "../server.js";

describe("Compute Resources - Resources", () => {
  let server: ComputeResourcesServer;

  beforeEach(() => {
    server = new ComputeResourcesServer();
  });

  describe("getResources", () => {
    it("should list all available resources", () => {
      const resources = server["getResources"]();

      expect(resources).toHaveLength(4);
      expect(resources).toContainEqual(
        expect.objectContaining({
          uri: "accessci://compute-resources",
          name: "ACCESS-CI Compute Resources",
        })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({
          uri: "accessci://compute-resources/capabilities-matrix",
          name: "Compute Resource Capabilities Matrix",
        })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({
          uri: "accessci://compute-resources/gpu-guide",
          name: "GPU Resource Selection Guide",
        })
      );
      expect(resources).toContainEqual(
        expect.objectContaining({
          uri: "accessci://compute-resources/resource-types",
          name: "Resource Type Taxonomy",
        })
      );
    });
  });

  describe("handleResourceRead - capabilities-matrix", () => {
    it("should return JSON with resource types and comparison matrix", async () => {
      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://compute-resources/capabilities-matrix" },
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe("application/json");

      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty("resource_types");
      expect(data).toHaveProperty("comparison_matrix");
      expect(data).toHaveProperty("selection_guide");

      // Verify specific content
      expect(data.comparison_matrix).toHaveProperty("Machine Learning / AI");
      expect(data.comparison_matrix["Machine Learning / AI"].primary).toBe("GPU");
      expect(data.resource_types).toHaveProperty("GPU");
      expect(data.resource_types.GPU).toHaveProperty("typical_use_cases");
    });
  });

  describe("handleResourceRead - gpu-guide", () => {
    it("should return Markdown GPU selection guide", async () => {
      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://compute-resources/gpu-guide" },
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe("text/markdown");

      const markdown = result.contents[0].text;
      expect(markdown).toContain("# GPU Resource Selection Guide");
      expect(markdown).toContain("NVIDIA A100");
      expect(markdown).toContain("NVIDIA V100");
      expect(markdown).toContain("For Training Large Language Models");
      expect(markdown).toContain("Delta");
      expect(markdown).toContain("Bridges-2");
    });
  });

  describe("handleResourceRead - resource-types", () => {
    it("should return JSON with resource type taxonomy", async () => {
      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://compute-resources/resource-types" },
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe("application/json");

      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty("resource_types");
      expect(data).toHaveProperty("usage_notes");
      expect(data.resource_types).toHaveProperty("CPU");
      expect(data.resource_types).toHaveProperty("GPU");
      expect(data.usage_notes.GPU).toContain("parallel");
    });
  });

  describe("handleResourceRead - unknown resource", () => {
    it("should throw error for unknown resource URI", async () => {
      await expect(
        server["handleResourceRead"]({
          params: { uri: "accessci://compute-resources/nonexistent" },
        })
      ).rejects.toThrow("Unknown resource");
    });
  });
});
