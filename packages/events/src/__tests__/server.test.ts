import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { EventsServer } from "../server.js";
import axios from "axios";

// Mock axios
vi.mock("axios");

describe("EventsServer", () => {
  let server: EventsServer;
  let mockHttpClient: any;

  beforeEach(() => {
    server = new EventsServer();

    // Set up mock HTTP client
    mockHttpClient = {
      get: vi.fn(),
    };

    // Override the httpClient getter
    Object.defineProperty(server, "httpClient", {
      get: () => mockHttpClient,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Server Initialization", () => {
    it("should initialize with correct server name and version", () => {
      expect(server).toBeDefined();
      expect(server["serverName"]).toBe("access-mcp-events");
      expect(server["version"]).toBe("0.1.0");
      expect(server["baseURL"]).toBe("https://support.access-ci.org");
    });

    it("should provide the correct tools", () => {
      const tools = server["getTools"]();

      expect(tools).toHaveLength(4);
      expect(tools.map((t) => t.name)).toContain("get_events");
      expect(tools.map((t) => t.name)).toContain("get_upcoming_events");
      expect(tools.map((t) => t.name)).toContain("search_events");
      expect(tools.map((t) => t.name)).toContain("get_events_by_tag");
    });

    it("should provide the correct resources", () => {
      const resources = server["getResources"]();

      expect(resources).toHaveLength(4);
      expect(resources.map((r) => r.uri)).toContain("accessci://events");
      expect(resources.map((r) => r.uri)).toContain(
        "accessci://events/upcoming",
      );
      expect(resources.map((r) => r.uri)).toContain(
        "accessci://events/workshops",
      );
      expect(resources.map((r) => r.uri)).toContain(
        "accessci://events/webinars",
      );
    });
  });

  describe("URL Building", () => {
    it("should build correct URLs with relative date filters", () => {
      const url = server["buildEventsUrl"]({
        beginning_date_relative: "today",
        end_date_relative: "+1week",
      });

      expect(url).toContain("beginning_date_relative=today");
      expect(url).toContain("end_date_relative=%2B1week");
    });

    it("should build correct URLs with absolute date filters", () => {
      const url = server["buildEventsUrl"]({
        beginning_date: "2024-01-01",
        end_date: "2024-12-31",
      });

      expect(url).toContain("beginning_date=2024-01-01");
      expect(url).toContain("end_date=2024-12-31");
    });

    it("should build correct URLs with faceted filters", () => {
      const url = server["buildEventsUrl"]({
        event_type: "workshop",
        skill_level: "beginner",
        event_tags: "python",
        event_affiliation: "ACCESS",
      });

      expect(url).toContain("f%5B0%5D=custom_event_type%3Aworkshop");
      expect(url).toContain("f%5B1%5D=custom_event_affiliation%3AACCESS");
      expect(url).toContain("f%5B2%5D=skill_level%3Abeginner");
      expect(url).toContain("f%5B3%5D=custom_event_tags%3Apython");
    });

    it("should build correct URLs with mixed filters", () => {
      const url = server["buildEventsUrl"]({
        beginning_date_relative: "today",
        end_date: "2024-12-31",
        event_type: "webinar",
        skill_level: "intermediate",
      });

      expect(url).toContain("beginning_date_relative=today");
      expect(url).toContain("end_date=2024-12-31");
      expect(url).toContain("f%5B0%5D=custom_event_type%3Awebinar");
      expect(url).toContain("f%5B1%5D=skill_level%3Aintermediate");
    });
  });

  describe("Tool Methods", () => {
    const mockEventsData = [
      {
        id: "1",
        title: "Python Workshop",
        description: "Learn Python basics",
        date: "2024-08-30T09:00:00",
        date_1: "2024-08-30T17:00:00",
        location: "Online",
        event_type: "workshop",
        event_affiliation: "ACCESS",
        custom_event_tags: "python,programming,beginner",
        skill_level: "beginner",
        speakers: "Dr. Smith",
        contact: "events@example.com",
        registration: "https://example.com/register",
        field_video: "",
        created: "2024-08-01T10:00:00-0400",
        changed: "2024-08-15T14:30:00-0400",
      },
      {
        id: "2",
        title: "Machine Learning Webinar",
        description: "Introduction to ML",
        date: "2024-09-01T14:00:00",
        date_1: "2024-09-01T15:30:00",
        location: "Virtual",
        event_type: "webinar",
        event_affiliation: "Community",
        custom_event_tags: "machine-learning,ai,python",
        skill_level: "intermediate",
        speakers: "Prof. Johnson",
        contact: "ml@example.com",
        registration: "https://example.com/ml-register",
        field_video: "",
        created: "2024-08-01T10:00:00-0400",
        changed: "2024-08-20T11:00:00-0400",
      },
    ];

    describe("get_events", () => {
      it("should get events with no filters", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_events",
            arguments: {},
          },
        });

        expect(mockHttpClient.get).toHaveBeenCalled();
        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total_events).toBe(2);
        expect(responseData.events).toHaveLength(2);
      });

      it("should get events with date filters", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_events",
            arguments: {
              beginning_date_relative: "today",
              end_date_relative: "+1month",
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("beginning_date_relative=today");
        expect(calledUrl).toContain("end_date_relative=%2B1month");
      });

      it("should get events with faceted filters", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [mockEventsData[0]], // Only workshop
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_events",
            arguments: {
              event_type: "workshop",
              skill_level: "beginner",
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("custom_event_type%3Aworkshop");
        expect(calledUrl).toContain("skill_level%3Abeginner");
      });

      it("should apply limit to events", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_events",
            arguments: {
              limit: 1,
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.events).toHaveLength(1);
      });

      it("should enhance events with calculated fields", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_events",
            arguments: {},
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        const event = responseData.events[0];

        // Check enhanced fields
        expect(event.tags).toEqual(["python", "programming", "beginner"]);
        expect(event.duration_hours).toBe(8); // 9am to 5pm
        expect(event.starts_in_hours).toBeDefined();
      });

      it("should extract popular tags", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_events",
            arguments: {},
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.popular_tags).toContain("python");
        expect(responseData.popular_tags).toContain("machine-learning");
      });
    });

    describe("get_upcoming_events", () => {
      it("should get upcoming events with default limit", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_upcoming_events",
            arguments: {},
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("beginning_date_relative=today");
        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.events).toBeDefined();
      });

      it("should filter upcoming events by type", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [mockEventsData[1]], // Only webinar
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_upcoming_events",
            arguments: {
              event_type: "webinar",
              limit: 10,
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("custom_event_type%3Awebinar");
      });
    });

    describe("search_events", () => {
      it("should search events by query in title", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_events",
            arguments: {
              query: "Python",
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.search_query).toBe("Python");
        expect(responseData.total_matches).toBe(2); // Both events have 'python' in tags
        expect(responseData.events[0].title).toContain("Python");
      });

      it("should search events by query in description", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_events",
            arguments: {
              query: "ML",
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total_matches).toBe(1);
        expect(responseData.events[0].description).toContain("ML");
      });

      it("should search events by query in tags", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_events",
            arguments: {
              query: "machine-learning",
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total_matches).toBe(1);
      });

      it("should search with custom date range", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_events",
            arguments: {
              query: "workshop",
              beginning_date_relative: "-1month",
              limit: 5,
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("beginning_date_relative=-1month");
      });
    });

    describe("get_events_by_tag", () => {
      it("should get events by tag for upcoming time range", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_events_by_tag",
            arguments: {
              tag: "python",
              time_range: "upcoming",
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("custom_event_tags%3Apython");
        expect(calledUrl).toContain("beginning_date_relative=today");

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.tag).toBe("python");
        expect(responseData.time_range).toBe("upcoming");
      });

      it("should get events by tag for this week", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_events_by_tag",
            arguments: {
              tag: "ai",
              time_range: "this_week",
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("beginning_date_relative=today");
        expect(calledUrl).toContain("end_date_relative=%2B1week");
      });

      it("should get events by tag for this month", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_events_by_tag",
            arguments: {
              tag: "programming",
              time_range: "this_month",
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("beginning_date_relative=today");
        expect(calledUrl).toContain("end_date_relative=%2B1month");
      });

      it("should get all events by tag", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_events_by_tag",
            arguments: {
              tag: "beginner",
              time_range: "all",
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).not.toContain("beginning_date_relative");
        expect(calledUrl).not.toContain("end_date_relative");
      });
    });

    describe("Error Handling", () => {
      it("should handle API errors gracefully", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 404,
          statusText: "Not Found",
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_events",
            arguments: {},
          },
        });

        expect(result.content[0].text).toContain("Error");
        expect(result.content[0].text).toContain("404");
      });

      it("should handle network errors", async () => {
        mockHttpClient.get.mockRejectedValue(new Error("Network error"));

        const result = await server["handleToolCall"]({
          params: {
            name: "get_events",
            arguments: {},
          },
        });

        expect(result.content[0].text).toContain("Error");
      });

      it("should handle unknown tools", async () => {
        const result = await server["handleToolCall"]({
          params: {
            name: "unknown_tool",
            arguments: {},
          },
        });

        expect(result.content[0].text).toContain("Unknown tool");
      });
    });
  });

  describe("Resource Handling", () => {
    const mockEventsData = [
      {
        id: "1",
        title: "Test Event",
        event_type: "workshop",
        date: "2024-08-30T09:00:00",
        date_1: "2024-08-30T17:00:00",
        custom_event_tags: "test",
      },
    ];

    it("should handle accessci://events resource", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockEventsData,
      });

      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://events" },
      });

      expect(result.contents[0].mimeType).toBe("application/json");
      expect(result.contents[0].text).toBeDefined();
    });

    it("should handle accessci://events/upcoming resource", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockEventsData,
      });

      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://events/upcoming" },
      });

      expect(result.contents[0].mimeType).toBe("application/json");
    });

    it("should handle accessci://events/workshops resource", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: mockEventsData,
      });

      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://events/workshops" },
      });

      expect(result.contents[0].mimeType).toBe("application/json");
    });

    it("should handle accessci://events/webinars resource", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: [],
      });

      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://events/webinars" },
      });

      expect(result.contents[0].mimeType).toBe("application/json");
    });

    it("should handle unknown resources", async () => {
      await expect(async () => {
        await server["handleResourceRead"]({
          params: { uri: "accessci://unknown" },
        });
      }).rejects.toThrow("Unknown resource");
    });
  });

  describe("Utility Methods", () => {
    it("should extract popular tags correctly", () => {
      const events = [
        { tags: ["python", "ai", "machine-learning"] },
        { tags: ["python", "data-science"] },
        { tags: ["ai", "gpu"] },
        { tags: ["python"] },
        { tags: ["machine-learning"] },
      ];

      const popularTags = server["getPopularTags"](events);
      expect(popularTags[0]).toBe("python"); // Most frequent (3 times)
      expect(popularTags[1]).toBe("ai"); // Second most frequent (2 times)
      expect(popularTags[2]).toBe("machine-learning"); // Also 2 times
      expect(popularTags).toHaveLength(Math.min(10, 5)); // Should return up to 10 tags
    });

    it("should handle empty events for popular tags", () => {
      const popularTags = server["getPopularTags"]([]);
      expect(popularTags).toEqual([]);
    });

    it("should handle events without tags", () => {
      const events = [
        { title: "Event 1" },
        { title: "Event 2", tags: null },
        { title: "Event 3", tags: undefined },
      ];

      const popularTags = server["getPopularTags"](events);
      expect(popularTags).toEqual([]);
    });
  });
});
