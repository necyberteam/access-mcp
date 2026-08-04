import { describe, it, expect, beforeEach, vi, afterEach, Mock } from "vitest";
import { requestContextStorage, RequestContext } from "@access-mcp/shared";

const mockGet = vi.fn();
const mockDelete = vi.fn();
const mockRequestRaw = vi.fn();
const mockSetActingUser = vi.fn();
vi.mock("@access-mcp/shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@access-mcp/shared")>();
  return {
    ...actual,
    DrupalAuthProvider: vi.fn().mockImplementation(() => ({
      ensureAuthenticated: vi.fn().mockResolvedValue(undefined),
      get: mockGet,
      delete: mockDelete,
      requestRaw: mockRequestRaw,
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

  beforeEach(() => {
    mockRequestRaw.mockReset();
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

      expect(tools).toHaveLength(6);
      expect(tools.map((t: { name: string }) => t.name)).toContain("search_events");
      expect(tools.map((t: { name: string }) => t.name)).toContain("get_my_events");
      expect(tools.map((t: { name: string }) => t.name)).toContain("get_my_registrations");
      expect(tools.map((t: { name: string }) => t.name)).toContain("cancel_registration");
      expect(tools.map((t: { name: string }) => t.name)).toContain("get_event");
      expect(tools.map((t: { name: string }) => t.name)).toContain("register_for_event");
    });

    it("get_my_events / get_my_registrations descriptions crisply separate created vs attending", () => {
      const tools = server["getTools"]();
      const myEvents = tools.find((t) => t.name === "get_my_events")!;
      const myRegs = tools.find((t) => t.name === "get_my_registrations")!;
      // get_my_events must point to get_my_registrations for the attending case (currently does NOT):
      expect(myEvents.description).toContain("get_my_registrations");
      expect(myEvents.description.toLowerCase()).toContain("created");
      // get_my_registrations must cross-reference get_my_events (already does — keep):
      expect(myRegs.description).toContain("get_my_events");
      expect(myRegs.description.toLowerCase()).toContain("registered to attend");
    });

    it("get_event description documents registration_path and capacity_type", () => {
      const tools = server["getTools"]();
      const getEvent = tools.find((t) => t.name === "get_event")!;
      expect(getEvent.description).toContain("registration_path");
      expect(getEvent.description).toContain("capacity_type");
    });

    it("register_for_event description documents the write envelope and drops the cross-tool OPPOSITE/REFUSES clause", () => {
      const tools = server["getTools"]();
      const reg = tools.find((t) => t.name === "register_for_event")!;
      // Documents the write envelope + status reading.
      expect(reg.description).toContain("status");
      expect(reg.description).toContain("executed");
      expect(reg.description).toContain("already_registered");
      // Stale cross-tool reciprocity clause is gone.
      expect(reg.description).not.toContain("OPPOSITE");
      expect(reg.description).not.toContain("REFUSES");
      const confirmed = reg.inputSchema.properties?.confirmed as { description?: string };
      expect(confirmed.description).not.toContain("OPPOSITE");
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

      it("should Z-normalize start_date and end_date (parity with get_my_events/get_event)", async () => {
        // Flat-API fixture with naive-UTC dates (no Z), matching what the
        // /api/2.3/events endpoint actually returns.
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [
            {
              id: "8504",
              title: "OnDemand",
              start_date: "2026-08-06T13:00:00",
              end_date: "2026-08-06T14:00:00",
            },
          ],
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_events",
            arguments: {},
          },
        });

        const responseData = JSON.parse(result.content[0].text);
        const item = responseData.items[0];
        expect(item.start_date).toBe("2026-08-06T13:00:00Z");
        expect(item.end_date).toBe("2026-08-06T14:00:00Z");
        // duration_hours/starts_in_hours must still compute from the raw dates.
        expect(item.duration_hours).toBe(1); // 13:00 to 14:00
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

      // The flat /api/2.3/events API serializes Drupal boolean fields as the
      // STRINGS 'Yes'/'No' and numeric fields as strings ('0'/'60'), NOT JS
      // booleans/numbers. These fixtures use that real production shape.
      it("surfaces native access_registration and renames registration to registration_url", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [
            {
              id: "9078", title: "Reg Workshop", start_date: "2026-08-01T14:00:00Z",
              end_date: "2026-08-01T15:00:00Z", tags: "", description: "d",
              registration: "https://sdsc.edu/register",
              registration_enabled: "Yes", registration_capacity: "60", registration_has_waitlist: "Yes",
            },
            {
              id: "9079", title: "Plain Event", start_date: "2026-08-02T14:00:00Z",
              end_date: "2026-08-02T15:00:00Z", tags: "", description: "d",
              registration: "", registration_enabled: "No", registration_capacity: "0", registration_has_waitlist: "No",
            },
          ],
        });
        const result = await server["handleToolCall"]({
          method: "tools/call", params: { name: "search_events", arguments: {} },
        });
        const payload = JSON.parse((result.content[0] as { text: string }).text);
        const [a, b] = payload.items;
        // Registrable event: capacity is a NUMBER, not the string "60"
        expect(a.access_registration).toEqual({ enabled: true, capacity: 60, has_waitlist: true });
        expect(a.registration_url).toBe("https://sdsc.edu/register");
        // Non-registrable: 'No' must parse to enabled:false, url null, no fabricated capacity
        expect(b.access_registration).toEqual({ enabled: false });
        expect(b.registration_url).toBeNull();
        // The raw flat keys must NOT leak alongside the nested shape
        expect(a).not.toHaveProperty("registration_enabled");
        expect(a).not.toHaveProperty("registration");
      });

      it("treats the string 'No' as not-enabled (the real /api/2.3 shape, not a JS boolean)", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [
            {
              id: "1", title: "Offsite Event", start_date: "2026-08-01T14:00:00Z",
              end_date: "2026-08-01T15:00:00Z", tags: "", description: "d",
              registration: "https://offsite.example/register",
              // Every event on live prod comes back like this for non-native events.
              registration_enabled: "No", registration_capacity: "0", registration_has_waitlist: "No",
            },
          ],
        });
        const result = await server["handleToolCall"]({
          method: "tools/call", params: { name: "search_events", arguments: {} },
        });
        const payload = JSON.parse((result.content[0] as { text: string }).text);
        const [e] = payload.items;
        // Boolean('No') === true would (wrongly) make this enabled:true with
        // has_waitlist:true and capacity "0". The string parser must fix all three.
        expect(e.access_registration).toEqual({ enabled: false });
      });

      it("parses capacity 0 (unlimited) as null even when enabled", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [
            {
              id: "2", title: "Unlimited Workshop", start_date: "2026-08-01T14:00:00Z",
              end_date: "2026-08-01T15:00:00Z", tags: "", description: "d",
              registration: "",
              registration_enabled: "Yes", registration_capacity: "0", registration_has_waitlist: "No",
            },
          ],
        });
        const result = await server["handleToolCall"]({
          method: "tools/call", params: { name: "search_events", arguments: {} },
        });
        const payload = JSON.parse((result.content[0] as { text: string }).text);
        const [e] = payload.items;
        // capacity '0' means unlimited → null (not the string "0", not the number 0)
        expect(e.access_registration).toEqual({ enabled: true, capacity: null, has_waitlist: false });
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
        mockGet.mockResolvedValue({ registrations: [{ registrant_id: "u-1", eventinstance_id: "5", event_title: "GPU", waitlist: false }] });
        const server = new EventsServer();
        const result = await requestContextStorage.run(
          { actingUser: "apasquale@access-ci.org" } as RequestContext,
          () => server["handleToolCall"]({ method: "tools/call", params: { name: "get_my_registrations", arguments: {} } })
        );
        expect(mockGet).toHaveBeenCalledWith(
          "apasquale@access-ci.org",
          "/api/1.0/registrations?when=upcoming"
        );
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
        expect(mockGet).toHaveBeenCalledWith(
          "apasquale@access-ci.org",
          "/api/1.0/registrations?when=past"
        );
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
        expect(mockDelete).toHaveBeenCalledWith(
          "apasquale@access-ci.org",
          "/api/1.0/registrations/u-1"
        );
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

  describe("get_event", () => {
    const withDrupalEnv = async (
      fn: () => Promise<{ content: { text: string }[]; isError?: boolean }>
    ) => {
      const saved = {
        url: process.env.DRUPAL_API_URL,
        user: process.env.DRUPAL_USERNAME,
        pass: process.env.DRUPAL_PASSWORD,
      };
      try {
        process.env.DRUPAL_API_URL = "https://drupal.example";
        process.env.DRUPAL_USERNAME = "svc";
        process.env.DRUPAL_PASSWORD = "pw";
        return await requestContextStorage.run(
          { actingUser: "actor@example.com" } as RequestContext,
          fn
        );
      } finally {
        if (saved.url === undefined) delete process.env.DRUPAL_API_URL;
        else process.env.DRUPAL_API_URL = saved.url;
        if (saved.user === undefined) delete process.env.DRUPAL_USERNAME;
        else process.env.DRUPAL_USERNAME = saved.user;
        if (saved.pass === undefined) delete process.env.DRUPAL_PASSWORD;
        else process.env.DRUPAL_PASSWORD = saved.pass;
      }
    };

    it("get_event returns detail and registration block", async () => {
      mockRequestRaw.mockResolvedValue({
        status: 200,
        data: {
          id: "8504",
          title: "OnDemand Call",
          description: "…",
          start_date: "2026-08-06T13:00:00Z",
          series_id: "398",
          registration: {
            enabled: true,
            capacity: 60,
            seats_remaining: 18,
            already_registered: false,
          },
        },
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: { name: "get_event", arguments: { eventinstance_id: "8504" } },
        })
      );
      expect(mockRequestRaw).toHaveBeenCalledWith(
        "actor@example.com",
        "GET",
        "/api/2.3/events/8504"
      );
      const body = JSON.parse(result.content[0].text);
      expect(body.id).toBe("8504");
      expect(body.registration.enabled).toBe(true);
      expect(body.registration.seats_remaining).toBe(18);
    });

    it("get_event surfaces capacity_type/capacity/seats_remaining", async () => {
      mockRequestRaw.mockResolvedValue({
        status: 200,
        data: {
          id: "7807",
          title: "X",
          registration: { enabled: true, capacity_type: "limited", capacity: 60, seats_remaining: 12 },
        },
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: { name: "get_event", arguments: { eventinstance_id: "7807" } },
        })
      );
      const body = JSON.parse(result.content[0].text);
      expect(body.registration.capacity_type).toBe("limited");
      expect(body.registration.capacity).toBe(60);
      expect(body.registration.seats_remaining).toBe(12);
    });

    it("get_event computes registration_path=native and relocates the external url", async () => {
      mockRequestRaw.mockResolvedValue({
        status: 200,
        data: {
          id: "7807",
          title: "X",
          registration: { enabled: true },
          registration_url: "http://example.com/ext",
        },
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: { name: "get_event", arguments: { eventinstance_id: "7807" } },
        })
      );
      const body = JSON.parse(result.content[0].text);
      expect(body.registration_path).toBe("native");
      expect(body.external_registration_url).toBe("http://example.com/ext");
      expect(body.registration_url).toBeUndefined();
    });

    it("get_event computes registration_path=external when native is off and an external url exists", async () => {
      mockRequestRaw.mockResolvedValue({
        status: 200,
        data: {
          id: "7808",
          title: "Y",
          registration: { enabled: false },
          registration_url: "http://example.com/ext",
        },
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: { name: "get_event", arguments: { eventinstance_id: "7808" } },
        })
      );
      const body = JSON.parse(result.content[0].text);
      expect(body.registration_path).toBe("external");
      expect(body.registration_url).toBe("http://example.com/ext");
      expect(body.external_registration_url).toBeUndefined();
    });

    it("get_event computes registration_path=none when neither native nor external is available", async () => {
      mockRequestRaw.mockResolvedValue({
        status: 200,
        data: {
          id: "7809",
          title: "Z",
          registration: { enabled: false },
        },
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: { name: "get_event", arguments: { eventinstance_id: "7809" } },
        })
      );
      const body = JSON.parse(result.content[0].text);
      expect(body.registration_path).toBe("none");
      expect(body.external_registration_url).toBeUndefined();
    });

    it("get_event maps a 404 to a first-class error (no throw)", async () => {
      mockRequestRaw.mockResolvedValue({
        status: 404,
        data: { error: "not_found" },
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: { name: "get_event", arguments: { eventinstance_id: "9999" } },
        })
      );
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/No event found with id 9999/i);
    });

    it("get_event maps a redirect (stale session) to an auth-expired error, not raw HTML", async () => {
      // A stale session makes Drupal 3xx-redirect to CILogon; with maxRedirects:0
      // the client returns the 3xx (not a followed-to-HTML fake 200). The tool must
      // surface a clear auth error, never the login page.
      mockRequestRaw.mockResolvedValue({
        status: 307,
        data: "<!DOCTYPE html><html>…redirect…</html>",
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: { name: "get_event", arguments: { eventinstance_id: "9174" } },
        })
      );
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/authentication|session|re-authenticate/i);
      expect(result.content[0].text).not.toMatch(/DOCTYPE|<html/i);
    });

    it("get_event maps an unexpected upstream status to a coded upstream_error", async () => {
      mockRequestRaw.mockResolvedValue({ status: 500, data: { error: "boom" } });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: { name: "get_event", arguments: { eventinstance_id: "8504" } },
        })
      );
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Events service error \(500\)/i);
      expect(JSON.parse(result.content[0].text)).toMatchObject({ code: "upstream_error" });
    });

    it("get_event errors without an eventinstance_id and never calls the service", async () => {
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: { name: "get_event", arguments: {} },
        })
      );
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/eventinstance_id is required/i);
      expect(mockRequestRaw).not.toHaveBeenCalled();
    });
  });

  describe("register_for_event", () => {
    const withDrupalEnv = async (
      fn: () => Promise<{ content: { text: string }[]; isError?: boolean }>
    ) => {
      const saved = {
        url: process.env.DRUPAL_API_URL,
        user: process.env.DRUPAL_USERNAME,
        pass: process.env.DRUPAL_PASSWORD,
      };
      try {
        process.env.DRUPAL_API_URL = "https://drupal.example";
        process.env.DRUPAL_USERNAME = "svc";
        process.env.DRUPAL_PASSWORD = "pw";
        return await requestContextStorage.run(
          { actingUser: "actor@example.com" } as RequestContext,
          fn
        );
      } finally {
        if (saved.url === undefined) delete process.env.DRUPAL_API_URL;
        else process.env.DRUPAL_API_URL = saved.url;
        if (saved.user === undefined) delete process.env.DRUPAL_USERNAME;
        else process.env.DRUPAL_USERNAME = saved.user;
        if (saved.pass === undefined) delete process.env.DRUPAL_PASSWORD;
        else process.env.DRUPAL_PASSWORD = saved.pass;
      }
    };

    it("register preview maps outcome_if_confirmed to the write envelope", async () => {
      mockRequestRaw.mockResolvedValue({
        status: 200,
        data: { outcome_if_confirmed: "seat", already_registered: false, seats_remaining: 18 },
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: { name: "register_for_event", arguments: { eventinstance_id: "5" } },
        })
      );
      expect(JSON.parse(result.content[0].text)).toMatchObject({
        action: "register",
        status: "preview",
        executed: false,
        data: { outcome_if_confirmed: "seat" },
      });
      // Verify a no-write preview was requested: the tool sent confirmed:false.
      expect(mockRequestRaw).toHaveBeenCalledWith(
        "actor@example.com",
        "POST",
        "/api/1.0/events/5/register",
        { confirmed: false }
      );
    });

    it("register preview surfaces waitlisted_count when present", async () => {
      mockRequestRaw.mockResolvedValue({
        status: 200,
        data: { outcome_if_confirmed: "waitlist", already_registered: false, waitlisted_count: 3 },
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: { name: "register_for_event", arguments: { eventinstance_id: "5" } },
        })
      );
      expect(JSON.parse(result.content[0].text)).toMatchObject({
        action: "register",
        status: "preview",
        executed: false,
        data: { outcome_if_confirmed: "waitlist", waitlisted_count: 3 },
      });
    });

    it("register commit registered maps to executed write envelope", async () => {
      mockRequestRaw.mockResolvedValue({
        status: 200,
        data: { success: true, status: "registered", registrant_id: "u-123" },
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "register_for_event",
            arguments: { eventinstance_id: "5", confirmed: true },
          },
        })
      );
      expect(mockRequestRaw).toHaveBeenCalledWith(
        "actor@example.com",
        "POST",
        "/api/1.0/events/5/register",
        { confirmed: true }
      );
      expect(JSON.parse(result.content[0].text)).toMatchObject({
        action: "register",
        status: "registered",
        executed: true,
        data: { registrant_id: "u-123" },
      });
    });

    it("register commit waitlisted maps to executed write envelope", async () => {
      mockRequestRaw.mockResolvedValue({
        status: 200,
        data: { success: true, status: "waitlisted", registrant_id: "u-2" },
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "register_for_event",
            arguments: { eventinstance_id: "5", confirmed: true },
          },
        })
      );
      expect(JSON.parse(result.content[0].text)).toMatchObject({
        action: "register",
        status: "waitlisted",
        executed: true,
        data: { registrant_id: "u-2" },
      });
    });

    it("register 409 already_registered is a terminal status, not an error", async () => {
      mockRequestRaw.mockResolvedValue({
        status: 409,
        data: { error: "already_registered", message: "You are already registered." },
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "register_for_event",
            arguments: { eventinstance_id: "5", confirmed: true },
          },
        })
      );
      // already_registered is a first-class result, NOT an errorResponse.
      expect(result.isError).toBeUndefined();
      expect(JSON.parse(result.content[0].text)).toMatchObject({
        action: "register",
        status: "already_registered",
        executed: false,
      });
    });

    it("register 409 event_full is an error with a code", async () => {
      mockRequestRaw.mockResolvedValue({
        status: 409,
        data: { error: "event_full", message: "full" },
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "register_for_event",
            arguments: { eventinstance_id: "5", confirmed: true },
          },
        })
      );
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text)).toMatchObject({ code: "event_full" });
    });

    it("register 409 registration_closed is an error carrying the Drupal code", async () => {
      mockRequestRaw.mockResolvedValue({
        status: 409,
        data: { error: "registration_closed", message: "Registration has closed." },
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "register_for_event",
            arguments: { eventinstance_id: "5", confirmed: true },
          },
        })
      );
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text)).toMatchObject({ code: "registration_closed" });
    });

    it("register_for_event maps a bare gate-403 (no not_permitted) to an actionable error", async () => {
      // A 403 from the ActingUserAccess gate (identity/auth failure) has no
      // not_permitted code — it is a genuine auth failure, not a state refusal.
      mockRequestRaw.mockResolvedValue({
        status: 403,
        data: {},
      });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "register_for_event",
            arguments: { eventinstance_id: "5", confirmed: true },
          },
        })
      );
      expect(result.isError).toBe(true); // errorResponse, not a first-class refusal
      expect(JSON.parse(result.content[0].text)).toMatchObject({ code: "auth_required" });
    });

    it("register_for_event maps a 404 to a first-class error", async () => {
      mockRequestRaw.mockResolvedValue({ status: 404, data: { error: "not_found" } });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "register_for_event",
            arguments: { eventinstance_id: "9999", confirmed: true },
          },
        })
      );
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/No event found with id 9999/i);
      expect(JSON.parse(result.content[0].text)).toMatchObject({ code: "not_found" });
    });

    it("register_for_event maps an unexpected upstream status to upstream_error", async () => {
      mockRequestRaw.mockResolvedValue({ status: 500, data: { error: "boom" } });
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "register_for_event",
            arguments: { eventinstance_id: "5", confirmed: true },
          },
        })
      );
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0].text)).toMatchObject({ code: "upstream_error" });
    });

    it("register_for_event errors without an eventinstance_id and never calls the service", async () => {
      const result = await withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: { name: "register_for_event", arguments: {} },
        })
      );
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/eventinstance_id is required/i);
      expect(mockRequestRaw).not.toHaveBeenCalled();
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

    it("maps the daterange 'date' and moderation_state from the JSON:API base entity", async () => {
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
        // jsonapi_views serializes the base eventinstance entity: the date is a
        // daterange field ({value, end_value}, naive UTC), status is the boolean
        // publish flag, and moderation_state carries the real editorial state.
        mockGet.mockResolvedValue({
          data: [
            {
              id: "uuid-1",
              type: "eventinstance--instance",
              attributes: {
                title: "Sage Office Hours",
                date: [{ value: "2026-07-23T20:00:00", end_value: "2026-07-23T21:00:00" }],
                status: false,
                moderation_state: "ready_for_review",
              },
            },
          ],
        });
        const server = new EventsServer();
        const result = await requestContextStorage.run(
          { actingUser: "apasquale@access-ci.org" } as RequestContext,
          () =>
            server["handleToolCall"]({
              method: "tools/call",
              params: { name: "get_my_events", arguments: { limit: 5 } },
            })
        );
        const payload = JSON.parse(
          (result.content[0] as { text: string }).text
        );
        const item = payload.items[0];
        // start_date/end_date come from the daterange, with Z appended so the
        // naive-UTC strings are unambiguous ISO instants.
        expect(item.start_date).toBe("2026-07-23T20:00:00Z");
        expect(item.end_date).toBe("2026-07-23T21:00:00Z");
        // status is the editorial moderation_state, NOT the raw publish boolean.
        expect(item.status).toBe("ready_for_review");
        // the raw publish boolean must not leak back over the mapped status.
        expect(typeof item.status).toBe("string");
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

  // ---------------------------------------------------------------------------
  // Write-contract conformance (Phase 2, Task 5)
  //
  // The core guarantee of the write-contract migration: EVERY write tool emits
  // the exact StandardWriteResponse envelope — {action, status, executed} always
  // present, {data, warning} optional, and NO other top-level key (especially NO
  // legacy `changed`/`success`). Plus the `executed` truth table per status.
  // ---------------------------------------------------------------------------
  describe("write-contract conformance", () => {
    const ALLOWED_KEYS = new Set(["action", "status", "executed", "data", "warning"]);
    const ACTIONS = new Set(["register", "cancel", "create", "update", "delete"]);
    const STATUS_VOCAB = new Set([
      "preview",
      "registered",
      "waitlisted",
      "already_registered",
      "created",
      "updated",
      "deleted",
    ]);

    /**
     * Assert a parsed body is a conformant write envelope: exactly the allowed
     * top-level keys (required ones present, no stray keys), a known action, and
     * a status drawn from the shared vocabulary.
     */
    function assertWriteEnvelope(parsed: Record<string, unknown>) {
      // Exactly the allowed key-set — no stray key (catches a future changed/success regression).
      for (const key of Object.keys(parsed)) {
        expect(ALLOWED_KEYS.has(key)).toBe(true);
      }
      expect(parsed).toHaveProperty("action");
      expect(parsed).toHaveProperty("status");
      expect(parsed).toHaveProperty("executed");
      expect(parsed).not.toHaveProperty("changed");
      expect(parsed).not.toHaveProperty("success");
      expect(ACTIONS.has(parsed.action as string)).toBe(true);
      expect(STATUS_VOCAB.has(parsed.status as string)).toBe(true);
      expect(typeof parsed.executed).toBe("boolean");
    }

    const withDrupalEnv = async (
      fn: () => Promise<{ content: { text: string }[]; isError?: boolean }>
    ) => {
      const saved = {
        url: process.env.DRUPAL_API_URL,
        user: process.env.DRUPAL_USERNAME,
        pass: process.env.DRUPAL_PASSWORD,
      };
      try {
        process.env.DRUPAL_API_URL = "https://drupal.example";
        process.env.DRUPAL_USERNAME = "svc";
        process.env.DRUPAL_PASSWORD = "pw";
        return await requestContextStorage.run(
          { actingUser: "actor@example.com" } as RequestContext,
          fn
        );
      } finally {
        if (saved.url === undefined) delete process.env.DRUPAL_API_URL;
        else process.env.DRUPAL_API_URL = saved.url;
        if (saved.user === undefined) delete process.env.DRUPAL_USERNAME;
        else process.env.DRUPAL_USERNAME = saved.user;
        if (saved.pass === undefined) delete process.env.DRUPAL_PASSWORD;
        else process.env.DRUPAL_PASSWORD = saved.pass;
      }
    };

    const dispatch = (mockData: unknown, mockStatus: number, args: Record<string, unknown>) => {
      mockRequestRaw.mockResolvedValue({ status: mockStatus, data: mockData });
      return withDrupalEnv(() =>
        server["handleToolCall"]({
          method: "tools/call",
          params: { name: "register_for_event", arguments: { eventinstance_id: "5", ...args } },
        })
      );
    };

    // action | scenario | mock (status,data) | args | expected status/executed
    const cases: Array<{
      name: string;
      mockStatus: number;
      mockData: unknown;
      args: Record<string, unknown>;
      status: string;
      executed: boolean;
    }> = [
      {
        name: "register preview",
        mockStatus: 200,
        mockData: { outcome_if_confirmed: "seat", already_registered: false },
        args: {},
        status: "preview",
        executed: false,
      },
      {
        name: "register commit → registered",
        mockStatus: 200,
        mockData: { success: true, status: "registered", registrant_id: "u-1" },
        args: { confirmed: true },
        status: "registered",
        executed: true,
      },
      {
        name: "register commit → waitlisted",
        mockStatus: 200,
        mockData: { success: true, status: "waitlisted", registrant_id: "u-2" },
        args: { confirmed: true },
        status: "waitlisted",
        executed: true,
      },
      {
        name: "register 409 → already_registered",
        mockStatus: 409,
        mockData: { error: "already_registered", message: "You are already registered." },
        args: { confirmed: true },
        status: "already_registered",
        executed: false,
      },
    ];

    for (const c of cases) {
      it(`${c.name} produces a conformant envelope`, async () => {
        const result = await dispatch(c.mockData, c.mockStatus, c.args);
        const parsed = JSON.parse(result.content[0].text);
        assertWriteEnvelope(parsed);
        expect(parsed.action).toBe("register");
        expect(parsed.status).toBe(c.status);
        // Truth table (spec §2.1 rank-5): executed matches per status. NO `changed`.
        expect(parsed.executed).toBe(c.executed);
      });
    }
  });
});

import { compactDescription, isoInstant } from "../server.js";

describe("isoInstant", () => {
  it("appends Z to a naive-UTC daterange string", () => {
    expect(isoInstant("2026-07-23T20:00:00")).toBe("2026-07-23T20:00:00Z");
  });

  it("leaves an already-zoned string untouched", () => {
    expect(isoInstant("2026-07-23T20:00:00Z")).toBe("2026-07-23T20:00:00Z");
    expect(isoInstant("2026-07-23T20:00:00+00:00")).toBe("2026-07-23T20:00:00+00:00");
  });

  it("returns undefined for missing values", () => {
    expect(isoInstant(undefined)).toBeUndefined();
    expect(isoInstant(null)).toBeUndefined();
    expect(isoInstant("")).toBeUndefined();
  });
});

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
