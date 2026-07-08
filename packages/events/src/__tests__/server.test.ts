import { describe, it, expect, beforeEach, vi, afterEach, Mock } from "vitest";
import { requestContextStorage, RequestContext } from "@access-mcp/shared";

const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockSetActingUser = vi.fn();
vi.mock("@access-mcp/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@access-mcp/shared")>();
  return {
    ...actual,
    DrupalAuthProvider: vi.fn().mockImplementation(() => ({
      ensureAuthenticated: vi.fn().mockResolvedValue(undefined),
      get: mockGet,
      delete: mockDelete,
      setActingUser: mockSetActingUser,
    })),
  };
});
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

      expect(tools).toHaveLength(4);
      expect(tools.map((t: { name: string }) => t.name)).toContain("search_events");
      expect(tools.map((t: { name: string }) => t.name)).toContain("get_my_events");
      expect(tools.map((t: { name: string }) => t.name)).toContain("get_my_registrations");
      expect(tools.map((t: { name: string }) => t.name)).toContain("cancel_registration");
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
        expect(responseData.documentation.links.see_all_url).toBe("https://support.access-ci.org/events");
        expect(responseData.metadata.query_relevance).toBe("exact");
      });

      it("should tag query_relevance loose_match when full-text query is supplied", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: mockEventsData,
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {
              query: "machine learning",
            },
          },
        });

        const calledUrl = mockHttpClient.get.mock.calls[0][0];
        expect(calledUrl).toContain("search_api_fulltext=machine+learning");

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.metadata.query_relevance).toBe("loose_match");
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

  describe("get_my_registrations", () => {
    it("get_my_registrations calls the registrations endpoint with when=upcoming by default", async () => {
      const saved = { url: process.env.DRUPAL_API_URL, user: process.env.DRUPAL_USERNAME, pass: process.env.DRUPAL_PASSWORD };
      try {
        process.env.DRUPAL_API_URL = "https://drupal.example";
        process.env.DRUPAL_USERNAME = "svc"; process.env.DRUPAL_PASSWORD = "pw";
        mockGet.mockReset();
        // auth.get returns the response BODY directly; our endpoint returns { registrations: [...] } — mock that shape, NOT wrapped in { data: ... }.
        mockGet.mockResolvedValue({ registrations: [{ registrant_id: "u-1", eventinstance_id: 5, event_title: "GPU", waitlist: false }] });
        const server = new EventsServer();
        const result = await requestContextStorage.run(
          { actingUser: "apasquale@access-ci.org" } as RequestContext,
          () => server["handleToolCall"]({ method: "tools/call", params: { name: "get_my_registrations", arguments: {} } })
        );
        expect(mockGet).toHaveBeenCalledWith("/api/1.0/registrations?when=upcoming");
        const text = (result.content[0] as { text: string }).text;
        expect(text).toContain("u-1");
      } finally {
        if (saved.url === undefined) delete process.env.DRUPAL_API_URL; else process.env.DRUPAL_API_URL = saved.url;
        if (saved.user === undefined) delete process.env.DRUPAL_USERNAME; else process.env.DRUPAL_USERNAME = saved.user;
        if (saved.pass === undefined) delete process.env.DRUPAL_PASSWORD; else process.env.DRUPAL_PASSWORD = saved.pass;
      }
    });

    it("get_my_registrations passes when=past through", async () => {
      const saved = { url: process.env.DRUPAL_API_URL, user: process.env.DRUPAL_USERNAME, pass: process.env.DRUPAL_PASSWORD };
      try {
        process.env.DRUPAL_API_URL = "https://drupal.example";
        process.env.DRUPAL_USERNAME = "svc"; process.env.DRUPAL_PASSWORD = "pw";
        mockGet.mockReset();
        mockGet.mockResolvedValue({ registrations: [] });
        const server = new EventsServer();
        await requestContextStorage.run(
          { actingUser: "apasquale@access-ci.org" } as RequestContext,
          () => server["handleToolCall"]({ method: "tools/call", params: { name: "get_my_registrations", arguments: { when: "past" } } })
        );
        expect(mockGet).toHaveBeenCalledWith("/api/1.0/registrations?when=past");
      } finally {
        if (saved.url === undefined) delete process.env.DRUPAL_API_URL; else process.env.DRUPAL_API_URL = saved.url;
        if (saved.user === undefined) delete process.env.DRUPAL_USERNAME; else process.env.DRUPAL_USERNAME = saved.user;
        if (saved.pass === undefined) delete process.env.DRUPAL_PASSWORD; else process.env.DRUPAL_PASSWORD = saved.pass;
      }
    });

    it("get_my_registrations handles an empty/undefined response body", async () => {
      const saved = { url: process.env.DRUPAL_API_URL, user: process.env.DRUPAL_USERNAME, pass: process.env.DRUPAL_PASSWORD };
      try {
        process.env.DRUPAL_API_URL = "https://drupal.example";
        process.env.DRUPAL_USERNAME = "svc"; process.env.DRUPAL_PASSWORD = "pw";
        mockGet.mockReset();
        mockGet.mockResolvedValue(undefined);
        const server = new EventsServer();
        const result = await requestContextStorage.run(
          { actingUser: "apasquale@access-ci.org" } as RequestContext,
          () => server["handleToolCall"]({ method: "tools/call", params: { name: "get_my_registrations", arguments: {} } })
        );
        const text = (result.content[0] as { text: string }).text;
        expect(typeof text).toBe("string");
        expect(text.length).toBeGreaterThan(0);
        expect(text).toMatch(/no data/i);
      } finally {
        if (saved.url === undefined) delete process.env.DRUPAL_API_URL; else process.env.DRUPAL_API_URL = saved.url;
        if (saved.user === undefined) delete process.env.DRUPAL_USERNAME; else process.env.DRUPAL_USERNAME = saved.user;
        if (saved.pass === undefined) delete process.env.DRUPAL_PASSWORD; else process.env.DRUPAL_PASSWORD = saved.pass;
      }
    });
  });

  describe("cancel_registration", () => {
    it("cancel_registration calls DELETE on the registration endpoint", async () => {
      const saved = { url: process.env.DRUPAL_API_URL, user: process.env.DRUPAL_USERNAME, pass: process.env.DRUPAL_PASSWORD };
      try {
        process.env.DRUPAL_API_URL = "https://drupal.example";
        process.env.DRUPAL_USERNAME = "svc"; process.env.DRUPAL_PASSWORD = "pw";
        mockDelete.mockReset();
        mockDelete.mockResolvedValue({ status: "cancelled", registrant_id: "u-1" });
        const server = new EventsServer();
        const result = await requestContextStorage.run(
          { actingUser: "apasquale@access-ci.org" } as RequestContext,
          () => server["handleToolCall"]({ method: "tools/call", params: { name: "cancel_registration", arguments: { registrant_id: "u-1", confirmed: true } } })
        );
        expect(mockDelete).toHaveBeenCalledWith("/api/1.0/registrations/u-1");
        const text = (result.content[0] as { text: string }).text;
        const parsed = JSON.parse(text);
        expect(parsed.success).toBe(true);
        expect(parsed.registrant_id).toBe("u-1");
      } finally {
        if (saved.url === undefined) delete process.env.DRUPAL_API_URL; else process.env.DRUPAL_API_URL = saved.url;
        if (saved.user === undefined) delete process.env.DRUPAL_USERNAME; else process.env.DRUPAL_USERNAME = saved.user;
        if (saved.pass === undefined) delete process.env.DRUPAL_PASSWORD; else process.env.DRUPAL_PASSWORD = saved.pass;
      }
    });

    it("cancel_registration requires registrant_id and confirmed in the schema", () => {
      const tool = new EventsServer()["getTools"]().find((t) => t.name === "cancel_registration");
      const schema = tool?.inputSchema as { required?: string[] };
      expect(schema?.required).toContain("registrant_id");
      expect(schema?.required).toContain("confirmed");
    });

    it("cancel_registration refuses to delete without confirmed", async () => {
      const saved = { url: process.env.DRUPAL_API_URL, user: process.env.DRUPAL_USERNAME, pass: process.env.DRUPAL_PASSWORD };
      try {
        process.env.DRUPAL_API_URL = "https://drupal.example";
        process.env.DRUPAL_USERNAME = "svc"; process.env.DRUPAL_PASSWORD = "pw";
        mockDelete.mockReset();
        const server = new EventsServer();
        for (const args of [{ registrant_id: "u-1" }, { registrant_id: "u-1", confirmed: false }]) {
          const result = await requestContextStorage.run(
            { actingUser: "apasquale@access-ci.org" } as RequestContext,
            () => server["handleToolCall"]({ method: "tools/call", params: { name: "cancel_registration", arguments: args } })
          );
          const text = (result.content[0] as { text: string }).text;
          const parsed = JSON.parse(text);
          expect(parsed.error).toMatch(/requires explicit confirmation/i);
          expect(parsed.registrant_id).toBe("u-1");
        }
        expect(mockDelete).not.toHaveBeenCalled();
      } finally {
        if (saved.url === undefined) delete process.env.DRUPAL_API_URL; else process.env.DRUPAL_API_URL = saved.url;
        if (saved.user === undefined) delete process.env.DRUPAL_USERNAME; else process.env.DRUPAL_USERNAME = saved.user;
        if (saved.pass === undefined) delete process.env.DRUPAL_PASSWORD; else process.env.DRUPAL_PASSWORD = saved.pass;
      }
    });

    it("cancel_registration rejects truthy-but-not-true confirmed values (strict === true)", async () => {
      const saved = { url: process.env.DRUPAL_API_URL, user: process.env.DRUPAL_USERNAME, pass: process.env.DRUPAL_PASSWORD };
      try {
        process.env.DRUPAL_API_URL = "https://drupal.example";
        process.env.DRUPAL_USERNAME = "svc"; process.env.DRUPAL_PASSWORD = "pw";
        mockDelete.mockReset();
        const server = new EventsServer();
        // A string "true" and the number 1 are truthy but not boolean true;
        // they must NOT slip through the confirmation gate.
        for (const confirmed of ["true", 1]) {
          const result = await requestContextStorage.run(
            { actingUser: "apasquale@access-ci.org" } as RequestContext,
            () => server["handleToolCall"]({ method: "tools/call", params: { name: "cancel_registration", arguments: { registrant_id: "u-1", confirmed } } })
          );
          const text = (result.content[0] as { text: string }).text;
          const parsed = JSON.parse(text);
          expect(parsed.error).toMatch(/requires explicit confirmation/i);
          expect(parsed.registrant_id).toBe("u-1");
        }
        expect(mockDelete).not.toHaveBeenCalled();
      } finally {
        if (saved.url === undefined) delete process.env.DRUPAL_API_URL; else process.env.DRUPAL_API_URL = saved.url;
        if (saved.user === undefined) delete process.env.DRUPAL_USERNAME; else process.env.DRUPAL_USERNAME = saved.user;
        if (saved.pass === undefined) delete process.env.DRUPAL_PASSWORD; else process.env.DRUPAL_PASSWORD = saved.pass;
      }
    });

    it("cancel_registration errors without registrant_id and never calls DELETE", async () => {
      mockDelete.mockReset();
      const server = new EventsServer();
      const result = await requestContextStorage.run(
        { actingUser: "apasquale@access-ci.org" } as RequestContext,
        () => server["handleToolCall"]({ method: "tools/call", params: { name: "cancel_registration", arguments: {} } })
      );
      const text = (result.content[0] as { text: string }).text;
      expect(text).toMatch(/registrant_id is required/i);
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  describe("fields projection (Pillar 2)", () => {
    const mockEventsData = [
      {
        id: "1",
        title: "Python Workshop",
        description: "Learn Python basics",
        start_date: "2024-08-30T09:00:00",
        end_date: "2024-08-30T17:00:00",
        event_type: "workshop",
        tags: ["python"],
        url: "https://support.access-ci.org/events/python-workshop",
      },
    ];

    it("should project search_events response to requested fields only", async () => {
      mockHttpClient.get.mockResolvedValue({ status: 200, data: mockEventsData });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_events",
          arguments: { fields: ["total", "items[].title"] },
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.total).toBe(1);
      expect(Object.keys(responseData.items[0])).toEqual(["title"]);
      expect(responseData.items[0].title).toBe("Python Workshop");
      // metadata + documentation are sticky containers — preserved on projection.
      expect(responseData.metadata).toBeDefined();
      expect(responseData.documentation).toBeDefined();
    });

    it("should always preserve total even when fields omits it", async () => {
      mockHttpClient.get.mockResolvedValue({ status: 200, data: mockEventsData });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_events",
          arguments: { fields: ["metadata.pagination.has_more"] },
        },
      });

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.total).toBe(1);
      expect(responseData.metadata.pagination.has_more).toBeDefined();
      expect(responseData.items).toBeUndefined();
    });

    it("should advertise fields parameter and supportsFieldProjection on opted-in tools", () => {
      const tools = server["getTools"]();

      const searchTool = tools.find((t: { name: string }) => t.name === "search_events");
      expect(searchTool?.inputSchema.properties?.fields).toBeDefined();
      expect((searchTool as { _meta?: { supportsFieldProjection?: boolean } })._meta?.supportsFieldProjection).toBe(true);

      const myTool = tools.find((t: { name: string }) => t.name === "get_my_events");
      expect(myTool?.inputSchema.properties?.fields).toBeDefined();
      expect((myTool as { _meta?: { supportsFieldProjection?: boolean } })._meta?.supportsFieldProjection).toBe(true);
    });
  });

  describe("get_my_events display URL", () => {
    it("get_my_events queries the mcp_my_events JSON:API display", async () => {
      const saved = {
        url: process.env.DRUPAL_API_URL,
        user: process.env.DRUPAL_USERNAME,
        pass: process.env.DRUPAL_PASSWORD,
      };
      try {
        process.env.DRUPAL_API_URL = "https://drupal.example";
        process.env.DRUPAL_USERNAME = "svc";
        process.env.DRUPAL_PASSWORD = "pw";
        mockGet.mockReset();
        mockGet.mockResolvedValue({ data: [] });
        const server = new EventsServer();
        await requestContextStorage.run(
          { actingUser: "apasquale@access-ci.org" } as RequestContext,
          () =>
            server["handleToolCall"]({
              method: "tools/call",
              params: { name: "get_my_events", arguments: { limit: 5 } },
            })
        );
        expect(mockGet).toHaveBeenCalledWith(
          "apasquale@access-ci.org",
          "/jsonapi/views/event_instance_mine/mcp_my_events?page[limit]=6"
        );
      } finally {
        if (saved.url === undefined) delete process.env.DRUPAL_API_URL;
        else process.env.DRUPAL_API_URL = saved.url;
        if (saved.user === undefined) delete process.env.DRUPAL_USERNAME;
        else process.env.DRUPAL_USERNAME = saved.user;
        if (saved.pass === undefined) delete process.env.DRUPAL_PASSWORD;
        else process.env.DRUPAL_PASSWORD = saved.pass;
      }
    });
  });
});

import { compactDescription } from "../server.js";

describe("compactDescription", () => {
  it("returns undefined for undefined input", () => {
    expect(compactDescription(undefined)).toBeUndefined();
  });

  it("strips HTML tags", () => {
    expect(compactDescription("<h4>Hello</h4><p>world</p>")).toBe("Hello world");
  });

  it("decodes common entities", () => {
    expect(compactDescription("Foo&nbsp;&amp;&nbsp;bar &lt;3 &quot;hi&quot;")).toBe(
      'Foo & bar <3 "hi"'
    );
  });

  it("collapses whitespace", () => {
    expect(compactDescription("a   b\n\nc\t\td")).toBe("a b c d");
  });

  it("truncates with ellipsis past max length", () => {
    const long = "a".repeat(500);
    const out = compactDescription(long, 100);
    expect(out!.endsWith("…")).toBe(true);
    expect(out!.length).toBe(101);
  });

  it("does not truncate when within max", () => {
    expect(compactDescription("short", 100)).toBe("short");
  });
});
