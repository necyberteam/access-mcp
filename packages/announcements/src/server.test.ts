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
    describe("search_announcements", () => {
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
            name: "search_announcements",
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
        expect(responseData.total).toBe(2);
        expect(responseData.items).toHaveLength(2);
        expect(responseData.items[0].tags).toEqual(["maintenance", "scheduled"]);
      });

      it("should handle empty results", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [],
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_announcements",
            arguments: {
              tags: "nonexistent",
            },
          },
        } as any);

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.total).toBe(0);
        expect(responseData.items).toEqual([]);
      });

      it("should handle API errors", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 500,
          statusText: "Internal Server Error",
        });

        const result = await server["handleToolCall"]({
          params: {
            name: "search_announcements",
            arguments: {},
          },
        } as any);

        // Server handles errors and returns them in content, not as isError
        expect(result.content[0].text).toContain("500");
      });
    });

    describe("search by tags", () => {
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
            name: "search_announcements",
            arguments: {
              tags: "gpu,maintenance",
              limit: 20,
            },
          },
        } as any);

        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("tags=gpu%2Cmaintenance");

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.items[0].tags).toContain("gpu");
        expect(responseData.items[0].tags).toContain("maintenance");
      });
    });

    describe("search with limit", () => {
      it("should respect limit parameter", async () => {
        const mockResponse = {
          status: 200,
          data: [
            {
              title: "Update 1",
              body: "Body 1",
              published_date: "2024-03-14",
              tags: ["ai"],
              affinity_group: [],
            },
          ],
        };

        mockHttpClient.get.mockResolvedValue(mockResponse);

        const result = await server["handleToolCall"]({
          params: {
            name: "search_announcements",
            arguments: {
              limit: 5,
            },
          },
        } as any);

        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("items_per_page=5");

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.items).toHaveLength(1);
      });
    });

    describe("recent announcements with date filters", () => {
      it("should fetch announcements with date filter", async () => {
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
            name: "search_announcements",
            arguments: {
              date: "this_week",
            },
          },
        } as any);

        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("relative_start_date=-1+week");

        const responseData = JSON.parse(result.content[0].text);
        expect(responseData.items).toHaveLength(1);
      });

      it("should handle search with no date filter", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [],
        });

        await server["handleToolCall"]({
          params: {
            name: "search_announcements",
            arguments: {},
          },
        } as any);

        expect(mockHttpClient.get).toHaveBeenCalled();
        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("/api/2.2/announcements");
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
          name: "search_announcements",
          arguments: {
            tags: "gpu,maintenance",
            date: "this_month",
            limit: 20,
          },
        },
      } as any);

      const url = mockHttpClient.get.mock.calls[0][0];
      expect(url).toContain("tags=gpu%2Cmaintenance");
      expect(url).toContain("relative_start_date=-1+month");
    });

    it("should handle date filters", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: [],
      });

      await server["handleToolCall"]({
        params: {
          name: "search_announcements",
          arguments: {
            date: "today",
          },
        },
      } as any);

      const url = mockHttpClient.get.mock.calls[0][0];
      expect(url).toContain("relative_start_date=today");
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
          name: "search_announcements",
          arguments: {},
        },
      } as any);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.items[0].tags).toEqual(["tag1", "tag2", "tag3"]);
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
          name: "search_announcements",
          arguments: {},
        },
      } as any);

      const responseData = JSON.parse(result.content[0].text);
      // Popular tags are in metadata, not in the universal {total, items} format
      expect(responseData.items).toHaveLength(4);
    });

    it("should include published_date in items", async () => {
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
          name: "search_announcements",
          arguments: {},
        },
      } as any);

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.items[0].published_date).toBe("2024-03-15");
    });
  });
});