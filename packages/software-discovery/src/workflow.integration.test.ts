import { describe, it, expect } from "vitest";
import { SoftwareDiscoveryServer } from "./server.js";

describe("Resource Discovery Workflow Integration", () => {
  const server = new SoftwareDiscoveryServer();

  it("should provide clear guidance for resource discovery workflow", async () => {
    // Test that tools include proper workflow guidance
    const tools = server["getTools"]();
    
    const searchSoftwareTool = tools.find(t => t.name === "search_software");
    expect(searchSoftwareTool?.description).toContain("Resource Discovery Workflow");
    expect(searchSoftwareTool?.description).toContain("access-compute-resources:search_resources");
    
    const listByResourceTool = tools.find(t => t.name === "list_software_by_resource");
    expect(listByResourceTool?.description).toContain("REQUIRED");
    expect(listByResourceTool?.description).toContain("include_resource_ids: true");
    
    // Check that resource_id parameters include discovery guidance
    const resourceIdParam = searchSoftwareTool?.inputSchema?.properties?.resource_id;
    expect(resourceIdParam?.description).toContain("Finding Resource IDs");
    expect(resourceIdParam?.description).toContain("access-compute-resources:search_resources");
  }, 10000);

  it("should provide enhanced error messages for invalid resource IDs", async () => {
    // This test requires a real API call but with an invalid resource
    // Skip if no API key is available
    const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;
    if (!apiKey) {
      console.log('Skipping integration test - no API key available');
      return;
    }

    const result = await server["handleToolCall"]({
      params: {
        name: "list_software_by_resource",
        arguments: {
          resource_id: "nonexistent-resource.access-ci.org",
        },
      },
    });

    const responseData = JSON.parse(result.content[0].text);
    
    // Verify enhanced error response structure
    expect(responseData.error).toContain("Resource ID not found");
    expect(responseData.solution).toContain("REQUIRED");
    expect(responseData.solution).toContain("access-compute-resources:search_resources");
    expect(responseData.example).toContain("nonexistent-resource");
    expect(responseData.workflow).toBeDefined();
    expect(responseData.workflow.step_1).toBeDefined();
    expect(responseData.workflow.step_2).toBeDefined();
    expect(responseData.workflow.step_3).toBeDefined();
    expect(responseData.quick_reference).toBeDefined();
    expect(responseData.quick_reference.common_resources).toBeInstanceOf(Array);
    expect(responseData.quick_reference.search_examples).toBeInstanceOf(Array);
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
          include_ai_metadata: true,
        },
      },
    });

    const responseData = JSON.parse(result.content[0].text);
    
    if (responseData.error) {
      console.log('API error, skipping validation:', responseData.error);
      return;
    }

    if (responseData.software && responseData.software.length > 0) {
      const software = responseData.software[0];
      
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
        name: "discover_filter_values",
        arguments: {
          query: "machine learning",
          sample_size: 10,
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
});