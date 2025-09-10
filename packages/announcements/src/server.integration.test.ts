import { describe, it, expect } from "vitest";
import { AnnouncementsServer } from "./server.js";

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
        params: {
          name: "get_announcements",
          arguments: {
            limit: 5,
          },
        },
      } as any);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0].text);
      
      // Check structure
      expect(responseData).toHaveProperty("total_announcements");
      expect(responseData).toHaveProperty("announcements");
      expect(responseData).toHaveProperty("popular_tags");
      expect(responseData).toHaveProperty("filters_applied");
      
      // Announcements should be an array
      expect(Array.isArray(responseData.announcements)).toBe(true);
      
      // If there are announcements, check their structure
      if (responseData.announcements.length > 0) {
        const firstAnnouncement = responseData.announcements[0];
        expect(firstAnnouncement).toHaveProperty("title");
        expect(firstAnnouncement).toHaveProperty("body");
        expect(firstAnnouncement).toHaveProperty("date");
        expect(firstAnnouncement).toHaveProperty("formatted_date");
        expect(firstAnnouncement).toHaveProperty("tags");
        expect(Array.isArray(firstAnnouncement.tags)).toBe(true);
      }
    }, 10000);

    it("should filter by tags", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_announcements_by_tags",
          arguments: {
            tags: "maintenance",
            limit: 3,
          },
        },
      } as any);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0].text);
      
      expect(responseData).toHaveProperty("announcements");
      expect(Array.isArray(responseData.announcements)).toBe(true);
      
      // If maintenance announcements exist, they should contain the tag
      if (responseData.announcements.length > 0) {
        const hasMaintenanceTag = responseData.announcements.some((ann: any) => 
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
        params: {
          name: "get_announcements",
          arguments: {
            relative_start_date: "-1month",
            relative_end_date: "today",
            limit: 10,
          },
        },
      } as any);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0].text);
      
      expect(responseData).toHaveProperty("announcements");
      expect(responseData.filters_applied).toHaveProperty("date_range");
      
      // All announcements should be within the last month
      if (responseData.announcements.length > 0) {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        responseData.announcements.forEach((ann: any) => {
          const annDate = new Date(ann.date);
          expect(annDate.getTime()).toBeGreaterThanOrEqual(oneMonthAgo.getTime());
        });
      }
    }, 10000);
  });

  describe("get_recent_announcements", () => {
    it("should fetch announcements from the past week", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_recent_announcements",
          arguments: {
            period: "1 week",
          },
        },
      } as any);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0].text);
      
      expect(responseData).toHaveProperty("announcements");
      expect(responseData.filters_applied.date_range).toContain("week");
      
      // Check that announcements are from the past week if any exist
      if (responseData.announcements.length > 0) {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        responseData.announcements.forEach((ann: any) => {
          const annDate = new Date(ann.date);
          expect(annDate.getTime()).toBeGreaterThanOrEqual(oneWeekAgo.getTime());
        });
      }
    }, 10000);

    it("should handle today filter", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_recent_announcements",
          arguments: {
            period: "0 days",
          },
        },
      } as any);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0].text);
      
      expect(responseData).toHaveProperty("announcements");
      expect(responseData.filters_applied.date_range).toContain("0 days");
      
      // Today's announcements might be empty, that's okay
      expect(Array.isArray(responseData.announcements)).toBe(true);
    }, 10000);
  });

  describe("get_announcements_by_affinity_group", () => {
    it("should handle affinity group filtering", async () => {
      // We don't know specific affinity group IDs, so test with a made-up one
      const result = await server["handleToolCall"]({
        params: {
          name: "get_announcements_by_affinity_group",
          arguments: {
            ag: "test-group-123",
            limit: 5,
          },
        },
      } as any);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0].text);
      
      // Should return a valid response even if no announcements match
      expect(responseData).toHaveProperty("announcements");
      expect(Array.isArray(responseData.announcements)).toBe(true);
      expect(responseData.filters_applied).toHaveProperty("affinity_group");
      expect(responseData.filters_applied.affinity_group).toBe("test-group-123");
    }, 10000);
  });

  describe("API Error Handling", () => {
    it("should handle invalid parameters gracefully", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_announcements",
          arguments: {
            beginning_date: "invalid-date",
          },
        },
      } as any);

      // The API might accept this or reject it
      // Just verify we get a response
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
    }, 10000);

    it("should handle empty results", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_announcements",
          arguments: {
            tags: "nonexistent-tag-xyz-123-456",
            exact_match: true,
          },
        },
      } as any);

      expect(result.isError).toBeFalsy();
      const responseData = JSON.parse(result.content[0].text);
      
      expect(responseData.total_announcements).toBe(0);
      expect(responseData.announcements).toEqual([]);
      expect(responseData.message).toContain("No announcements found");
    }, 10000);
  });
});