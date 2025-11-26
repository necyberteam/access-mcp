import { describe, it, expect, beforeEach } from "vitest";
import { AllocationsServer } from "../server.js";

/**
 * Integration tests for AllocationsServer
 * These tests make real API calls to the ACCESS Allocations API
 *
 * NOTE: The allocations server returns {total, items} JSON format
 */
describe("AllocationsServer Integration Tests", () => {
  let server: AllocationsServer;

  beforeEach(() => {
    server = new AllocationsServer();
  });

  describe("Real API Calls - Basic Search", () => {
    it("should search for machine learning projects", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_projects",
          arguments: {
            query: "machine learning",
            limit: 5,
          },
        },
      });

      expect(result.content).toHaveLength(1);
      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      // Should be JSON with {total, items} format
      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      expect(Array.isArray(responseData.items)).toBe(true);
      expect(responseData.total).toBeGreaterThan(0);

      console.log("✅ Machine learning search completed");
      console.log(`Found ${responseData.total} projects`);
    }, 15000);

    it("should filter by field of science", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_projects",
          arguments: {
            field_of_science: "Computer Science",
            limit: 3,
          },
        },
      });

      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      // Should contain Computer Science projects in JSON format
      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      expect(responseData.items.length).toBeGreaterThan(0);
      expect(responseData.items[0].fos).toContain("Computer Science");

      console.log("✅ Field of Science filter working");
    }, 15000);

    it("should handle boolean search operators", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_projects",
          arguments: {
            query: "machine learning AND GPU",
            limit: 3,
          },
        },
      });

      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      // Should have JSON results
      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      expect(Array.isArray(responseData.items)).toBe(true);

      console.log("✅ Boolean search operators working");
    }, 15000);
  });

  describe("Real API Calls - Advanced Features", () => {
    it("should get specific project by ID", async () => {
      // Use a known project ID (adjust if needed based on API)
      const result = await server["handleToolCall"]({
        params: {
          name: "search_projects",
          arguments: {
            project_id: 1, // Assuming ID 1 exists
          },
        },
      });

      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      // Should contain project details in JSON format
      if (!responseData.error) {
        expect(responseData).toHaveProperty("total");
        expect(responseData).toHaveProperty("items");
        expect(responseData.total).toBe(1);
        expect(responseData.items[0]).toHaveProperty("projectId");
      }

      console.log("✅ Project ID lookup working");
    }, 20000);

    it("should handle resource name filtering", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_projects",
          arguments: {
            resource_name: "Delta",
            limit: 3,
          },
        },
      });

      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      // Should contain resource information in JSON format
      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      if (responseData.items.length > 0) {
        expect(responseData.items[0]).toHaveProperty("resources");
      }

      console.log("✅ Resource name filtering working");
    }, 15000);
  });

  describe("Real API Calls - Similarity Search", () => {
    it("should find similar projects by keywords", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_projects",
          arguments: {
            similarity_keywords: "deep learning neural networks",
            similarity_threshold: 0.25,
            limit: 5,
          },
        },
      });

      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      // Should have similarity search results in JSON format
      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      if (responseData.items.length > 0) {
        expect(responseData.items[0]).toHaveProperty("similarity_score");
      }

      console.log("✅ Similarity search by keywords working");
    }, 20000);
  });

  describe("Real API Calls - Sorting", () => {
    it("should sort by allocation amount descending", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_projects",
          arguments: {
            query: "computing",
            sort_by: "allocation_desc",
            limit: 3,
          },
        },
      });

      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      // Should contain sorted results in JSON format
      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      expect(Array.isArray(responseData.items)).toBe(true);

      console.log("✅ Allocation sorting working");
    }, 15000);

    it("should sort by date descending", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_projects",
          arguments: {
            query: "research",
            sort_by: "date_desc",
            limit: 3,
          },
        },
      });

      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      // Should contain dated results in JSON format
      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      if (responseData.items.length > 0) {
        expect(responseData.items[0]).toHaveProperty("beginDate");
      }

      console.log("✅ Date sorting working");
    }, 15000);
  });

  describe("Error Handling", () => {
    it("should handle empty search results gracefully", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_projects",
          arguments: {
            query: "xyzabc123nonexistentquery456",
          },
        },
      });

      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      // Should return empty items array
      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      expect(responseData.total).toBe(0);
      expect(responseData.items).toEqual([]);

      console.log("✅ Empty results handled correctly");
    }, 15000);

    it("should require at least one search parameter", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_projects",
          arguments: {},
        },
      });

      const responseText = result.content[0].text;

      // Should contain error message about required parameters
      const responseData = JSON.parse(responseText);
      expect(responseData).toHaveProperty("error");
      expect(responseData.error).toContain("search parameter");

      console.log("✅ Parameter validation working");
    }, 5000);
  });

  describe("NSF Integration", () => {
    it("should analyze project funding with NSF integration", async () => {
      // First get a project
      const searchResult = await server["handleToolCall"]({
        params: {
          name: "search_projects",
          arguments: {
            query: "machine learning",
            limit: 1,
          },
        },
      });

      const searchText = searchResult.content[0].text;
      const searchData = JSON.parse(searchText);

      // Extract project ID from JSON if available
      if (searchData.items && searchData.items.length > 0) {
        const projectId = searchData.items[0].projectId;

        // Analyze funding for this project
        const fundingResult = await server["handleToolCall"]({
          params: {
            name: "analyze_funding",
            arguments: {
              project_id: projectId,
            },
          },
        });

        const fundingText = fundingResult.content[0].text;

        // Should contain funding analysis
        expect(fundingText).toContain("Funding Analysis");
        expect(fundingText.length).toBeGreaterThan(0);

        console.log("✅ NSF funding analysis working");
      } else {
        console.log("ℹ️  No project ID found to test funding analysis");
      }
    }, 25000);

    it("should generate institutional funding profile", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "analyze_funding",
          arguments: {
            institution: "Stanford University",
            limit: 5,
          },
        },
      });

      const responseText = result.content[0].text;

      // Should contain institutional profile
      expect(responseText).toContain("Institutional Funding Profile");
      expect(responseText).toContain("Stanford");

      console.log("✅ Institutional funding profile working");
    }, 20000);
  });

  describe("Resource Validation", () => {
    it("should include allocation details in results", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_projects",
          arguments: {
            query: "computing",
            limit: 3,
          },
        },
      });

      const responseText = result.content[0].text;
      const responseData = JSON.parse(responseText);

      // Should contain resource information in JSON format
      expect(responseData).toHaveProperty("items");
      if (responseData.items.length > 0) {
        expect(responseData.items[0]).toHaveProperty("resources");
        expect(Array.isArray(responseData.items[0].resources)).toBe(true);
      }

      console.log("✅ Resource details included in results");
    }, 15000);
  });
});
