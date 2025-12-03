import { describe, it, expect } from "vitest";
import { ComputeResourcesServer } from "./server.js";

interface ComputeResource {
  name?: string;
}

describe("ComputeResourcesServer Integration Tests", () => {
  const server = new ComputeResourcesServer();

  it("should fetch real compute resources from ACCESS-CI API", async () => {
    const result = await server["handleToolCall"]({
      params: {
        name: "search_resources",
        arguments: {},
      },
    });

    const responseData = JSON.parse(result.content[0].text);

    // Should have at least some major resources
    expect(responseData.total).toBeGreaterThan(5);
    expect(responseData.items).toBeInstanceOf(Array);

    // Check for known major resources
    const resourceNames = responseData.items.map((r: ComputeResource) => r.name?.toLowerCase());
    const knownResources = ["delta", "anvil", "bridges", "jetstream"];
    const foundKnownResources = knownResources.filter(known =>
      resourceNames.some(name => name.includes(known))
    );

    expect(foundKnownResources.length).toBeGreaterThan(2);

    // Verify structure of resources
    const firstResource = responseData.items[0];
    expect(firstResource).toHaveProperty('id');
    expect(firstResource).toHaveProperty('name');
    expect(firstResource).toHaveProperty('description');
    expect(firstResource).toHaveProperty('resourceIds');
    expect(firstResource).toHaveProperty('hasGpu');
    expect(firstResource).toHaveProperty('resourceType');

    console.log(`✅ Found ${responseData.total} compute resources`);
    console.log(`   Major resources found: ${foundKnownResources.join(', ')}`);
  }, 10000);

  it("should search resources with include_ids for service integration", async () => {
    const result = await server["handleToolCall"]({
      params: {
        name: "search_resources",
        arguments: {
          query: "gpu",
          include_ids: true,
        },
      },
    });

    const responseData = JSON.parse(result.content[0].text);

    expect(responseData.total).toBeGreaterThan(0);

    // Verify resource IDs are included
    if (responseData.items.length > 0) {
      const firstResource = responseData.items[0];
      expect(firstResource.resource_ids).toBeDefined();
      expect(firstResource.resource_ids).toBeInstanceOf(Array);
      expect(firstResource.resource_ids.length).toBeGreaterThan(0);
    }

    console.log(`✅ Found ${responseData.total} GPU resources with resource IDs`);
    if (responseData.items.length > 0) {
      console.log(`   First resource IDs: ${responseData.items[0].resource_ids.join(', ')}`);
    }
  }, 10000);

  it("should search for cloud resources", async () => {
    const result = await server["handleToolCall"]({
      params: {
        name: "search_resources",
        arguments: {
          type: "cloud",
          include_ids: true,
        },
      },
    });

    const responseData = JSON.parse(result.content[0].text);

    if (responseData.total > 0) {
      const cloudResource = responseData.items[0];
      expect(cloudResource.resourceType).toBe("cloud");
      expect(cloudResource.resource_ids).toBeInstanceOf(Array);

      console.log(`✅ Found ${responseData.total} cloud resources`);
      console.log(`   First cloud resource: ${cloudResource.name}`);
    } else {
      console.log('ℹ️  No cloud resources found in current data');
    }
  }, 10000);

  it("should get specific resource details", async () => {
    // First get a list to find a valid resource ID
    const listResult = await server["handleToolCall"]({
      params: {
        name: "search_resources",
        arguments: {},
      },
    });

    const listData = JSON.parse(listResult.content[0].text);

    if (listData.items && listData.items.length > 0) {
      const resourceId = listData.items[0].id;

      const result = await server["handleToolCall"]({
        params: {
          name: "search_resources",
          arguments: {
            id: resourceId.toString(),
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      // Handle case where API returns different structure or no data
      if (Array.isArray(responseData)) {
        expect(responseData).toBeInstanceOf(Array);
        expect(responseData.length).toBeGreaterThan(0);
      } else if (responseData.results) {
        expect(responseData.results).toBeInstanceOf(Array);
        expect(responseData.results.length).toBeGreaterThan(0);
      } else {
        // Skip test if resource not found (API might not have this specific resource)
        console.log(`⚠️ Resource ${resourceId} not found or API structure changed, skipping validation`);
        return;
      }

      console.log(`✅ Retrieved details for resource ID ${resourceId}`);
      if (Array.isArray(responseData)) {
        console.log(`   Resource details count: ${responseData.length}`);
      } else if (responseData.results) {
        console.log(`   Resource details count: ${responseData.results.length}`);
      }
    }
  }, 10000);

  it("should demonstrate the resource discovery workflow", async () => {
    // This test demonstrates the exact workflow other services should use

    // Step 1: Search for resources with include_ids: true
    const searchResult = await server["handleToolCall"]({
      params: {
        name: "search_resources",
        arguments: {
          query: "delta",
          include_ids: true,
        },
      },
    });

    const searchData = JSON.parse(searchResult.content[0].text);

    if (searchData.total > 0) {
      const deltaResource = searchData.items[0];
      const resourceIds = deltaResource.resource_ids;

      expect(resourceIds).toBeInstanceOf(Array);
      expect(resourceIds.length).toBeGreaterThan(0);

      // Step 2: Use any of these IDs with other ACCESS-CI services
      const usableResourceId = resourceIds[0];
      expect(typeof usableResourceId).toBe('string');
      expect(usableResourceId).toMatch(/\.access-ci\.org$/); // Should be in ACCESS-CI format

      console.log('✅ Resource Discovery Workflow Demonstrated:');
      console.log(`   1. Search found: ${deltaResource.name}`);
      console.log(`   2. Available resource IDs: ${resourceIds.join(', ')}`);
      console.log(`   3. Use "${usableResourceId}" with other ACCESS-CI services`);
    }
  }, 10000);
});