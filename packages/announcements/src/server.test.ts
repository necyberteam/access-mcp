import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";
import { AnnouncementsServer } from "./server.js";
import { DrupalAuthProvider } from "@access-mcp/shared";

// Mock the DrupalAuthProvider
vi.mock("@access-mcp/shared", async () => {
  const actual = await vi.importActual("@access-mcp/shared");
  return {
    ...actual,
    DrupalAuthProvider: vi.fn().mockImplementation(() => ({
      ensureAuthenticated: vi.fn().mockResolvedValue(undefined),
      getUserUuid: vi.fn().mockReturnValue("user-uuid-123"),
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
          { title: "1", published_date: "2024-03-15", tags: ["gpu", "maintenance"], affinity_group: [] },
          { title: "2", published_date: "2024-03-14", tags: ["gpu", "network"], affinity_group: [] },
          { title: "3", published_date: "2024-03-13", tags: ["gpu", "storage"], affinity_group: [] },
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
      process.env.ACTING_USER_UID = "1985";

      // Create a fresh mock for each test
      mockDrupalAuth = {
        ensureAuthenticated: vi.fn().mockResolvedValue(undefined),
        getUserUuid: vi.fn().mockReturnValue("user-uuid-123"),
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
      delete process.env.ACTING_USER_UID;
    });

    describe("create_announcement", () => {
      it("should create an announcement with required fields", async () => {
        // Mock user UUID lookup for ACTING_USER_UID
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [{ id: "acting-user-uuid-123" }],
        });

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
            },
          },
        });

        // Should have looked up the acting user UUID
        expect(mockDrupalAuth.get).toHaveBeenCalledWith(
          "/jsonapi/user/user?filter[drupal_internal__uid]=1985"
        );

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
                }),
              }),
              relationships: expect.objectContaining({
                uid: {
                  data: {
                    type: "user--user",
                    id: "acting-user-uuid-123",
                  },
                },
              }),
            }),
          })
        );

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.success).toBe(true);
        expect(responseData.uuid).toBe("new-announcement-uuid");
      });

      it("should look up tags by name when provided (with caching)", async () => {
        // Mock user lookup first, then bulk tag fetch for cache
        mockDrupalAuth.get
          .mockResolvedValueOnce({ data: [{ id: "acting-user-uuid" }] }) // user lookup
          .mockResolvedValueOnce({
            data: [
              { id: "tag-uuid-1", attributes: { name: "gpu" } },
              { id: "tag-uuid-2", attributes: { name: "maintenance" } },
              { id: "tag-uuid-3", attributes: { name: "hpc" } },
            ]
          }); // bulk tag cache fetch

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
              tags: ["gpu", "maintenance"],
            },
          },
        });

        // Should have looked up user, then fetched all tags for cache
        expect(mockDrupalAuth.get).toHaveBeenCalledWith(
          "/jsonapi/user/user?filter[drupal_internal__uid]=1985"
        );
        expect(mockDrupalAuth.get).toHaveBeenCalledWith(
          "/jsonapi/taxonomy_term/tags?page[limit]=500"
        );

        // Should have created with the correct tag UUIDs
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

      it("should fail without ACTING_USER_UID", async () => {
        delete process.env.ACTING_USER_UID;

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
        expect(responseData.error).toContain("ACTING_USER_UID");
        expect(responseData.error).toContain("No acting user specified");
      });

      it("should create announcement with external link", async () => {
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [{ id: "acting-user-uuid-123" }],
        });

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
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [{ id: "acting-user-uuid-123" }],
        });

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
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [{ id: "acting-user-uuid-123" }],
        });

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
        // User lookup
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [{ id: "acting-user-uuid-123" }],
        });
        // Affinity group lookup by title
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [],
        });
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
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [{ id: "acting-user-uuid-123" }],
        });
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
      it("should fetch announcements for acting user", async () => {
        // First call: user UUID lookup, Second call: announcements
        mockDrupalAuth.get
          .mockResolvedValueOnce({ data: [{ id: "acting-user-uuid-456" }] })
          .mockResolvedValueOnce({
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

        // Should look up acting user UUID first
        expect(mockDrupalAuth.get).toHaveBeenCalledWith(
          "/jsonapi/user/user?filter[drupal_internal__uid]=1985"
        );
        // Then fetch announcements for that user
        expect(mockDrupalAuth.get).toHaveBeenCalledWith(
          expect.stringContaining("filter[uid.id]=acting-user-uuid-456")
        );

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.items).toHaveLength(1);
        expect(responseData.items[0].title).toBe("My First Announcement");
        expect(responseData.items[0].status).toBe("draft");
      });
    });

    describe("get_announcement_context", () => {
      it("should return tags and affinity groups for coordinator", async () => {
        // First call: get user UUID
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [{ id: "user-uuid-123", attributes: { name: "testuser" } }],
        });
        // Second call: get tags (parallel)
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [
            { id: "tag-1", attributes: { name: "gpu" } },
            { id: "tag-2", attributes: { name: "hpc" } },
          ],
        });
        // Third call: get affinity groups (parallel)
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [
            {
              id: "group-uuid-1",
              attributes: {
                title: "Test Group",
                field_group_id: 123,
                field_affinity_group_category: "Research"
              }
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

        const responseData = JSON.parse((result.content[0] as TextContent).text);
        expect(responseData.tags).toHaveLength(2);
        expect(responseData.tags[0].name).toBe("gpu");
        expect(responseData.affinity_groups).toHaveLength(1);
        expect(responseData.affinity_groups[0].name).toBe("Test Group");
        expect(responseData.is_coordinator).toBe(true);
        expect(responseData.affiliations).toContain("ACCESS Collaboration");
        expect(responseData.affiliations).toContain("Community");
      });

      it("should indicate non-coordinator when user has no affinity groups", async () => {
        // First call: get user UUID
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [{ id: "user-uuid-123", attributes: { name: "testuser" } }],
        });
        // Second call: get tags (parallel)
        mockDrupalAuth.get.mockResolvedValueOnce({
          data: [{ id: "tag-1", attributes: { name: "gpu" } }],
        });
        // Third call: get affinity groups - empty (parallel)
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

      expect((result.messages[0].content as any).text).toContain("GPU availability");
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