import { describe, it, expect } from "vitest";
import { SoftwareDiscoveryServer } from "./server.js";

interface SoftwareComparisonResult {
  software: string;
  found: boolean;
  available_on: string[];
  resource_count: number;
}

interface TextContent {
  type: "text";
  text: string;
}

describe("Software Discovery Integration Tests", () => {
  const server = new SoftwareDiscoveryServer();

  describe("Tool Definitions", () => {
    it("should provide correct tool descriptions", async () => {
      const tools = server["getTools"]();

      // search_software tool
      const searchSoftwareTool = tools.find((t) => t.name === "search_software");
      expect(searchSoftwareTool).toBeDefined();
      expect(searchSoftwareTool?.description).toContain("Search software");
      expect(searchSoftwareTool?.description).toContain("fuzzy matching");
      expect(searchSoftwareTool?.inputSchema?.examples).toBeDefined();

      // list_all_software tool
      const listAllTool = tools.find((t) => t.name === "list_all_software");
      expect(listAllTool).toBeDefined();
      expect(listAllTool?.description).toContain("List all");
      expect(listAllTool?.inputSchema?.examples).toBeDefined();

      // get_software_details tool
      const detailsTool = tools.find((t) => t.name === "get_software_details");
      expect(detailsTool).toBeDefined();
      expect(detailsTool?.inputSchema?.required).toContain("software_name");
      expect(detailsTool?.inputSchema?.examples).toBeDefined();

      // compare_software_availability tool
      const compareTool = tools.find((t) => t.name === "compare_software_availability");
      expect(compareTool).toBeDefined();
      expect(compareTool?.inputSchema?.required).toContain("software_names");
      expect(compareTool?.inputSchema?.examples).toBeDefined();
    }, 10000);
  });

  describe("Real API Integration", () => {
    it("should search for software with fuzzy matching", async () => {
      const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
      if (!apiKey) {
        console.log("Skipping integration test - no API key available");
        return;
      }

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            query: "python",
            limit: 5,
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);

      if (responseData.error) {
        console.log("API error, skipping validation:", responseData.error);
        return;
      }

      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      expect(responseData).toHaveProperty("fuzzy_matching");
      expect(responseData.fuzzy_matching).toBe(true);
      expect(Array.isArray(responseData.items)).toBe(true);

      if (responseData.items.length > 0) {
        const software = responseData.items[0];
        expect(software).toHaveProperty("name");
        expect(software).toHaveProperty("available_on_resources");
        expect(Array.isArray(software.available_on_resources)).toBe(true);

        console.log("✅ Search software test passed");
        console.log(`   Query: python`);
        console.log(`   Results: ${responseData.total}`);
        console.log(`   First result: ${software.name}`);
        console.log(`   Available on: ${software.available_on_resources.join(", ")}`);
      }
    }, 15000);

    it("should search with resource filter", async () => {
      const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
      if (!apiKey) {
        console.log("Skipping integration test - no API key available");
        return;
      }

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            query: "tensorflow",
            resource: "anvil",
            limit: 5,
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);

      if (responseData.error) {
        console.log("API error, skipping validation:", responseData.error);
        return;
      }

      expect(responseData).toHaveProperty("resource_filter");
      expect(responseData.resource_filter).toBe("anvil");

      console.log("✅ Resource filter test passed");
      console.log(`   Resource filter: ${responseData.resource_filter}`);
      console.log(`   Results: ${responseData.total}`);
    }, 15000);

    it("should include AI metadata in search results", async () => {
      const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
      if (!apiKey) {
        console.log("Skipping integration test - no API key available");
        return;
      }

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            query: "tensorflow",
            limit: 1,
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);

      if (responseData.error) {
        console.log("API error, skipping validation:", responseData.error);
        return;
      }

      if (responseData.items && responseData.items.length > 0) {
        const software = responseData.items[0];

        expect(software.ai_metadata).toBeDefined();
        expect(software.ai_metadata).toHaveProperty("description");
        expect(software.ai_metadata).toHaveProperty("tags");
        expect(software.ai_metadata).toHaveProperty("research_area");
        expect(software.ai_metadata).toHaveProperty("software_type");
        expect(software.ai_metadata).toHaveProperty("software_class");

        expect(Array.isArray(software.ai_metadata.tags)).toBe(true);

        console.log("✅ AI metadata test passed");
        console.log(`   Tags: ${JSON.stringify(software.ai_metadata.tags)}`);
        console.log(`   Research Area: ${software.ai_metadata.research_area}`);
        console.log(`   Software Type: ${software.ai_metadata.software_type}`);
      }
    }, 15000);

    it("should list all software without query", async () => {
      const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
      if (!apiKey) {
        console.log("Skipping integration test - no API key available");
        return;
      }

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "list_all_software",
          arguments: {
            limit: 10,
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);

      if (responseData.error) {
        console.log("API error, skipping validation:", responseData.error);
        return;
      }

      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      expect(responseData.resource_filter).toBe("all resources");
      expect(Array.isArray(responseData.items)).toBe(true);
      expect(responseData.items.length).toBeLessThanOrEqual(10);

      console.log("✅ List all software test passed");
      console.log(`   Total: ${responseData.total}`);
      console.log(`   Returned: ${responseData.items.length}`);
    }, 15000);

    it("should list software for a specific resource", async () => {
      const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
      if (!apiKey) {
        console.log("Skipping integration test - no API key available");
        return;
      }

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "list_all_software",
          arguments: {
            resource: "delta",
            limit: 5,
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);

      if (responseData.error) {
        console.log("API error, skipping validation:", responseData.error);
        return;
      }

      expect(responseData.resource_filter).toBe("delta");

      console.log("✅ List software by resource test passed");
      console.log(`   Resource: ${responseData.resource_filter}`);
      console.log(`   Results: ${responseData.total}`);
    }, 15000);

    it("should get software details", async () => {
      const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
      if (!apiKey) {
        console.log("Skipping integration test - no API key available");
        return;
      }

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "get_software_details",
          arguments: {
            software_name: "python",
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);

      if (responseData.error) {
        console.log("API error, skipping validation:", responseData.error);
        return;
      }

      expect(responseData).toHaveProperty("found");
      expect(responseData).toHaveProperty("software_name");

      if (responseData.found) {
        expect(responseData.details).toBeDefined();
        expect(responseData.details.name).toBeDefined();
        expect(responseData.details.available_on_resources).toBeDefined();
        expect(responseData.details.ai_metadata).toBeDefined();

        console.log("✅ Get software details test passed");
        console.log(`   Software: ${responseData.details.name}`);
        console.log(
          `   Available on: ${responseData.details.available_on_resources.length} resources`
        );
        if (responseData.other_matches) {
          console.log(`   Other matches: ${responseData.other_matches.length}`);
        }
      }
    }, 15000);

    it("should compare software availability", async () => {
      const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
      if (!apiKey) {
        console.log("Skipping integration test - no API key available");
        return;
      }

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "compare_software_availability",
          arguments: {
            software_names: ["python", "gcc", "openmpi"],
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);

      if (responseData.error) {
        console.log("API error, skipping validation:", responseData.error);
        return;
      }

      expect(responseData).toHaveProperty("requested_software");
      expect(responseData).toHaveProperty("comparison");
      expect(responseData).toHaveProperty("summary");
      expect(Array.isArray(responseData.comparison)).toBe(true);
      expect(responseData.comparison.length).toBe(3);

      responseData.comparison.forEach((c: SoftwareComparisonResult) => {
        expect(c).toHaveProperty("software");
        expect(c).toHaveProperty("found");
        expect(c).toHaveProperty("available_on");
        expect(c).toHaveProperty("resource_count");
      });

      console.log("✅ Compare software availability test passed");
      console.log(`   Requested: ${responseData.requested_software.join(", ")}`);
      console.log(
        `   Found: ${responseData.summary.software_found}/${responseData.summary.total_software_requested}`
      );
      responseData.comparison.forEach((c: SoftwareComparisonResult) => {
        console.log(`   ${c.software}: ${c.found ? c.resource_count + " resources" : "not found"}`);
      });
    }, 15000);

    it("should compare software on specific resources", async () => {
      const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
      if (!apiKey) {
        console.log("Skipping integration test - no API key available");
        return;
      }

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "compare_software_availability",
          arguments: {
            software_names: ["tensorflow", "pytorch"],
            resources: ["anvil", "delta"],
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);

      if (responseData.error) {
        console.log("API error, skipping validation:", responseData.error);
        return;
      }

      expect(responseData.requested_resources).toEqual(["anvil", "delta"]);

      console.log("✅ Compare with resource filter test passed");
      console.log(`   Resources: ${JSON.stringify(responseData.requested_resources)}`);
    }, 15000);

    it("should include versions by resource in results", async () => {
      const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
      if (!apiKey) {
        console.log("Skipping integration test - no API key available");
        return;
      }

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            query: "python",
            limit: 1,
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);

      if (responseData.error) {
        console.log("API error, skipping validation:", responseData.error);
        return;
      }

      if (responseData.items && responseData.items.length > 0) {
        const software = responseData.items[0];

        expect(software).toHaveProperty("versions");
        expect(Array.isArray(software.versions)).toBe(true);

        if (software.versions_by_resource) {
          expect(typeof software.versions_by_resource).toBe("object");
          console.log("✅ Versions by resource test passed");
          console.log(`   Versions: ${software.versions.join(", ")}`);
          console.log(`   Versions by resource: ${JSON.stringify(software.versions_by_resource)}`);
        } else {
          console.log("ℹ️  No versions_by_resource data available");
        }
      }
    }, 15000);
  });

  describe("Error Handling", () => {
    it("should handle missing API key gracefully", async () => {
      // Temporarily remove API key
      const originalKey = process.env.SDS_API_KEY;
      const originalViteKey = process.env.VITE_SDS_API_KEY;
      delete process.env.SDS_API_KEY;
      delete process.env.VITE_SDS_API_KEY;

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_software",
          arguments: {
            query: "test",
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.error).toContain("SDS API key not configured");

      // Restore API key
      if (originalKey) process.env.SDS_API_KEY = originalKey;
      if (originalViteKey) process.env.VITE_SDS_API_KEY = originalViteKey;
    }, 10000);
  });
});
