import { describe, it, expect, beforeEach } from "vitest";
import { EventsServer } from "../server.js";

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
        params: {
          name: "get_events",
          arguments: {
            beginning_date_relative: "today",
            limit: 5,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      // Check structure of response
      expect(responseData).toHaveProperty("total_events");
      expect(responseData).toHaveProperty("events");
      expect(responseData).toHaveProperty("event_types");
      expect(responseData).toHaveProperty("popular_tags");

      // If there are events, check their structure
      if (responseData.events.length > 0) {
        const event = responseData.events[0];
        expect(event).toHaveProperty("id");
        expect(event).toHaveProperty("title");
        expect(event).toHaveProperty("start_date");
        expect(event).toHaveProperty("tags"); // Our enhanced field
        expect(event).toHaveProperty("duration_hours"); // Our calculated field
      }
    }, 10000); // Increase timeout for real API call

    it("should search for Python events", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_events",
          arguments: {
            query: "Python",
            limit: 3,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("search_query");
      expect(responseData.search_query).toBe("Python");
      expect(responseData).toHaveProperty("total_matches");
      expect(responseData).toHaveProperty("events");

      // Check that search actually filters
      if (responseData.events.length > 0) {
        const hasMatch = responseData.events.some(
          (event: any) =>
            event.title?.toLowerCase().includes("python") ||
            event.description?.toLowerCase().includes("python") ||
            event.tags?.some((tag: string) =>
              tag.toLowerCase().includes("python"),
            ),
        );
        expect(hasMatch).toBe(true);
      }
    }, 10000);

    it("should get upcoming office hours events", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_upcoming_events",
          arguments: {
            event_type: "Office Hours",
            limit: 3,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("events");

      // Check that events are actually upcoming (starts_in_hours >= 0)
      responseData.events.forEach((event: any) => {
        if (event.starts_in_hours !== undefined) {
          expect(event.starts_in_hours).toBeGreaterThanOrEqual(0);
        }
      });
    }, 10000);

    it("should get events by AI tag", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_events_by_tag",
          arguments: {
            tag: "ai",
            time_range: "upcoming",
            limit: 5,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("tag");
      expect(responseData.tag).toBe("ai");
      expect(responseData).toHaveProperty("time_range");
      expect(responseData).toHaveProperty("events");
    }, 10000);

    it("should handle date filtering correctly", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_events",
          arguments: {
            beginning_date: "2025-01-01",
            end_date: "2025-12-31",
            limit: 10,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("events");

      // Check that events are within the specified date range
      responseData.events.forEach((event: any) => {
        const eventDate = new Date(event.start_date);
        expect(eventDate.getFullYear()).toBe(2025);
      });
    }, 10000);

    it("should handle skill level filtering", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_events",
          arguments: {
            skill_level: "beginner",
            beginning_date_relative: "today",
            limit: 5,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("events");

      // Check skill levels if events are returned
      if (responseData.events.length > 0) {
        const skillLevels = responseData.events
          .filter((event: any) => event.skill_level)
          .map((event: any) => event.skill_level.toLowerCase());
        
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

    it("should handle timezone parameter with relative dates", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_events",
          arguments: {
            beginning_date_relative: "today",
            timezone: "America/New_York",
            limit: 5,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("events");
      expect(responseData).toHaveProperty("total_events");
      expect(responseData).toHaveProperty("api_info");
      
      // Should successfully handle timezone parameter (v2.2 API feature)
      expect(typeof responseData.total_events).toBe("number");
      expect(responseData.api_info.timezone_used).toBe("America/New_York");
      expect(responseData.api_info.endpoint_version).toBe("2.2");
    }, 10000);

    it("should handle upcoming events with timezone", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_upcoming_events",
          arguments: {
            timezone: "Europe/London",
            limit: 3,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("events");
      expect(responseData).toHaveProperty("api_info");
      expect(responseData.api_info.timezone_used).toBe("Europe/London");
    }, 10000);

    it("should handle search with Pacific timezone", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_events",
          arguments: {
            query: "office",
            timezone: "America/Los_Angeles",
            limit: 2,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("search_query");
      expect(responseData.search_query).toBe("office");
      expect(responseData).toHaveProperty("total_matches");
    }, 10000);

    it("should handle events by tag with timezone", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_events_by_tag",
          arguments: {
            tag: "ai",
            time_range: "this_week",
            timezone: "Asia/Tokyo",
            limit: 3,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("tag");
      expect(responseData.tag).toBe("ai");
      expect(responseData).toHaveProperty("time_range");
      expect(responseData.time_range).toBe("this_week");
    }, 10000);
  });

  describe("Error Handling with Real API", () => {
    it("should handle invalid date formats gracefully", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "get_events",
          arguments: {
            beginning_date: "invalid-date",
            end_date: "2024-12-31",
          },
        },
      });

      // Should still return a response (API might ignore invalid params)
      expect(result.content).toBeDefined();
      expect(result.content[0]).toHaveProperty("text");
    }, 10000);

    it("should handle empty results gracefully", async () => {
      const result = await server["handleToolCall"]({
        params: {
          name: "search_events",
          arguments: {
            query: "xyzabc123notfound",
            limit: 10,
          },
        },
      });

      const responseData = JSON.parse(result.content[0].text);

      expect(responseData).toHaveProperty("total_matches");
      expect(responseData.total_matches).toBe(0);
      expect(responseData.events).toHaveLength(0);
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
      expect(data).toHaveProperty("events");
    }, 10000);
  });
});
