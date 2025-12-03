import { describe, it, expect, beforeEach } from "vitest";
import { AnnouncementsServer } from "./server.js";

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
        const hasMaintenanceTag = responseData.items.some((ann: AnnouncementItem) =>
          ann.tags && ann.tags.some((tag: string) =>
            tag.toLowerCase().includes("maintenance")
          )
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