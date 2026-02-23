import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { AnnouncementsServer } from "./server.js";
import { requestContextStorage, RequestContext } from "@access-mcp/shared";

interface TextContent {
  type: "text";
  text: string;
}

interface AnnouncementItem {
  title: string;
  body: string;
  published_date: string;
  tags: string[];
}

interface MyAnnouncementItem {
  uuid: string;
  nid: number;
  title: string;
  status: string;
  created: string;
  published_date: string;
  summary: string;
  edit_url: string;
}

/**
 * Integration tests for AnnouncementsServer
 * These tests make actual API calls to the ACCESS Support API
 */
describe("AnnouncementsServer Integration Tests", () => {
  let server: AnnouncementsServer;

  beforeEach(() => {
    server = new AnnouncementsServer();
  });

  describe("get_announcements", () => {
    it("should fetch real announcements from API", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {
            limit: 5,
          },
        },
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse((result.content[0] as TextContent).text);

      // Check structure
      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");

      // Items should be an array
      expect(Array.isArray(responseData.items)).toBe(true);

      // If there are announcements, check their structure
      if (responseData.items.length > 0) {
        const firstAnnouncement = responseData.items[0];
        expect(firstAnnouncement).toHaveProperty("title");
        expect(firstAnnouncement).toHaveProperty("body");
        expect(firstAnnouncement).toHaveProperty("published_date");
        expect(firstAnnouncement).toHaveProperty("tags");
        expect(Array.isArray(firstAnnouncement.tags)).toBe(true);
      }
    }, 10000);

    it("should filter by tags", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {
            tags: "maintenance",
            limit: 3,
          },
        },
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse((result.content[0] as TextContent).text);

      expect(responseData).toHaveProperty("items");
      expect(Array.isArray(responseData.items)).toBe(true);

      // If maintenance announcements exist, they should contain the tag
      if (responseData.items.length > 0) {
        const hasMaintenanceTag = responseData.items.some(
          (ann: AnnouncementItem) =>
            ann.tags && ann.tags.some((tag: string) => tag.toLowerCase().includes("maintenance"))
        );
        // This might not always be true if the API doesn't have maintenance announcements
        console.log("Found maintenance announcements:", hasMaintenanceTag);
      }
    }, 10000);

    it("should handle date range filters", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {
            date: "this_month",
            limit: 10,
          },
        },
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse((result.content[0] as TextContent).text);

      expect(responseData).toHaveProperty("items");

      // All announcements should be within the last month
      if (responseData.items.length > 0) {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        responseData.items.forEach((ann: AnnouncementItem) => {
          const annDate = new Date(ann.published_date);
          expect(annDate.getTime()).toBeGreaterThanOrEqual(oneMonthAgo.getTime());
        });
      }
    }, 10000);
  });

  describe("get_recent_announcements", () => {
    it("should fetch announcements from the past week", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {
            date: "this_week",
          },
        },
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse((result.content[0] as TextContent).text);

      expect(responseData).toHaveProperty("items");

      // Check that announcements are from the past week if any exist
      if (responseData.items.length > 0) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        responseData.items.forEach((ann: AnnouncementItem) => {
          const annDate = new Date(ann.published_date);
          expect(annDate.getTime()).toBeGreaterThanOrEqual(oneWeekAgo.getTime());
        });
      }
    }, 10000);

    it("should handle today filter", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {
            date: "today",
          },
        },
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse((result.content[0] as TextContent).text);

      expect(responseData).toHaveProperty("items");

      // Today's announcements might be empty, that's okay
      expect(Array.isArray(responseData.items)).toBe(true);
    }, 10000);
  });

  describe("get_announcements with limit", () => {
    it("should respect limit parameter", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {
            limit: 5,
          },
        },
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse((result.content[0] as TextContent).text);

      // Should return a valid response
      expect(responseData).toHaveProperty("items");
      expect(Array.isArray(responseData.items)).toBe(true);
      if (responseData.items.length > 0) {
        expect(responseData.items.length).toBeLessThanOrEqual(5);
      }
    }, 10000);
  });

  describe("search with query parameter", () => {
    it("should perform full-text search", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {
            query: "ACCESS",
            limit: 5,
          },
        },
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse((result.content[0] as TextContent).text);

      expect(responseData).toHaveProperty("items");
      expect(Array.isArray(responseData.items)).toBe(true);
    }, 10000);
  });

  describe("API Error Handling", () => {
    it("should handle search with no parameters", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {},
        },
      });

      // Should return default results
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toHaveProperty("items");
    }, 10000);

    it("should handle empty results", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {
            tags: "nonexistent-tag-xyz-123-456",
          },
        },
      });

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse((result.content[0] as TextContent).text);

      // May have 0 or few results
      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      expect(Array.isArray(responseData.items)).toBe(true);
    }, 10000);
  });
});

