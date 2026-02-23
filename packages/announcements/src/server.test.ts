import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import { AnnouncementsServer } from "./server.js";
import { DrupalAuthProvider, requestContextStorage, RequestContext } from "@access-mcp/shared";

// Mock the DrupalAuthProvider
vi.mock("@access-mcp/shared", async () => {
  const actual = await vi.importActual("@access-mcp/shared");
  return {
    ...actual,
    DrupalAuthProvider: vi.fn().mockImplementation(() => ({
      ensureAuthenticated: vi.fn().mockResolvedValue(undefined),
      getUserUuid: vi.fn().mockReturnValue("user-uuid-123"),
      setActingUser: vi.fn(),
      getActingUser: vi.fn(),
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    })),
  };
});

interface MockHttpClient {
  get: Mock<(url: string) => Promise<{ status: number; data?: unknown; statusText?: string }>>;
}

interface TextContent {
  type: "text";
  text: string;
}

describe("AnnouncementsServer", () => {
  let server: AnnouncementsServer;
  let mockHttpClient: MockHttpClient;

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
          method: "tools/call",
          params: {
            name: "search_announcements",
            arguments: {
              tags: "maintenance",
              limit: 10,
            },
          },
        });

        expect(mockHttpClient.get).toHaveBeenCalled();
        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("/api/2.2/announcements");
        expect(url).toContain("tags=maintenance");

        const responseData = JSON.parse((result.content[0] as TextContent).text);
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
          method: "tools/call",
          params: {
            name: "search_announcements",
            arguments: {
              tags: "nonexistent",
            },
          },
        });

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.total).toBe(0);
        expect(responseData.items).toEqual([]);
      });

      it("should handle API errors", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 500,
          statusText: "Internal Server Error",
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_announcements",
            arguments: {},
          },
        });

        // Server handles errors and returns them in content, not as isError
        expect((result.content[0] as TextContent).text).toContain("500");
      });
    });

    describe("search with query parameter", () => {
      it("should include search_api_fulltext in URL", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [],
        });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_announcements",
            arguments: {
              query: "GPU computing",
            },
          },
        });

        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("search_api_fulltext=GPU+computing");
      });

      it("should combine query with other filters", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [],
        });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_announcements",
            arguments: {
              query: "workshop",
              tags: "training",
              date: "this_month",
            },
          },
        });

        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("search_api_fulltext=workshop");
        expect(url).toContain("tags=training");
        expect(url).toContain("relative_start_date=-1+month");
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
          method: "tools/call",
          params: {
            name: "search_announcements",
            arguments: {
              tags: "gpu,maintenance",
              limit: 20,
            },
          },
        });

        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("tags=gpu%2Cmaintenance");

        const responseData = JSON.parse((result.content[0] as TextContent).text);
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
          method: "tools/call",
          params: {
            name: "search_announcements",
            arguments: {
              limit: 5,
            },
          },
        });

        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("items_per_page=5");

        const responseData = JSON.parse((result.content[0] as TextContent).text);
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
          method: "tools/call",
          params: {
            name: "search_announcements",
            arguments: {
              date: "this_week",
            },
          },
        });

        const url = mockHttpClient.get.mock.calls[0][0];
        expect(url).toContain("relative_start_date=-1+week");

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.items).toHaveLength(1);
      });

      it("should handle search with no date filter", async () => {
        mockHttpClient.get.mockResolvedValue({
          status: 200,
          data: [],
        });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "search_announcements",
            arguments: {},
          },
        });

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
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {
            tags: "gpu,maintenance",
            date: "this_month",
            limit: 20,
          },
        },
      });

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
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {
            date: "today",
          },
        },
      });

      const url = mockHttpClient.get.mock.calls[0][0];
      expect(url).toContain("relative_start_date=today");
    });
  });

  describe("Data Enhancement", () => {
    it("should parse tags array correctly", async () => {
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
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {},
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.items[0].tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should parse tags from comma-separated string", async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            title: "Test",
            published_date: "2024-03-15",
            tags: "gpu, machine-learning, hpc",
            affinity_group: [],
          },
        ],
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {},
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.items[0].tags).toEqual(["gpu", "machine-learning", "hpc"]);
    });

    it("should handle empty tags string", async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            title: "Test",
            published_date: "2024-03-15",
            tags: "",
            affinity_group: [],
          },
        ],
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {},
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.items[0].tags).toEqual([]);
    });

    it("should extract popular tags", async () => {
      const mockResponse = {
        status: 200,
        data: [
          {
            title: "1",
            published_date: "2024-03-15",
            tags: ["gpu", "maintenance"],
            affinity_group: [],
          },
          {
            title: "2",
            published_date: "2024-03-14",
            tags: ["gpu", "network"],
            affinity_group: [],
          },
          {
            title: "3",
            published_date: "2024-03-13",
            tags: ["gpu", "storage"],
            affinity_group: [],
          },
          { title: "4", published_date: "2024-03-12", tags: ["maintenance"], affinity_group: [] },
        ],
      };

      mockHttpClient.get.mockResolvedValue(mockResponse);

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {},
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
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
        method: "tools/call",
        params: {
          name: "search_announcements",
          arguments: {},
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.items[0].published_date).toBe("2024-03-15");
    });
  });

  describe("CRUD Operations", () => {
    let mockDrupalAuth: {
      ensureAuthenticated: Mock;
      getUserUuid: Mock;
      setActingUser: Mock;
      getActingUser: Mock;
      get: Mock;
      post: Mock;
      patch: Mock;
      delete: Mock;
    };

    beforeEach(() => {
      // Set up environment variables for CRUD operations
      process.env.DRUPAL_API_URL = "https://test.drupal.site";
      process.env.DRUPAL_USERNAME = "test_user";
      process.env.DRUPAL_PASSWORD = "test_password";
      process.env.ACTING_USER = "testuser@access-ci.org";

      // Create a fresh mock for each test
      mockDrupalAuth = {
        ensureAuthenticated: vi.fn().mockResolvedValue(undefined),
        getUserUuid: vi.fn().mockReturnValue("user-uuid-123"),
        setActingUser: vi.fn(),
        getActingUser: vi.fn(),
        get: vi.fn(),
        post: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
      };

      // Mock the DrupalAuthProvider constructor to return our mock
      (DrupalAuthProvider as unknown as Mock).mockImplementation(() => mockDrupalAuth);
    });

    afterEach(() => {
      delete process.env.DRUPAL_API_URL;
      delete process.env.DRUPAL_USERNAME;
      delete process.env.DRUPAL_PASSWORD;
      delete process.env.ACTING_USER;
    });

    describe("create_announcement", () => {
      it("should create an announcement with required fields", async () => {
        mockDrupalAuth.post.mockResolvedValue({
          data: {
            id: "new-announcement-uuid",
            attributes: {
              title: "Test Announcement",
              drupal_internal__nid: 12345,
            },
          },
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "create_announcement",
            arguments: {
              title: "Test Announcement",
              body: "<p>This is a test</p>",
              summary: "Test summary",
            },
          },
        });

        expect(mockDrupalAuth.post).toHaveBeenCalledWith(
          "/jsonapi/node/access_news",
          expect.objectContaining({
            data: expect.objectContaining({
              type: "node--access_news",
              attributes: expect.objectContaining({
                title: "Test Announcement",
                moderation_state: "draft",
                body: expect.objectContaining({
                  value: "<p>This is a test</p>",
                  format: "basic_html",
                  summary: "Test summary",
                }),
              }),
            }),
          })
        );

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.success).toBe(true);
        expect(responseData.uuid).toBe("new-announcement-uuid");
      });

      it("should look up tags by name when provided (with caching)", async () => {
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [
            { id: "tag-uuid-1", attributes: { name: "gpu" } },
            { id: "tag-uuid-2", attributes: { name: "maintenance" } },
            { id: "tag-uuid-3", attributes: { name: "hpc" } },
          ],
        });

        mockDrupalAuth.post.mockResolvedValue({
          data: {
            id: "new-announcement-uuid",
            attributes: { title: "Test" },
          },
        });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "create_announcement",
            arguments: {
              title: "Test",
              body: "Body",
              summary: "Summary",
              tags: ["gpu", "maintenance"],
            },
          },
        });

        expect(mockDrupalAuth.get).toHaveBeenCalledWith(
          "/jsonapi/taxonomy_term/tags?page[limit]=500"
        );

        expect(mockDrupalAuth.post).toHaveBeenCalledWith(
          "/jsonapi/node/access_news",
          expect.objectContaining({
            data: expect.objectContaining({
              relationships: expect.objectContaining({
                field_tags: {
                  data: [
                    { type: "taxonomy_term--tags", id: "tag-uuid-1" },
                    { type: "taxonomy_term--tags", id: "tag-uuid-2" },
                  ],
                },
              }),
            }),
          })
        );
      });

      it("should fail without credentials", async () => {
        delete process.env.DRUPAL_API_URL;

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "create_announcement",
            arguments: {
              title: "Test",
              body: "Body",
            },
          },
        });

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.error).toContain("DRUPAL_API_URL");
      });

      it("should fail without ACTING_USER", async () => {
        delete process.env.ACTING_USER;

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "get_my_announcements",
            arguments: {},
          },
        });

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.error).toContain("No acting user specified");
      });

      it("should use actingUser from request context when env var not set", async () => {
        delete process.env.ACTING_USER;

        mockDrupalAuth.post.mockResolvedValue({
          data: {
            id: "new-announcement-uuid",
            attributes: {
              title: "Test",
              drupal_internal__nid: 12345,
            },
          },
        });

        const context: RequestContext = {
          actingUser: "contextuser@access-ci.org",
        };

        const result = await requestContextStorage.run(context, async () => {
          return server["handleToolCall"]({
            method: "tools/call",
            params: {
              name: "create_announcement",
              arguments: {
                title: "Test",
                body: "Body",
                summary: "Summary",
              },
            },
          });
        });

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.success).toBe(true);
      });

      it("should prefer request context actingUser over env var", async () => {
        process.env.ACTING_USER = "envuser@access-ci.org";

        mockDrupalAuth.post.mockResolvedValue({
          data: {
            id: "new-announcement-uuid",
            attributes: { title: "Test" },
          },
        });

        const context: RequestContext = {
          actingUser: "contextuser@access-ci.org",
        };

        await requestContextStorage.run(context, async () => {
          return server["handleToolCall"]({
            method: "tools/call",
            params: {
              name: "create_announcement",
              arguments: {
                title: "Test",
                body: "Body",
                summary: "Summary",
              },
            },
          });
        });

        // Should have called setActingUser with the context value, not env var
        expect(mockDrupalAuth.setActingUser).toHaveBeenCalledWith("contextuser@access-ci.org");
      });

      it("should set actingUser on DrupalAuth from request context", async () => {
        const context: RequestContext = {
          actingUser: "researcher@access-ci.org",
        };

        mockDrupalAuth.post.mockResolvedValue({
          data: {
            id: "new-announcement-uuid",
            attributes: { title: "Test" },
          },
        });

        await requestContextStorage.run(context, async () => {
          return server["handleToolCall"]({
            method: "tools/call",
            params: {
              name: "create_announcement",
              arguments: {
                title: "Test",
                body: "Body",
                summary: "Summary",
              },
            },
          });
        });

        expect(mockDrupalAuth.setActingUser).toHaveBeenCalledWith("researcher@access-ci.org");
      });

      it("should create announcement with external link", async () => {
        mockDrupalAuth.post.mockResolvedValue({
          data: {
            id: "new-announcement-uuid",
            attributes: {
              title: "Test with Link",
              drupal_internal__nid: 12345,
            },
          },
        });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "create_announcement",
            arguments: {
              title: "Test with Link",
              body: "<p>Body content</p>",
              summary: "Test summary",
              external_link: {
                uri: "https://example.com/resource",
                title: "Learn more",
              },
            },
          },
        });

        expect(mockDrupalAuth.post).toHaveBeenCalledWith(
          "/jsonapi/node/access_news",
          expect.objectContaining({
            data: expect.objectContaining({
              attributes: expect.objectContaining({
                field_news_external_link: {
                  uri: "https://example.com/resource",
                  title: "Learn more",
                },
              }),
            }),
          })
        );
      });

      it("should create announcement with where_to_share", async () => {
        mockDrupalAuth.post.mockResolvedValue({
          data: {
            id: "new-announcement-uuid",
            attributes: {
              title: "Test with sharing",
              drupal_internal__nid: 12345,
            },
          },
        });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "create_announcement",
            arguments: {
              title: "Test with sharing",
              body: "<p>Body content</p>",
              summary: "Test summary",
              where_to_share: ["Announcements page", "Bi-Weekly Digest"],
            },
          },
        });

        expect(mockDrupalAuth.post).toHaveBeenCalledWith(
          "/jsonapi/node/access_news",
          expect.objectContaining({
            data: expect.objectContaining({
              attributes: expect.objectContaining({
                field_choose_where_to_share_this: [
                  "on_the_announcements_page",
                  "in_the_access_support_bi_weekly_digest",
                ],
              }),
            }),
          })
        );
      });

      it("should fail with invalid where_to_share value", async () => {
        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "create_announcement",
            arguments: {
              title: "Test",
              body: "Body",
              summary: "Summary",
              where_to_share: ["Invalid Option"],
            },
          },
        });

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.error).toContain("Invalid where_to_share value");
      });

      it("should create announcement with affinity group", async () => {
        // Affinity group lookup by title (first by field_group_id returns empty, then by title)
        mockDrupalAuth.get.mockResolvedValueOnce({ data: [] });
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [{ id: "group-uuid-456", attributes: { title: "Test Group" } }],
        });

        mockDrupalAuth.post.mockResolvedValue({
          data: {
            id: "new-announcement-uuid",
            attributes: {
              title: "Test with group",
              drupal_internal__nid: 12345,
            },
          },
        });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "create_announcement",
            arguments: {
              title: "Test with group",
              body: "<p>Body content</p>",
              summary: "Test summary",
              affinity_group: "Test Group",
            },
          },
        });

        expect(mockDrupalAuth.post).toHaveBeenCalledWith(
          "/jsonapi/node/access_news",
          expect.objectContaining({
            data: expect.objectContaining({
              relationships: expect.objectContaining({
                field_affinity_group_node: {
                  data: {
                    type: "node--affinity_group",
                    id: "group-uuid-456",
                  },
                },
              }),
            }),
          })
        );
      });

      it("should fail when affinity group not found", async () => {
        // Both lookups return empty
        mockDrupalAuth.get.mockResolvedValueOnce({ data: [] });
        mockDrupalAuth.get.mockResolvedValueOnce({ data: [] });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "create_announcement",
            arguments: {
              title: "Test",
              body: "Body",
              summary: "Summary",
              affinity_group: "Nonexistent Group",
            },
          },
        });

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.error).toContain("Affinity group not found");
      });
    });

    describe("update_announcement", () => {
      it("should update an announcement", async () => {
        mockDrupalAuth.patch.mockResolvedValue({
          data: {
            id: "announcement-uuid",
            attributes: { title: "Updated Title" },
          },
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "update_announcement",
            arguments: {
              uuid: "announcement-uuid",
              title: "Updated Title",
            },
          },
        });

        expect(mockDrupalAuth.patch).toHaveBeenCalledWith(
          "/jsonapi/node/access_news/announcement-uuid",
          expect.objectContaining({
            data: expect.objectContaining({
              id: "announcement-uuid",
              attributes: expect.objectContaining({
                title: "Updated Title",
              }),
            }),
          })
        );

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.success).toBe(true);
      });

      it("should preserve existing body when updating summary only", async () => {
        // First call: fetch existing announcement
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: {
            attributes: {
              body: {
                value: "<p>Existing body content</p>",
                summary: "Old summary",
              },
            },
          },
        });

        mockDrupalAuth.patch.mockResolvedValue({
          data: {
            id: "announcement-uuid",
            attributes: { title: "Test" },
          },
        });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "update_announcement",
            arguments: {
              uuid: "announcement-uuid",
              summary: "New summary only",
            },
          },
        });

        expect(mockDrupalAuth.patch).toHaveBeenCalledWith(
          "/jsonapi/node/access_news/announcement-uuid",
          expect.objectContaining({
            data: expect.objectContaining({
              attributes: expect.objectContaining({
                body: {
                  value: "<p>Existing body content</p>",
                  format: "basic_html",
                  summary: "New summary only",
                },
              }),
            }),
          })
        );
      });

      it("should update with tags", async () => {
        // Tag cache fetch
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [
            { id: "tag-uuid-1", attributes: { name: "gpu" } },
            { id: "tag-uuid-2", attributes: { name: "hpc" } },
          ],
        });

        mockDrupalAuth.patch.mockResolvedValue({
          data: {
            id: "announcement-uuid",
            attributes: { title: "Test" },
          },
        });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "update_announcement",
            arguments: {
              uuid: "announcement-uuid",
              tags: ["gpu", "hpc"],
            },
          },
        });

        expect(mockDrupalAuth.patch).toHaveBeenCalledWith(
          "/jsonapi/node/access_news/announcement-uuid",
          expect.objectContaining({
            data: expect.objectContaining({
              relationships: expect.objectContaining({
                field_tags: {
                  data: [
                    { type: "taxonomy_term--tags", id: "tag-uuid-1" },
                    { type: "taxonomy_term--tags", id: "tag-uuid-2" },
                  ],
                },
              }),
            }),
          })
        );
      });
    });

    describe("delete_announcement", () => {
      it("should delete an announcement when confirmed", async () => {
        mockDrupalAuth.delete.mockResolvedValue({});

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "delete_announcement",
            arguments: {
              uuid: "announcement-to-delete",
              confirmed: true,
            },
          },
        });

        expect(mockDrupalAuth.delete).toHaveBeenCalledWith(
          "/jsonapi/node/access_news/announcement-to-delete"
        );

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.success).toBe(true);
        expect(responseData.uuid).toBe("announcement-to-delete");
      });

      it("should reject deletion without confirmation", async () => {
        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "delete_announcement",
            arguments: {
              uuid: "announcement-to-delete",
              confirmed: false,
            },
          },
        });

        // Should not call delete
        expect(mockDrupalAuth.delete).not.toHaveBeenCalled();

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.error).toContain("explicit confirmation");
      });
    });

    describe("get_my_announcements", () => {
      it("should fetch announcements via views endpoint without user UUID lookup", async () => {
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [
            {
              id: "announcement-1",
              attributes: {
                title: "My First Announcement",
                status: false,
                created: "2024-03-15T10:00:00Z",
                body: { value: "<p>Content</p>", summary: "Summary" },
              },
            },
          ],
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "get_my_announcements",
            arguments: { limit: 10 },
          },
        });

        // Should make exactly 1 call — no user UUID lookup
        expect(mockDrupalAuth.get).toHaveBeenCalledTimes(1);
        expect(mockDrupalAuth.get).toHaveBeenCalledWith(
          "/jsonapi/views/mcp_my_announcements/page_1?page[limit]=10"
        );

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.items).toHaveLength(1);
        expect(responseData.items[0].title).toBe("My First Announcement");
        expect(responseData.items[0].status).toBe("draft");
      });

      it("should use default limit of 25", async () => {
        mockDrupalAuth.get.mockResolvedValueOnce({ data: [] });

        await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "get_my_announcements",
            arguments: {},
          },
        });

        expect(mockDrupalAuth.get).toHaveBeenCalledWith(
          "/jsonapi/views/mcp_my_announcements/page_1?page[limit]=25"
        );
      });

      it("should map published status and build edit_url from nid", async () => {
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [
            {
              id: "ann-published",
              attributes: {
                title: "Published One",
                status: true,
                drupal_internal__nid: 999,
                created: "2024-03-15T10:00:00Z",
                field_published_date: "2024-03-15",
                body: { value: "<p>Body</p>", summary: "Short summary" },
              },
            },
            {
              id: "ann-draft",
              attributes: {
                title: "Draft One",
                status: false,
                drupal_internal__nid: 1000,
                created: "2024-03-14T10:00:00Z",
                body: { value: "<p>Draft body</p>" },
              },
            },
          ],
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "get_my_announcements",
            arguments: {},
          },
        });

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.total).toBe(2);

        // Published announcement
        expect(responseData.items[0].uuid).toBe("ann-published");
        expect(responseData.items[0].status).toBe("published");
        expect(responseData.items[0].nid).toBe(999);
        expect(responseData.items[0].edit_url).toBe("https://test.drupal.site/node/999/edit");
        expect(responseData.items[0].published_date).toBe("2024-03-15");
        expect(responseData.items[0].summary).toBe("Short summary");

        // Draft announcement — summary falls back to body text
        expect(responseData.items[1].uuid).toBe("ann-draft");
        expect(responseData.items[1].status).toBe("draft");
        expect(responseData.items[1].edit_url).toBe("https://test.drupal.site/node/1000/edit");
        expect(responseData.items[1].summary).toContain("Draft body");
      });

      it("should handle empty results from views endpoint", async () => {
        mockDrupalAuth.get.mockResolvedValueOnce({ data: [] });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "get_my_announcements",
            arguments: {},
          },
        });

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.total).toBe(0);
        expect(responseData.items).toEqual([]);
      });

      it("should use acting user from request context", async () => {
        delete process.env.ACTING_USER;

        mockDrupalAuth.get.mockResolvedValueOnce({ data: [] });

        const context: RequestContext = {
          actingUser: "contextuser@access-ci.org",
        };

        const result = await requestContextStorage.run(context, async () => {
          return server["handleToolCall"]({
            method: "tools/call",
            params: {
              name: "get_my_announcements",
              arguments: {},
            },
          });
        });

        // Should succeed — acting user comes from request context
        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.total).toBe(0);
        expect(mockDrupalAuth.get).toHaveBeenCalledTimes(1);
      });
    });

    describe("get_announcement_context", () => {
      it("should fetch tags and affinity groups without user UUID lookup", async () => {
        // Two parallel calls only — no user UUID lookup
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [
            { id: "tag-1", attributes: { name: "gpu" } },
            { id: "tag-2", attributes: { name: "hpc" } },
          ],
        });
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [
            {
              id: "group-uuid-1",
              attributes: {
                title: "Test Group",
                field_group_id: 123,
                field_affinity_group_category: "Research",
              },
            },
          ],
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "get_announcement_context",
            arguments: {},
          },
        });

        // Exactly 2 calls — tags + views affinity groups, no user lookup
        expect(mockDrupalAuth.get).toHaveBeenCalledTimes(2);
        expect(mockDrupalAuth.get).toHaveBeenCalledWith(
          "/jsonapi/taxonomy_term/tags?page[limit]=100"
        );
        expect(mockDrupalAuth.get).toHaveBeenCalledWith(
          "/jsonapi/views/mcp_my_affinity_groups/page_1"
        );

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.tags).toHaveLength(2);
        expect(responseData.tags[0].name).toBe("gpu");
        expect(responseData.tags[1].name).toBe("hpc");
        expect(responseData.affinity_groups).toHaveLength(1);
        expect(responseData.affinity_groups[0].name).toBe("Test Group");
        expect(responseData.affinity_groups[0].id).toBe(123);
        expect(responseData.affinity_groups[0].uuid).toBe("group-uuid-1");
        expect(responseData.affinity_groups[0].category).toBe("Research");
        expect(responseData.is_coordinator).toBe(true);
        expect(responseData.affiliations).toContain("ACCESS Collaboration");
        expect(responseData.affiliations).toContain("Community");
        expect(responseData.where_to_share_options).toHaveLength(4);
        expect(responseData.guidance).toContain("coordinator");
      });

      it("should indicate non-coordinator when views returns no affinity groups", async () => {
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [{ id: "tag-1", attributes: { name: "gpu" } }],
        });
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [],
        });

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "get_announcement_context",
            arguments: {},
          },
        });

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.is_coordinator).toBe(false);
        expect(responseData.affinity_groups).toHaveLength(0);
        expect(responseData.guidance).toContain("not a coordinator");
      });

      it("should fail without acting user", async () => {
        delete process.env.ACTING_USER;

        const result = await server["handleToolCall"]({
          method: "tools/call",
          params: {
            name: "get_announcement_context",
            arguments: {},
          },
        });

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.error).toContain("No acting user specified");
        // Should not have made any API calls
        expect(mockDrupalAuth.get).not.toHaveBeenCalled();
      });

      it("should use acting user from request context", async () => {
        delete process.env.ACTING_USER;

        mockDrupalAuth.get.mockResolvedValueOnce({ data: [] });
        mockDrupalAuth.get.mockResolvedValueOnce({ data: [] });

        const context: RequestContext = {
          actingUser: "contextuser@access-ci.org",
        };

        const result = await requestContextStorage.run(context, async () => {
          return server["handleToolCall"]({
            method: "tools/call",
            params: {
              name: "get_announcement_context",
              arguments: {},
            },
          });
        });

        // Should succeed — acting user from request context
        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.tags).toHaveLength(0);
        expect(responseData.is_coordinator).toBe(false);
        expect(mockDrupalAuth.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Resources", () => {
    it("should read accessci://announcements resource", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 200,
        data: [
          {
            uuid: "test-uuid-1",
            title: "Test Announcement",
            body: "<p>Content</p>",
            published_date: "2024-03-15",
            tags: "gpu,hpc",
            affinity_group: [],
          },
        ],
      });

      const result = await server["handleResourceRead"]({
        method: "resources/read",
        params: {
          uri: "accessci://announcements",
        },
      });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe("accessci://announcements");
      expect(result.contents[0].mimeType).toBe("application/json");

      const data = JSON.parse(result.contents[0].text as string);
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe("Test Announcement");
    });

    it("should handle resource read errors", async () => {
      mockHttpClient.get.mockResolvedValue({
        status: 500,
        statusText: "Internal Server Error",
      });

      const result = await server["handleResourceRead"]({
        method: "resources/read",
        params: {
          uri: "accessci://announcements",
        },
      });

      expect(result.contents[0].text).toContain("Error loading announcements");
    });

    it("should throw for unknown resource", async () => {
      await expect(
        server["handleResourceRead"]({
          method: "resources/read",
          params: {
            uri: "accessci://unknown",
          },
        })
      ).rejects.toThrow("Unknown resource");
    });
  });

  describe("Prompts", () => {
    it("should return create_announcement_guide prompt", async () => {
      const result = await server["handleGetPrompt"]({
        params: {
          name: "create_announcement_guide",
          arguments: {},
        },
      });

      expect(result.description).toBe("Guide for creating an ACCESS announcement");
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe("user");
      expect(result.messages[1].role).toBe("assistant");
    });

    it("should include topic in create_announcement_guide", async () => {
      const result = await server["handleGetPrompt"]({
        params: {
          name: "create_announcement_guide",
          arguments: { topic: "GPU availability" },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK prompt message content type
      expect((result.messages[0].content as any).text).toContain("GPU availability");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK prompt message content type
      expect((result.messages[1].content as any).text).toContain("GPU availability");
    });

    it("should return manage_announcements_guide prompt", async () => {
      const result = await server["handleGetPrompt"]({
        params: {
          name: "manage_announcements_guide",
          arguments: {},
        },
      });

      expect(result.description).toBe("Guide for managing existing announcements");
      expect(result.messages).toHaveLength(2);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP SDK prompt message content type
      expect((result.messages[1].content as any).text).toContain("get_my_announcements");
    });

    it("should throw for unknown prompt", async () => {
      await expect(
        server["handleGetPrompt"]({
          params: {
            name: "unknown_prompt",
            arguments: {},
          },
        })
      ).rejects.toThrow("Unknown prompt");
    });
  });

  describe("Unknown Tool", () => {
    it("should return error for unknown tool", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "unknown_tool",
          arguments: {},
        },
      });

      const responseData = JSON.parse((result.content[0] as TextContent).text);
      expect(responseData.error).toContain("Unknown tool");
    });
  });
});
