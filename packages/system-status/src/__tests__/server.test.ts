import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { SystemStatusServer } from "../server.js";

// Mock axios
vi.mock("axios");

describe("SystemStatusServer", () => {
  let server: SystemStatusServer;
  let mockHttpClient: any;

  const mockCurrentOutagesData = [
    {
      id: "1",
      Subject: "Emergency maintenance on Anvil",
      Content: "Critical issue requiring immediate attention",
      OutageStart: "2024-08-27T10:00:00Z",
      OutageEnd: "2024-08-27T11:00:00Z",
      AffectedResources: [
        { ResourceName: "Anvil", ResourceID: "anvil-1" }
      ]
    },
    {
      id: "2", 
      Subject: "Scheduled maintenance on Bridges-2",
      Content: "Regular maintenance window",
      OutageStart: "2024-08-27T08:00:00Z",
      OutageEnd: "2024-08-27T08:30:00Z",
      AffectedResources: [
        { ResourceName: "Bridges-2", ResourceID: "bridges2-1" }
      ]
    }
  ];

  const mockFutureOutagesData = [
    {
      id: "3",
      Subject: "Scheduled Jetstream maintenance",
      Content: "Planned maintenance",
      OutageStart: "2024-08-30T10:00:00Z",
      OutageEnd: "2024-08-30T14:00:00Z",
      AffectedResources: [
        { ResourceName: "Jetstream", ResourceID: "jetstream-1" }
      ]
    }
  ];

  const mockPastOutagesData = [
    {
      id: "4",
      Subject: "Past maintenance on Stampede3",
      Content: "Completed maintenance",
      OutageStart: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      OutageEnd: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(), // 3 days ago + 6 hours
      OutageType: "Full",
      AffectedResources: [
        { ResourceName: "Stampede3", ResourceID: "stampede3-1" }
      ]
    }
  ];

  beforeEach(() => {
    server = new SystemStatusServer();

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
    it("should initialize with correct server info", () => {
      expect(server).toBeDefined();
      expect(server["serverName"]).toBe("access-mcp-system-status");
      expect(server["version"]).toBe("0.4.0");
      expect(server["baseURL"]).toBe("https://operations-api.access-ci.org");
    });

    it("should provide correct tools", () => {
      const tools = server["getTools"]();
      expect(tools).toHaveLength(5);
      expect(tools.map(t => t.name)).toEqual([
        "get_current_outages",
        "get_scheduled_maintenance", 
        "get_past_outages",
        "get_system_announcements",
        "check_resource_status"
      ]);
    });

    it("should provide correct resources", () => {
      const resources = server["getResources"]();
      expect(resources).toHaveLength(4);
      expect(resources.map(r => r.uri)).toEqual([
        "accessci://system-status",
        "accessci://outages/current",
        "accessci://outages/scheduled",
        "accessci://outages/past"
      ]);
    });
  });

  describe("getCurrentOutages", () => {
    it("should fetch and enhance current outages", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { results: mockCurrentOutagesData }
      });

      const result = await server["handleToolCall"]({
        params: { name: "get_current_outages", arguments: {} }
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/wh2/news/v1/affiliation/access-ci.org/current_outages/"
      );

      const response = JSON.parse(result.content[0].text);
      expect(response.total_outages).toBe(2);
      expect(response.affected_resources).toEqual(["Anvil", "Bridges-2"]);
      expect(response.severity_counts).toHaveProperty("high", 1); // Emergency
      expect(response.severity_counts).toHaveProperty("low", 1);  // Scheduled maintenance
      expect(response.outages[0]).toHaveProperty("severity");
    });

    it("should filter outages by resource", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { results: mockCurrentOutagesData }
      });

      const result = await server["handleToolCall"]({
        params: { 
          name: "get_current_outages", 
          arguments: { resource_filter: "Anvil" } 
        }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.total_outages).toBe(1);
      expect(response.outages[0].Subject).toContain("Anvil");
    });

    it("should categorize severity correctly", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { results: mockCurrentOutagesData }
      });

      const result = await server["handleToolCall"]({
        params: { name: "get_current_outages", arguments: {} }
      });

      const response = JSON.parse(result.content[0].text);
      const emergencyOutage = response.outages.find((o: any) => o.Subject.includes("Emergency"));
      const maintenanceOutage = response.outages.find((o: any) => o.Subject.includes("Scheduled"));
      
      expect(emergencyOutage.severity).toBe("high");
      expect(maintenanceOutage.severity).toBe("low");
    });
  });

  describe("getScheduledMaintenance", () => {
    it("should fetch and enhance scheduled maintenance", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { results: mockFutureOutagesData }
      });

      const result = await server["handleToolCall"]({
        params: { name: "get_scheduled_maintenance", arguments: {} }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.total_scheduled).toBe(1);
      expect(response.affected_resources).toEqual(["Jetstream"]);
      expect(response.maintenance[0]).toHaveProperty("hours_until_start");
      expect(response.maintenance[0]).toHaveProperty("duration_hours", 4); // 10am to 2pm = 4 hours
      expect(response.maintenance[0]).toHaveProperty("has_scheduled_time", true);
    });

    it("should handle missing scheduled times", async () => {
      const dataWithoutSchedule = [{
        ...mockFutureOutagesData[0],
        OutageStart: null,
        OutageEnd: null
      }];

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { results: dataWithoutSchedule }
      });

      const result = await server["handleToolCall"]({
        params: { name: "get_scheduled_maintenance", arguments: {} }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.maintenance[0].has_scheduled_time).toBe(false);
      expect(response.maintenance[0].duration_hours).toBe(null);
    });

    it("should sort by scheduled start time", async () => {
      const multipleMaintenanceData = [
        {
          ...mockFutureOutagesData[0],
          OutageStart: "2024-08-31T10:00:00Z", // Later
          Subject: "Later maintenance"
        },
        {
          ...mockFutureOutagesData[0], 
          OutageStart: "2024-08-30T10:00:00Z", // Earlier
          Subject: "Earlier maintenance"
        }
      ];

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { results: multipleMaintenanceData }
      });

      const result = await server["handleToolCall"]({
        params: { name: "get_scheduled_maintenance", arguments: {} }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.maintenance[0].Subject).toBe("Earlier maintenance");
      expect(response.maintenance[1].Subject).toBe("Later maintenance");
    });
  });

  describe("getPastOutages", () => {
    it("should fetch and enhance past outages", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { results: mockPastOutagesData }
      });

      const result = await server["handleToolCall"]({
        params: { name: "get_past_outages", arguments: {} }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.total_past_outages).toBe(1);
      expect(response.outage_types).toEqual(["Full"]);
      expect(response.average_duration_hours).toBe(6); // 6 hour duration
      expect(response.outages[0]).toHaveProperty("duration_hours", 6);
      expect(response.outages[0]).toHaveProperty("days_ago");
    });

    it("should apply limit correctly", async () => {
      const manyOutages = Array(50).fill(0).map((_, i) => ({
        ...mockPastOutagesData[0],
        id: `past-${i}`,
        Subject: `Past outage ${i}`
      }));

      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { results: manyOutages }
      });

      const result = await server["handleToolCall"]({
        params: { 
          name: "get_past_outages", 
          arguments: { limit: 10 } 
        }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.outages).toHaveLength(10);
    });
  });

  describe("getSystemAnnouncements", () => {
    it("should combine current, future, and recent past outages", async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({ status: 200, data: { results: mockCurrentOutagesData } })
        .mockResolvedValueOnce({ status: 200, data: { results: mockFutureOutagesData } })
        .mockResolvedValueOnce({ status: 200, data: { results: mockPastOutagesData } });

      const result = await server["handleToolCall"]({
        params: { name: "get_system_announcements", arguments: {} }
      });

      expect(mockHttpClient.get).toHaveBeenCalledTimes(3);
      
      const response = JSON.parse(result.content[0].text);
      expect(response.current_outages).toBe(2);
      expect(response.scheduled_maintenance).toBe(1);
      expect(response.recent_past_outages).toBe(1); // Within 30 days
      expect(response.categories).toHaveProperty("current");
      expect(response.categories).toHaveProperty("scheduled");
      expect(response.categories).toHaveProperty("recent_past");
    });

    it("should prioritize current outages in sorting", async () => {
      mockHttpClient.get
        .mockResolvedValueOnce({ status: 200, data: { results: mockCurrentOutagesData } })
        .mockResolvedValueOnce({ status: 200, data: { results: mockFutureOutagesData } })
        .mockResolvedValueOnce({ status: 200, data: { results: mockPastOutagesData } });

      const result = await server["handleToolCall"]({
        params: { name: "get_system_announcements", arguments: {} }
      });

      const response = JSON.parse(result.content[0].text);
      const firstAnnouncement = response.announcements[0];
      expect(firstAnnouncement.category).toBe("current");
    });
  });

  describe("checkResourceStatus", () => {
    it("should check resource status efficiently (direct method)", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { results: mockCurrentOutagesData }
      });

      const result = await server["handleToolCall"]({
        params: { 
          name: "check_resource_status", 
          arguments: { resource_ids: ["anvil-1", "unknown-resource"] } 
        }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.api_method).toBe("direct_outages_check");
      expect(response.resources_checked).toBe(2);
      expect(response.operational).toBe(1); // unknown-resource
      expect(response.affected).toBe(1);    // anvil-1
      
      const anvilStatus = response.resource_status.find((r: any) => r.resource_id === "anvil-1");
      expect(anvilStatus.status).toBe("affected");
      expect(anvilStatus.severity).toBe("high"); // Emergency maintenance
    });

    it("should use group API when requested", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { results: [] } // No outages for this group
      });

      const result = await server["handleToolCall"]({
        params: { 
          name: "check_resource_status", 
          arguments: { 
            resource_ids: ["anvil"], 
            use_group_api: true 
          } 
        }
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith("/wh2/news/v1/info_groupid/anvil/");
      
      const response = JSON.parse(result.content[0].text);
      expect(response.api_method).toBe("resource_group_api");
      expect(response.resource_status[0].status).toBe("operational");
      expect(response.resource_status[0].api_method).toBe("group_specific");
    });

    it("should handle group API failures gracefully", async () => {
      mockHttpClient.get.mockRejectedValue(new Error("API Error"));

      const result = await server["handleToolCall"]({
        params: { 
          name: "check_resource_status", 
          arguments: { 
            resource_ids: ["invalid-resource"], 
            use_group_api: true 
          } 
        }
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.unknown).toBe(1);
      expect(response.resource_status[0].status).toBe("unknown");
      expect(response.resource_status[0].api_method).toBe("group_specific_failed");
      expect(response.resource_status[0]).toHaveProperty("error");
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 500,
        statusText: "Internal Server Error"
      });

      const result = await server["handleToolCall"]({
        params: { name: "get_current_outages", arguments: {} }
      });

      expect(result.content[0].text).toContain("Error");
    });

    it("should handle network errors", async () => {
      mockHttpClient.get.mockRejectedValue(new Error("Network error"));

      const result = await server["handleToolCall"]({
        params: { name: "get_current_outages", arguments: {} }
      });

      expect(result.content[0].text).toContain("Error");
    });

    it("should handle unknown tools", async () => {
      const result = await server["handleToolCall"]({
        params: { name: "unknown_tool", arguments: {} }
      });

      expect(result.content[0].text).toContain("Unknown tool");
    });
  });

  describe("Resource Handling", () => {
    it("should handle resource reads correctly", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: { results: mockCurrentOutagesData }
      });

      const result = await server["handleResourceRead"]({
        params: { uri: "accessci://outages/current" }
      });

      expect(result.contents[0].mimeType).toBe("application/json");
      expect(result.contents[0].text).toBeDefined();
    });

    it("should handle unknown resources", async () => {
      await expect(async () => {
        await server["handleResourceRead"]({
          params: { uri: "accessci://unknown" }
        });
      }).rejects.toThrow("Unknown resource");
    });
  });
});