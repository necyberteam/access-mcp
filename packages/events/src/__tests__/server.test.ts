import { describe, it, expect, beforeEach, vi, afterEach, Mock } from "vitest";
import { EventsServer } from "../server.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("../../package.json");

interface MockHttpClient {
  get: Mock<(url: string) => Promise<{ status: number; data: unknown }>>;
}

describe("EventsServer", () => {
  let server: EventsServer;
  let mockHttpClient: MockHttpClient;

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
      expect(server["version"]).toBe(version);
      expect(server["baseURL"]).toBe("https://support.access-ci.org");
    });

    it("should provide the correct tools", () => {
      const tools = server["getTools"]();

      expect(tools).toHaveLength(2);
      expect(tools.map((t: { name: string }) => t.name)).toContain("search_events");
      expect(tools.map((t: { name: string }) => t.name)).toContain("get_my_events");
    });

    it("should provide the correct resources", () => {
      const resources = server["getResources"]();

      expect(resources).toHaveLength(4);
      expect(resources.map((r) => r.uri)).toContain("accessci://events");
      expect(resources.map((r) => r.uri)).toContain("accessci://events/upcoming");
      expect(resources.map((r) => r.uri)).toContain("accessci://events/workshops");
      expect(resources.map((r) => r.uri)).toContain("accessci://events/webinars");
    });
  });

  describe("URL Building", () => {
    it("should build correct URLs with v2.2 endpoint", () => {
      const url = server["buildEventsUrl"]({});
      expect(url).toContain("/api/2.3/events");
    });

    it("should map 'date: today' to beginning_date_relative", () => {
      const url = server["buildEventsUrl"]({ date: "today" });
      expect(url).toContain("beginning_date_relative=today");
    });

    it("should map 'date: upcoming' to open-ended future range", () => {
      const url = server["buildEventsUrl"]({ date: "upcoming" });
      expect(url).toContain("beginning_date_relative=today");
      expect(url).not.toContain("end_date_relative");
    });

    it("should map 'date: past' to date range", () => {
      const url = server["buildEventsUrl"]({ date: "past" });
      expect(url).toContain("beginning_date_relative=-1year");
      expect(url).toContain("end_date_relative=today");
    });

    it("should map 'date: this_week' to date range", () => {
      const url = server["buildEventsUrl"]({ date: "this_week" });
      expect(url).toContain("beginning_date_relative=today");
      expect(url).toContain("end_date_relative=%2B1week");
    });

    it("should map 'date: this_month' to date range", () => {
      const url = server["buildEventsUrl"]({ date: "this_month" });
      expect(url).toContain("beginning_date_relative=today");
      expect(url).toContain("end_date_relative=%2B1month");
    });

    it("should include type as faceted filter", () => {
      const url = server["buildEventsUrl"]({ type: "workshop" });
      expect(url).toContain("f%5B0%5D=custom_event_type%3Aworkshop");
    });

    it("should include tags as faceted filter", () => {
      const url = server["buildEventsUrl"]({ tags: "python" });
      expect(url).toContain("f%5B0%5D=custom_event_tags%3Apython");
    });

    it("should include skill as faceted filter", () => {
      const url = server["buildEventsUrl"]({ skill: "beginner" });
      expect(url).toContain("f%5B0%5D=skill_level%3Abeginner");
    });

    it("should include multiple faceted filters with incrementing index", () => {
      const url = server["buildEventsUrl"]({
        type: "workshop",
        tags: "python",
        skill: "beginner",
      });

      expect(url).toContain("f%5B0%5D=custom_event_type%3Aworkshop");
      expect(url).toContain("f%5B1%5D=custom_event_tags%3Apython");
      expect(url).toContain("f%5B2%5D=skill_level%3Abeginner");
    });

    it("should include search_api_fulltext for query parameter", () => {
      const url = server["buildEventsUrl"]({
        query: "python machine learning",
      });

      expect(url).toContain("search_api_fulltext=python+machine+learning");
    });

    it("should build URLs with all parameter types", () => {
      const url = server["buildEventsUrl"]({
        query: "gpu",
        date: "this_week",
        type: "webinar",
        skill: "intermediate",
      });

      expect(url).toContain("search_api_fulltext=gpu");
      expect(url).toContain("beginning_date_relative=today");
      expect(url).toContain("end_date_relative=%2B1week");
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
        start_date: "2024-08-30T09:00:00",
        end_date: "2024-08-30T17:00:00",
        location: "Online",
        event_type: "workshop",
        event_affiliation: "ACCESS",
        tags: ["python", "programming", "beginner"],
        skill_level: "beginner",
        speakers: "Dr. Smith",
        contact: "events@example.com",
        registration: "https://example.com/register",
        field_video: "",
        created: "2024-08-01T10:00:00-0400",
        changed: "2024-08-15T14:30:00-0400",
        url: "https://support.access-ci.org/events/python-workshop",
      },
      {
        id: "2",
        title: "Machine Learning Webinar",
        description: "Introduction to ML",
        start_date: "2024-09-01T14:00:00",
        end_date: "2024-09-01T15:30:00",
        location: "Virtual",
        event_type: "webinar",
        event_affiliation: "Community",
        tags: ["machine-learning", "ai", "python"],
        skill_level: "intermediate",
        speakers: "Prof. Johnson",
        contact: "ml@example.com",
        registration: "https://example.com/ml-register",
        field_video: "",
        created: "2024-08-01T10:00:00-0400",
        changed: "2024-08-20T11:00:00-0400",
        url: "https://support.access-ci.org/events/machine-learning-webinar",
      },
    ];

    describe("search_events", () => {
      it("should get events with no filters", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {},
          },
        });

        expect(mockHttpClient.get).toHaveBeenCalled();
        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total).toBe(2);
        expect(responseData.items).toHaveLength(2);
      });

      it("should get events with date filter", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {
              date: "this_month",
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("beginning_date_relative=today");
        expect(calledUrl).toContain("end_date_relative=%2B1month");
      });

      it("should pass type as faceted filter to Drupal", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [mockEventsData[0]],
        });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {
              type: "workshop",
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("f%5B0%5D=custom_event_type%3Aworkshop");
      });

      it("should pass skill as faceted filter to Drupal", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [mockEventsData[0]],
        });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {
              skill: "beginner",
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("f%5B0%5D=skill_level%3Abeginner");
      });

      it("should pass tags as faceted filter to Drupal", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {
              tags: "python",
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("f%5B0%5D=custom_event_tags%3Apython");
      });

      it("should apply limit to events", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {
              limit: 1,
            },
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.items).toHaveLength(1);
      });

      it("should enhance events with calculated fields", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {},
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        const event = responseData.items[0];

        // Check enhanced fields
        expect(event.tags).toEqual(["python", "programming", "beginner"]);
        expect(event.duration_hours).toBe(8); // 9am to 5pm
        expect(event.starts_in_hours).toBeDefined();
      });

      it("should parse comma-separated string tags", async () => {
        const eventsWithStringTags = [
          {
            id: "10",
            title: "String Tags Event",
            start_date: "2024-09-15T09:00:00",
            end_date: "2024-09-15T17:00:00",
            tags: "python, gpu, hpc",
            url: "https://support.access-ci.org/events/string-tags-event",
          },
        ];

        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: eventsWithStringTags,
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {},
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.items[0].tags).toEqual(["python", "gpu", "hpc"]);
      });

      it("should handle empty string tags", async () => {
        const eventsWithEmptyTags = [
          {
            id: "11",
            title: "No Tags Event",
            start_date: "2024-09-15T09:00:00",
            end_date: "2024-09-15T17:00:00",
            tags: "  ",
            url: "https://support.access-ci.org/events/no-tags-event",
          },
        ];

        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: eventsWithEmptyTags,
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {},
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.items[0].tags).toEqual([]);
      });

      it("should sort events by starts_in_hours ascending", async () => {
        const futureDate1 = new Date(Date.now() + 2 * 24 * 3600000).toISOString();
        const futureDate2 = new Date(Date.now() + 10 * 24 * 3600000).toISOString();
        const futureDate3 = new Date(Date.now() + 5 * 24 * 3600000).toISOString();

        const unsortedEvents = [
          {
            id: "s1",
            title: "Event B (10 days out)",
            start_date: futureDate2,
            end_date: futureDate2,
            tags: [],
            url: "https://support.access-ci.org/events/event-b",
          },
          {
            id: "s2",
            title: "Event A (2 days out)",
            start_date: futureDate1,
            end_date: futureDate1,
            tags: [],
            url: "https://support.access-ci.org/events/event-a",
          },
          {
            id: "s3",
            title: "Event C (5 days out)",
            start_date: futureDate3,
            end_date: futureDate3,
            tags: [],
            url: "https://support.access-ci.org/events/event-c",
          },
        ];

        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: unsortedEvents,
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {},
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.items[0].id).toBe("s2"); // nearest
        expect(responseData.items[1].id).toBe("s3"); // middle
        expect(responseData.items[2].id).toBe("s1"); // farthest
      });

      it("should search events by query", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {
              query: "Python",
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("search_api_fulltext=Python");

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total).toBe(2);
        expect(responseData.items).toHaveLength(2);
      });

      it("should combine query params and faceted filters", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [mockEventsData[0]],
        });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {
              query: "Python",
              date: "this_week",
              type: "workshop",
              skill: "beginner",
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("search_api_fulltext=Python");
        expect(calledUrl).toContain("beginning_date_relative=today");
        expect(calledUrl).toContain("end_date_relative=%2B1week");
        expect(calledUrl).toContain("f%5B0%5D=custom_event_type%3Aworkshop");
        expect(calledUrl).toContain("f%5B1%5D=skill_level%3Abeginner");
      });
    });

    describe("Error Handling", () => {
      it("should handle API errors gracefully", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 404,
          statusText: "Not Found",
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {},
          },
        });

        expect(result.content[0].text).toContain("error");
        expect(result.content[0].text).toContain("404");
      });

      it("should handle network errors", async () => {
        mockHttpClient.get.mockRejectedValue(new Error("Network error"));

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {},
          },
        });

        expect(result.content[0].text).toContain("error");
      });

      it("should handle unknown tools", async () => {
        const result = await server["handleToolCall"]({
          method: "tools/call",
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
        start_date: "2024-08-30T09:00:00",
        end_date: "2024-08-30T17:00:00",
        tags: ["test"],
        url: "https://support.access-ci.org/events/test-event",
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
});
