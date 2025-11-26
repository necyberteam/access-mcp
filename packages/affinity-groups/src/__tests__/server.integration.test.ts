import { describe, it, expect, beforeEach } from "vitest";
import { AffinityGroupsServer } from "../server.js";

/**
 * Integration tests for AffinityGroupsServer
 * These tests make real API calls to the ACCESS Support API
 */
describe("AffinityGroupsServer Integration Tests", () => {
  let server: AffinityGroupsServer;

  beforeEach(() => {
    server = new AffinityGroupsServer();
  });

  describe("Real API Calls - List Groups", () => {
    it("should list all affinity groups", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_affinity_groups",
          arguments: {},
        },
      });

      expect(result.content).toHaveLength(1);
      const responseData = JSON.parse(result.content[0].text);

      // Check universal response format
      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      expect(Array.isArray(responseData.items)).toBe(true);
      expect(responseData.total).toBeGreaterThan(0);

      // Verify group structure if we have groups
      if (responseData.items.length > 0) {
        const group = responseData.items[0];
        expect(group).toHaveProperty("id");
        expect(group).toHaveProperty("name");
      }

      console.log(`✅ Found ${responseData.total} affinity groups`);
    }, 15000);
  });

  describe("Real API Calls - Get Specific Group", () => {
    it("should get specific affinity group details", async () => {
      // First list groups to get a valid ID
      const listResult = await server["handleToolCall"]({
        params: {
          name: "search_affinity_groups",
          arguments: {},
        },
      });

      const listData = JSON.parse(listResult.content[0].text);

      if (listData.items.length > 0) {
        const groupId = listData.items[0].id;

        // Get specific group
        const result = await server["handleToolCall"]({
          params: {
            name: "search_affinity_groups",
            arguments: {
              id: groupId,
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData).toHaveProperty("total");
        expect(responseData).toHaveProperty("items");
        expect(responseData.items).toHaveLength(1);
        expect(responseData.items[0].id).toBe(groupId);

        console.log(`✅ Retrieved group ${groupId}: ${responseData.items[0].name}`);
      }
    }, 20000);
  });

  describe("Real API Calls - Group with Events", () => {
    it("should get group with events included", async () => {
      // Get a group ID first
      const listResult = await server["handleToolCall"]({
        params: {
          name: "search_affinity_groups",
          arguments: {},
        },
      });

      const listData = JSON.parse(listResult.content[0].text);

      if (listData.items.length > 0) {
        const groupId = listData.items[0].id;

        // Get group with events
        const result = await server["handleToolCall"]({
          params: {
            name: "search_affinity_groups",
            arguments: {
              id: groupId,
              include: "events",
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData).toHaveProperty("total");
        expect(responseData).toHaveProperty("items");

        console.log(`✅ Retrieved group events for ${groupId}`);
      }
    }, 20000);
  });

  describe("Real API Calls - Group with KB", () => {
    it("should get group with knowledge base included", async () => {
      // Get a group ID first
      const listResult = await server["handleToolCall"]({
        params: {
          name: "search_affinity_groups",
          arguments: {},
        },
      });

      const listData = JSON.parse(listResult.content[0].text);

      if (listData.items.length > 0) {
        const groupId = listData.items[0].id;

        // Get group with KB
        const result = await server["handleToolCall"]({
          params: {
            name: "search_affinity_groups",
            arguments: {
              id: groupId,
              include: "kb",
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData).toHaveProperty("total");
        expect(responseData).toHaveProperty("items");

        console.log(`✅ Retrieved group KB for ${groupId}`);
      }
    }, 20000);
  });

  describe("Real API Calls - Group with All Resources", () => {
    it("should get group with all resources included", async () => {
      // Get a group ID first
      const listResult = await server["handleToolCall"]({
        params: {
          name: "search_affinity_groups",
          arguments: {},
        },
      });

      const listData = JSON.parse(listResult.content[0].text);

      if (listData.items.length > 0) {
        const groupId = listData.items[0].id;

        // Get group with all resources
        const result = await server["handleToolCall"]({
          params: {
            name: "search_affinity_groups",
            arguments: {
              id: groupId,
              include: "all",
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);

        // When include: "all", response structure is different
        expect(responseData).toHaveProperty("group");
        expect(responseData).toHaveProperty("events");
        expect(responseData).toHaveProperty("knowledge_base");

        console.log(`✅ Retrieved all resources for ${groupId}`);
      }
    }, 25000);
  });

  describe("Error Handling", () => {
    it("should handle invalid group ID gracefully", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_affinity_groups",
          arguments: {
            id: "nonexistent-group-id-xyz-123",
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      // Should either return error or empty results
      if (responseData.error) {
        expect(responseData).toHaveProperty("error");
      } else {
        expect(responseData).toHaveProperty("total");
        expect(responseData).toHaveProperty("items");
      }

      console.log("✅ Invalid group ID handled correctly");
    }, 15000);
  });

  describe("Resource Endpoint", () => {
    it("should fetch data through resource endpoint", async () => {
      const result = await server["handleResourceRead"]({
        params: {
          uri: "accessci://affinity-groups",
        },
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].mimeType).toBe("application/json");

      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("items");
      expect(Array.isArray(data.items)).toBe(true);

      console.log("✅ Resource endpoint working correctly");
    }, 15000);
  });
});
