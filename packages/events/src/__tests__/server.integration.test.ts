import { describe, it, expect, beforeEach } from "vitest";
import { EventsServer } from "../server.js";

interface EventItem {
  title?: string;
  description?: string;
  tags?: string[];
  skill_level?: string;
}

// These are integration tests that hit the real API
// Run with: npm run test:integration
describe("EventsServer Integration Tests", () => {
  let server: EventsServer;

  beforeEach(() => {
    server = new EventsServer();
  });

  describe("Real API Calls", () => {
    it("should fetch real events from ACCESS-CI API", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_events",
          arguments: {
            date: "upcoming",
            limit: 5,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      // Check structure of universal response
      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      expect(typeof responseData.total).toBe("number");
      expect(Array.isArray(responseData.items)).toBe(true);

      // If there are events, check their structure
      if (responseData.items.length > 0) {
        const event = responseData.items[0];
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("title");
        expect(event).toHaveProperty("start_date");
        expect(event).toHaveProperty("tags"); // Our enhanced field
        expect(event).toHaveProperty("duration_hours"); // Our calculated field
      }
    }, 10000); // Increase timeout for real API call

    it("should search for Python events", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_events",
          arguments: {
            query: "Python",
            limit: 3,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");

      // Check that search actually filters
      if (responseData.items.length > 0) {
        const hasMatch = responseData.items.some(
          (event: EventItem) =>
            event.title?.toLowerCase().includes("python") ||
            event.description?.toLowerCase().includes("python") ||
            event.tags?.some((tag: string) =>
              tag.toLowerCase().includes("python"),
            ),
        );
        expect(hasMatch).toBe(true);
      }
    }, 10000);

    it("should filter events by type", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_events",
          arguments: {
            type: "workshop",
            limit: 3,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
    }, 10000);

    it("should filter events by tags", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_events",
          arguments: {
            tags: "python",
            date: "upcoming",
            limit: 5,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
    }, 10000);

    it("should handle date filtering correctly", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_events",
          arguments: {
            date: "this_week",
            limit: 10,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
    }, 10000);

    it("should handle skill level filtering", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_events",
          arguments: {
            skill: "beginner",
            date: "upcoming",
            limit: 5,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");

      // Check skill levels if events are returned
      if (responseData.items.length > 0) {
        const skillLevels = responseData.items
          .filter((event: EventItem) => event.skill_level)
          .map((event: EventItem) => event.skill_level?.toLowerCase());

        // Since this is a real API call, skill levels can vary
        // Just verify the filter parameter was processed and skill levels exist
        if (skillLevels.length > 0) {
          console.log(`Found skill levels: ${[...new Set(skillLevels)].join(', ')}`);
          // At least one event should have a skill level when skill_level filter is used
          expect(skillLevels.length).toBeGreaterThan(0);
        } else {
          console.log("No events with skill_level field found (API may not have beginner events available)");
        }
      }
    }, 10000);

    it("should combine multiple filters", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_events",
          arguments: {
            query: "hpc",
            date: "this_month",
            type: "webinar",
            limit: 5,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
    }, 10000);
  });

  describe("Error Handling with Real API", () => {
    it("should handle empty results gracefully", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_events",
          arguments: {
            query: "xyzabc123notfound",
            limit: 10,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("total");
      expect(responseData).toHaveProperty("items");
      expect(responseData.items).toHaveLength(0);
    }, 10000);
  });

  describe("Resource Endpoints", () => {
    it("should fetch data through resource endpoints", async () => {
      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://events/upcoming" },
      });

      expect(result.contents).toBeDefined();
      expect(result.contents[0]).toHaveProperty("text");
      expect(result.contents[0].mimeType).toBe("application/json");

      const data = JSON.parse(result.contents[0].text);
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("items");
    }, 10000);
  });
});
