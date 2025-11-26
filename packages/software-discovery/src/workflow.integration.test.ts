import { describe, it, expect } from "vitest";
import { SoftwareDiscoveryServer } from "./server.js";

describe("Resource Discovery Workflow Integration", () => {
  const server = new SoftwareDiscoveryServer();

  it("should provide clear tool descriptions in universal format", async () => {
    // Test that tools include proper descriptions
    const tools = server["getTools"]();

    const searchSoftwareTool = tools.find(t => t.name === "search_software");
    expect(searchSoftwareTool).toBeDefined();
    expect(searchSoftwareTool?.description).toContain("Search software packages");
    expect(searchSoftwareTool?.description).toContain("Returns {total, items}");

    // Check that resource parameters exist
    const resourceParam = searchSoftwareTool?.inputSchema?.properties?.resource;
    expect(resourceParam).toBeDefined();
    expect(resourceParam?.type).toBe("string");
  }, 10000);

  it("should provide error messages for invalid resource IDs", async () => {
    // This test requires a real API call but with an invalid resource
    // Skip if no API key is available
    const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
    if (!apiKey) {
      console.log('Skipping integration test - no API key available');
      return;
    }

    const result = await server["handleToolCall"]({
      params: {
        name: "search_software",
        arguments: {
          resource: "nonexistent-resource.access-ci.org",
        },
      },
    });

    const responseData = JSON.parse(result.content[0].text);

    // Verify error response structure
    expect(responseData.error).toBeDefined();
    expect(responseData.error).toContain("Resource ID not found");
    expect(responseData.hint).toBeDefined();
  }, 10000);

  it("should handle real AI metadata fields correctly", async () => {
    // Test with a known software package that should have AI metadata
    const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
    if (!apiKey) {
      console.log('Skipping integration test - no API key available');
      return;
    }

    const result = await server["handleToolCall"]({
      params: {
        name: "search_software",
        arguments: {
          query: "tensorflow",
        },
      },
    });

    const responseData = JSON.parse(result.content[0].text);

    if (responseData.error) {
      console.log('API error, skipping validation:', responseData.error);
      return;
    }

    if (responseData.items && responseData.items.length > 0) {
      const software = responseData.items[0];

      // Verify all AI metadata fields are present in the structure
      expect(software.ai_metadata).toBeDefined();
      expect(software.ai_metadata).toHaveProperty('description');
      expect(software.ai_metadata).toHaveProperty('tags');
      expect(software.ai_metadata).toHaveProperty('research_area');
      expect(software.ai_metadata).toHaveProperty('research_discipline');
      expect(software.ai_metadata).toHaveProperty('research_field');
      expect(software.ai_metadata).toHaveProperty('software_type');
      expect(software.ai_metadata).toHaveProperty('software_class');
      expect(software.ai_metadata).toHaveProperty('core_features');
      expect(software.ai_metadata).toHaveProperty('example_use');

      // Verify tags are properly parsed as array
      expect(Array.isArray(software.ai_metadata.tags)).toBe(true);

      console.log('✅ AI metadata validation passed');
      console.log(`   Tags: ${JSON.stringify(software.ai_metadata.tags)}`);
      console.log(`   Research Area: ${software.ai_metadata.research_area}`);
      console.log(`   Software Type: ${software.ai_metadata.software_type}`);
    }
  }, 10000);

  it("should discover filter values from real data", async () => {
    const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
    if (!apiKey) {
      console.log('Skipping integration test - no API key available');
      return;
    }

    const result = await server["handleToolCall"]({
      params: {
        name: "search_software",
        arguments: {
          query: "machine learning",
          discover: true,
          limit: 10,
        },
      },
    });

    const responseData = JSON.parse(result.content[0].text);

    if (responseData.error) {
      console.log('API error, skipping validation:', responseData.error);
      return;
    }

    // Verify structure of discovered values
    expect(responseData.discovered_values).toBeDefined();
    expect(responseData.discovered_values.research_areas).toBeInstanceOf(Array);
    expect(responseData.discovered_values.software_types).toBeInstanceOf(Array);
    expect(responseData.discovered_values.top_tags).toBeInstanceOf(Array);
    expect(responseData.usage_notes).toBeDefined();

    console.log('✅ Filter discovery validation passed');
    console.log(`   Research Areas: ${responseData.discovered_values.research_areas.length}`);
    console.log(`   Software Types: ${responseData.discovered_values.software_types.length}`);
    console.log(`   Top Tags: ${responseData.discovered_values.top_tags.length}`);
  }, 10000);

  it("should list software when no query parameter provided", async () => {
    const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
    if (!apiKey) {
      console.log('Skipping integration test - no API key available');
      return;
    }

    const result = await server["handleToolCall"]({
      params: {
        name: "search_software",
        arguments: {},
      },
    });

    const responseData = JSON.parse(result.content[0].text);

    // Should return successful results, not an error
    expect(responseData).toHaveProperty("total");
    expect(responseData).toHaveProperty("items");
    expect(Array.isArray(responseData.items)).toBe(true);
    expect(responseData.total).toBeGreaterThan(0);

    // Should include software packages
    if (responseData.items.length > 0) {
      const software = responseData.items[0];
      expect(software).toHaveProperty("name");
      expect(software).toHaveProperty("description");
      expect(software).toHaveProperty("ai_metadata");

      console.log('✅ Optional query parameter validation passed');
      console.log(`   Total software listed: ${responseData.total}`);
      console.log(`   First software: ${software.name}`);
    }
  }, 15000);

  it("should respect limit when listing all software", async () => {
    const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
    if (!apiKey) {
      console.log('Skipping integration test - no API key available');
      return;
    }

    const result = await server["handleToolCall"]({
      params: {
        name: "search_software",
        arguments: {
          limit: 5,
        },
      },
    });

    const responseData = JSON.parse(result.content[0].text);

    expect(responseData).toHaveProperty("total");
    expect(responseData).toHaveProperty("items");
    expect(responseData.items.length).toBeLessThanOrEqual(5);

    console.log('✅ Limit parameter validation passed');
    console.log(`   Requested limit: 5`);
    console.log(`   Actual items returned: ${responseData.items.length}`);
  }, 15000);
});