/**
 * E2E tests for authenticated CRUD operations.
 *
 * Requires env vars: DRUPAL_API_URL, DRUPAL_USERNAME, DRUPAL_PASSWORD, ACTING_USER
 * Tests run against a live Drupal instance (e.g., accessmatch.ddev.site).
 * Skipped if DRUPAL_USERNAME is not set.
 */
const hasDrupalCreds = !!process.env.DRUPAL_USERNAME && !!process.env.DRUPAL_PASSWORD;

describe.skipIf(!hasDrupalCreds)("Authenticated CRUD E2E Tests", () => {
  let server: AnnouncementsServer;
  const createdUuids: string[] = [];

  beforeEach(() => {
    server = new AnnouncementsServer();
  });

  // Clean up any announcements created during tests
  afterAll(async () => {
    if (createdUuids.length === 0) return;
    const cleanupServer = new AnnouncementsServer();
    for (const uuid of createdUuids) {
      try {
        await cleanupServer["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "delete_announcement",
            arguments: { uuid, confirmed: true },
          },
        });
      } catch {
        // Best effort cleanup
      }
    }
  });

  describe("get_announcement_context", () => {
    it("should return tags and coordinator status via views endpoint", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "get_announcement_context",
          arguments: {},
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);

      // Should have tags array
      expect(responseData).toHaveProperty("tags");
      expect(Array.isArray(responseData.tags)).toBe(true);
      if (responseData.tags.length > 0) {
        expect(responseData.tags[0]).toHaveProperty("name");
        expect(responseData.tags[0]).toHaveProperty("uuid");
      }

      // Should have affinity groups (may be empty if user is not a coordinator)
      expect(responseData).toHaveProperty("affinity_groups");
      expect(Array.isArray(responseData.affinity_groups)).toBe(true);

      // Should have is_coordinator boolean
      expect(responseData).toHaveProperty("is_coordinator");
      expect(typeof responseData.is_coordinator).toBe("boolean");
      expect(responseData.is_coordinator).toBe(responseData.affinity_groups.length > 0);

      // Should have static options
      expect(responseData.affiliations).toContain("ACCESS Collaboration");
      expect(responseData.affiliations).toContain("Community");
      expect(responseData.where_to_share_options).toHaveLength(4);
    }, 15000);

    it("should work with request context acting user", async () => {
      const savedActingUser = process.env.ACTING_USER;
      delete process.env.ACTING_USER;

      try {
        const context: RequestContext = {
          actingUser: savedActingUser || "apasquale@access-ci.org",
        };

        const result = await requestContextStorage.run(context, async () => {
          return server["handleToolCall"]({
            method: "tools/call",
            params: {
              name: "get_announcement_context",
              arguments: {},
            },
          });
        });

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData).toHaveProperty("tags");
        expect(responseData).toHaveProperty("is_coordinator");
      } finally {
        if (savedActingUser) process.env.ACTING_USER = savedActingUser;
      }
    }, 15000);
  });

  describe("create, get_my, update, delete announcement", () => {
    it("should create an announcement and find it via get_my_announcements", async () => {
      // 1. Create announcement
      const createResult = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "create_announcement",
          arguments: {
            title: "E2E Test Announcement",
            body: "<p>This is an automated e2e test announcement.</p>",
            summary: "E2E test summary",
          },
        },
      });

      const createData = JSON.parse((createResult.content[0] as TextContent).text);
      expect(createData.success).toBe(true);
      expect(createData.uuid).toBeTruthy();
      expect(createData.title).toBe("E2E Test Announcement");
      expect(createData.edit_url).toContain("/node/");
      expect(createData.edit_url).toContain("/edit");

      createdUuids.push(createData.uuid);

      // 2. Verify it appears in get_my_announcements
      const myResult = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "get_my_announcements",
          arguments: { limit: 50 },
        },
      });

      const myData = JSON.parse((myResult.content[0] as TextContent).text);
      expect(myData.total).toBeGreaterThanOrEqual(1);

      const found = myData.items.find(
        (item: MyAnnouncementItem) => item.uuid === createData.uuid
      );
      expect(found).toBeTruthy();
      expect(found.title).toBe("E2E Test Announcement");
      expect(found.status).toBe("draft");
      expect(found.summary).toBe("E2E test summary");
      expect(found.uuid).toBe(createData.uuid);
      expect(found.edit_url).toContain("/edit");
    }, 30000);

    it("should update an existing announcement", async () => {
      // Create one to update
      const createResult = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "create_announcement",
          arguments: {
            title: "E2E Update Test",
            body: "<p>Original body</p>",
            summary: "Original summary",
          },
        },
      });

      const createData = JSON.parse((createResult.content[0] as TextContent).text);
      expect(createData.success).toBe(true);
      createdUuids.push(createData.uuid);

      // Update it
      const updateResult = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "update_announcement",
          arguments: {
            uuid: createData.uuid,
            title: "E2E Update Test - Modified",
          },
        },
      });

      const updateData = JSON.parse((updateResult.content[0] as TextContent).text);
      expect(updateData.success).toBe(true);
      expect(updateData.title).toBe("E2E Update Test - Modified");
    }, 30000);

    it("should delete an announcement", async () => {
      // Create one to delete
      const createResult = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "create_announcement",
          arguments: {
            title: "E2E Delete Test",
            body: "<p>To be deleted</p>",
            summary: "Will be deleted",
          },
        },
      });

      const createData = JSON.parse((createResult.content[0] as TextContent).text);
      expect(createData.success).toBe(true);
      const uuid = createData.uuid;

      // Delete it
      const deleteResult = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "delete_announcement",
          arguments: { uuid, confirmed: true },
        },
      });

      const deleteData = JSON.parse((deleteResult.content[0] as TextContent).text);
      expect(deleteData.success).toBe(true);
      expect(deleteData.uuid).toBe(uuid);

      // Remove from cleanup list since we already deleted it
      const idx = createdUuids.indexOf(uuid);
      if (idx !== -1) createdUuids.splice(idx, 1);

      // Verify it's gone from get_my_announcements
      const myResult = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "get_my_announcements",
          arguments: {},
        },
      });

      const myData = JSON.parse((myResult.content[0] as TextContent).text);
      const found = myData.items.find(
        (item: MyAnnouncementItem) => item.uuid === uuid
      );
      expect(found).toBeUndefined();
    }, 30000);

    it("should reject delete without confirmation", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "delete_announcement",
          arguments: {
            uuid: "some-uuid",
            confirmed: false,
          },
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.error).toContain("explicit confirmation");
    }, 10000);
  });

  describe("get_my_announcements", () => {
    it("should return proper structure from views endpoint", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "get_my_announcements",
          arguments: {},
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      expect(Array.isArray(responseData.items)).toBe(true);

      // If there are items, check structure
      if (responseData.items.length > 0) {
        const item = responseData.items[0];
        expect(item).toHaveProperty("uuid");
        expect(item).toHaveProperty("title");
        expect(item).toHaveProperty("status");
        expect(["draft", "published"]).toContain(item.status);
        expect(item).toHaveProperty("edit_url");
      }
    }, 15000);
  });
});
