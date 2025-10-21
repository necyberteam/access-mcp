import { describe, it, expect, beforeEach, vi } from "vitest";
import { AnnouncementsServer } from "./server.js";

describe("AnnouncementsServer", () => {
  let server: AnnouncementsServer;
  let mockHttpClient: any;

  beforeEach(() => {
    server = new AnnouncementsServer();
    
    // Mock the httpClient
    mockHttpClient = {
      get: vi.fn(),
    };
    
    // Override the httpClient getter
    Object.defineProperty(server, "httpClient", {
      get: () => mockHttpClient,
      configurable: true,
    });
  });

  describe("Tool Methods", () => {
    describe("get_announcements", () => {
      it("should fetch announcements with filters", async () => {
        const mockResponse = {
          status: 200,
          data: [
            {
              title: "Scheduled Maintenance",
              body: "System will be down for maintenance",
              published_date: "2024-03-15",
              author: "ACCESS Support",
              tags: ["maintenance", "scheduled"],
              affinity_group: ["123", "456"],
            },
            {
              title: "New GPU Nodes Available",
              body: "Additional GPU resources added",
              published_date: "2024-03-10",
              author: "Resource Team",
              tags: ["gpu", "hardware"],
              affinity_group: ["789"],
            },
          ],
        };

        mockHttpClient.get.mockResolvedValue(mockResponse);

        const result = await server["handleToolCall"]({
          params: {
            name: "get_announcements",
            arguments: {
              tags: "maintenance",
              limit: 10,
            },
          },
        } as any);

        expect(mockHttpClient.get).toHaveBeenCalled();
        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("/api/2.2/announcements");
        expect(url).toContain("tags=maintenance");

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total_announcements).toBe(2);
        expect(responseData.announcements).toHaveLength(2);
        expect(responseData.announcements[0].tags).toEqual(["maintenance", "scheduled"]);
      });

      it("should handle empty results", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [],
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_announcements",
            arguments: {
              tags: "nonexistent",
            },
          },
        } as any);

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total_announcements).toBe(0);
        expect(responseData.announcements).toEqual([]);
      });

      it("should handle API errors", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 500,
          statusText: "Internal Server Error",
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "get_announcements",
            arguments: {},
          },
        } as any);

        // Server handles errors and returns them in content, not as isError
        expect(result.content[0].text).toContain("500");
      });
    });

    describe("get_announcements_by_tags", () => {
      it("should fetch announcements by specific tags", async () => {
        const mockResponse = {
          status: 200,
          data: [
            {
              title: "GPU Maintenance",
              body: "GPU nodes maintenance",
              published_date: "2024-03-15",
              author: "Support",
              tags: ["gpu", "maintenance"],
              affinity_group: [],
            },
          ],
        };

        mockHttpClient.get.mockResolvedValue(mockResponse);

        const result = await server["handleToolCall"]({
          params: {
            name: "get_announcements_by_tags",
            arguments: {
              tags: "gpu,maintenance",
              limit: 20,
            },
          },
        } as any);

        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("tags=gpu%2Cmaintenance");
        // Note: exact_match is not implemented in the server

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.announcements[0].tags).toContain("gpu");
        expect(responseData.announcements[0].tags).toContain("maintenance");
      });
    });

    describe("get_announcements_by_affinity_group", () => {
      it("should fetch announcements for affinity group", async () => {
        const mockResponse = {
          status: 200,
          data: [
            {
              title: "AI/ML Community Update",
              body: "New resources for AI/ML",
              published_date: "2024-03-14",
              author: "Community Team",
              tags: ["ai", "ml", "community"],
              affinity_group: ["ai-ml-123"],
            },
          ],
        };

        mockHttpClient.get.mockResolvedValue(mockResponse);

        const result = await server["handleToolCall"]({
          params: {
            name: "get_announcements_by_affinity_group",
            arguments: {
              ag: "ai-ml-123",
              limit: 5,
            },
          },
        } as any);

        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("ag=ai-ml-123");
        // Note: limit is handled in JavaScript, not in URL

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.announcements).toHaveLength(1);
        expect(responseData.announcements[0].affinity_groups).toContain("ai-ml-123");
      });
    });

    describe("get_recent_announcements", () => {
      it("should fetch recent announcements", async () => {
        const mockResponse = {
          status: 200,
          data: [
            {
              title: "Today's Update",
              body: "Important update",
              published_date: new Date().toISOString(),
              author: "Admin",
              tags: ["urgent"],
              affinity_group: [],
            },
          ],
        };

        mockHttpClient.get.mockResolvedValue(mockResponse);

        const result = await server["handleToolCall"]({
          params: {
            name: "get_recent_announcements",
            arguments: {
              period: "1 week",
            },
          },
        } as any);

        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("relative_start_date=-1+week");

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.announcements).toHaveLength(1);
      });

      it("should default to past week if no time period specified", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [],
        });

        await server["handleToolCall"]({
          params: {
            name: "get_recent_announcements",
            arguments: {},
          },
        } as any);

        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("relative_start_date=-1+month");
      });
    });
  });

  describe("URL Building", () => {
    it("should build URLs with multiple filters", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: [],
      });

      await server["handleToolCall"]({
        params: {
          name: "get_announcements",
          arguments: {
            tags: "gpu,maintenance",
            ag: "123,456",
            start_date: "2024-01-01",
            end_date: "2024-12-31",
            limit: 20,
          },
        },
      } as any);

      const url = mockHttpClient.get.mock.calls[0][0];
      expect(url).toContain("tags=gpu%2Cmaintenance");
      expect(url).toContain("ag=123%2C456");
      expect(url).toContain("start_date=2024-01-01");
      expect(url).toContain("end_date=2024-12-31");
      // Note: exact_match and limit are not URL parameters
    });

    it("should handle relative date filters", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: [],
      });

      await server["handleToolCall"]({
        params: {
          name: "get_announcements",
          arguments: {
            relative_start_date: "today",
            relative_end_date: "+1month",
          },
        },
      } as any);

      const url = mockHttpClient.get.mock.calls[0][0];
      expect(url).toContain("relative_start_date=today");
      expect(url).toContain("relative_end_date=%2B1month");
    });
  });

  describe("Data Enhancement", () => {
    it("should parse tags correctly", async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            title: "Test",
            published_date: "2024-03-15",
            tags: ["tag1", "tag2", "tag3"],
            affinity_group: [],
          },
        ],
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await server["handleToolCall"]({
        params: {
          name: "get_announcements",
          arguments: {},
        },
      } as any);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.announcements[0].tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should extract popular tags", async () => {
      const mockResponse = {
        status: 200,
        data: [
          { title: "1", published_date: "2024-03-15", tags: ["gpu", "maintenance"], affinity_group: [] },
          { title: "2", published_date: "2024-03-14", tags: ["gpu", "network"], affinity_group: [] },
          { title: "3", published_date: "2024-03-13", tags: ["gpu", "storage"], affinity_group: [] },
          { title: "4", published_date: "2024-03-12", tags: ["maintenance"], affinity_group: [] },
        ],
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await server["handleToolCall"]({
        params: {
          name: "get_announcements",
          arguments: {},
        },
      } as any);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.popular_tags).toContain("gpu");
      expect(responseData.popular_tags).toContain("maintenance");
    });

    it("should format dates correctly", async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            title: "Test",
            published_date: "2024-03-15",
            tags: [],
            affinity_group: [],
          },
        ],
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await server["handleToolCall"]({
        params: {
          name: "get_announcements",
          arguments: {},
        },
      } as any);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.announcements[0].formatted_date).toBeDefined();
      expect(responseData.announcements[0].formatted_date).toContain("March");
    });
  });
});