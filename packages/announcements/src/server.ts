import { BaseAccessServer, Tool, Resource, CallToolResult, DrupalAuthProvider } from "@access-mcp/shared";
import { CallToolRequest, ReadResourceRequest, ReadResourceResult, GetPromptResult, Prompt } from "@modelcontextprotocol/sdk/types.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("../package.json");

// ============================================================================
// Types
// ============================================================================

interface SearchAnnouncementsArgs {
  query?: string;
  tags?: string;
  date?: string;
  limit?: number;
}

interface AnnouncementFilters {
  query?: string;
  tags?: string;
  ag?: string;
  affiliation?: string;
  relative_start_date?: string;
  relative_end_date?: string;
  start_date?: string;
  end_date?: string;
  date?: string;
  limit?: number;
}

interface Announcement {
  uuid?: string;  // Added in API v2.2 update
  title: string;
  body: string;
  published_date: string;
  affinity_group: string | string[];
  tags: string | string[];  // API returns comma-separated string, we convert to array
  affiliation: string;
  summary?: string;
}

interface CreateAnnouncementArgs {
  title: string;
  body: string;
  summary?: string;
  published_date?: string;
  tags?: string[];
  affiliation?: string;
  affinity_group?: string;
  external_link?: { uri: string; title?: string };
  where_to_share?: string[];
}

interface UpdateAnnouncementArgs {
  uuid: string;
  title?: string;
  body?: string;
  summary?: string;
  published_date?: string;
  tags?: string[];
  affinity_group?: string;
  external_link?: { uri: string; title?: string };
  where_to_share?: string[];
}

interface DeleteAnnouncementArgs {
  uuid: string;
  confirmed: boolean;
}

interface GetMyAnnouncementsArgs {
  limit?: number;
}

// ============================================================================
// Server
// ============================================================================

export class AnnouncementsServer extends BaseAccessServer {
  private drupalAuth?: DrupalAuthProvider;
  private tagCache: Map<string, string> = new Map(); // name -> uuid
  private tagCacheExpiry?: Date;
  private static TAG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    super("access-announcements", version, "https://support.access-ci.org");
  }

  /**
   * Get or create the Drupal auth provider for JSON:API write operations.
   * Requires DRUPAL_API_URL, DRUPAL_USERNAME, and DRUPAL_PASSWORD env vars.
   */
  private getDrupalAuth(): DrupalAuthProvider {
    if (!this.drupalAuth) {
      const baseUrl = process.env.DRUPAL_API_URL;
      const username = process.env.DRUPAL_USERNAME;
      const password = process.env.DRUPAL_PASSWORD;

      if (!baseUrl || !username || !password) {
        throw new Error(
          "CRUD operations require DRUPAL_API_URL, DRUPAL_USERNAME, and DRUPAL_PASSWORD environment variables"
        );
      }

      this.drupalAuth = new DrupalAuthProvider(baseUrl, username, password);
    }
    return this.drupalAuth;
  }

  protected getTools(): Tool[] {
    return [
      // Read operations (existing)
      {
        name: "search_announcements",
        description: "Search ACCESS announcements (news, updates, notifications). Read-only view of public announcements. For managing your own announcements (update/delete), use get_my_announcements which returns UUIDs. Returns {total, items: [{title, summary, body, published_date, tags, affiliation, affinity_group}]}.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Full-text search across title, body, and summary"
            },
            tags: {
              type: "string",
              description: "Filter by topics: gpu, ml, hpc"
            },
            date: {
              type: "string",
              description: "Time period filter: today, this_week (last 7 days), this_month (last 30 days), past (last year)",
              enum: ["today", "this_week", "this_month", "past"]
            },
            limit: {
              type: "number",
              description: "Max results (default: 25)",
              default: 25
            }
          }
        }
      },
      // CRUD operations (new)
      {
        name: "create_announcement",
        description: `Create a new ACCESS announcement (saved as draft for staff review).

BEFORE CALLING:
1. Call get_announcement_context first to get tags, check coordinator status, and tailor the conversation.
2. Gather information - either conversationally OR by parsing pasted content:
   - title (required): Clear, specific headline
   - body (required): Full content with details, dates, links. HTML supported.
   - summary (required): 1-2 sentence teaser for listings
   - tags (recommended): 1-6 tags help users find it
   - affiliation (optional): "ACCESS Collaboration" or "Community" (default)
   - external_link (if relevant): URL and link text for external references
3. IF user is a coordinator (check get_announcement_context response):
   - affinity_group: Ask which group to associate with
   - where_to_share: Ask preferences (defaults: Announcements page + Bi-Weekly Digest)

WORKFLOW:
If user pastes content (event description, draft text, etc.):
1. Call get_announcement_context
2. Parse the pasted content to extract title, body, dates, links, etc.
3. Match content to available tags from context
4. Ask only about missing/unclear fields
5. If coordinator: ask about affinity group and where to share
6. Show preview and get confirmation
7. Create the announcement

If user describes what they want conversationally:
1. Call get_announcement_context
2. Guide them through providing title, body, summary
3. Suggest relevant tags from context
4. If coordinator: ask about affinity group and where to share
5. Show preview and get confirmation
6. Create the announcement

PREVIEW FORMAT (show before creating):
---
**Title:** [title]
**Summary:** [summary or "None provided"]
**Body:**
[body content, truncate if very long]

**Tags:** [tag1, tag2, ...] or "None"
**Affiliation:** [affiliation or "Community (default)"]
**External Link:** [link text](url) or omit if none
[If coordinator:]
**Affinity Group:** [group name] or "None"
**Share to:** [list of selected options]
---
Ask "Does this look correct?" before creating.

Returns: {success, uuid, title, edit_url}
ALWAYS display the edit_url to the user so they can review their draft in Drupal.`,
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Announcement title - clear and specific, under 100 characters"
            },
            body: {
              type: "string",
              description: "Full announcement content. HTML allowed (basic_html format: <p>, <a>, <strong>, <em>, <ul>, <li>)"
            },
            summary: {
              type: "string",
              description: "Brief teaser (1-2 sentences) shown in announcement listings. Required."
            },
            published_date: {
              type: "string",
              description: "When to display (YYYY-MM-DD). Defaults to today."
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Tag names (1-6 required for publication). Use list_available_tags to find valid tags."
            },
            affiliation: {
              type: "string",
              description: "Source of announcement",
              enum: ["ACCESS Collaboration", "Community"]
            },
            affinity_group: {
              type: "string",
              description: "Affinity group name or UUID. User must be coordinator of the group. Use list_affinity_groups to find valid groups."
            },
            external_link: {
              type: "object",
              description: "External link related to this announcement",
              properties: {
                uri: { type: "string", description: "URL (must include https://)" },
                title: { type: "string", description: "Link text to display" }
              },
              required: ["uri"]
            },
            where_to_share: {
              type: "array",
              items: { type: "string" },
              description: "Where to share the announcement. Defaults to 'Announcements page' + 'Bi-Weekly Digest'. Options: 'Announcements page', 'Bi-Weekly Digest', 'Affinity Group page', 'Email to Affinity Group'"
            }
          },
          required: ["title", "body", "summary"]
        }
      },
      {
        name: "update_announcement",
        description: `Update an existing announcement. User must own the announcement.

BEFORE CALLING:
1. Use get_my_announcements to find the announcement UUID
2. Confirm which fields the user wants to change
3. Only include fields that are changing
4. Show a preview of the changes and ask for confirmation before updating

Returns: {success, uuid, title, edit_url}
ALWAYS display the edit_url to the user so they can review changes in Drupal.`,
        inputSchema: {
          type: "object",
          properties: {
            uuid: {
              type: "string",
              description: "UUID of the announcement (get from get_my_announcements)"
            },
            title: {
              type: "string",
              description: "New title (only if changing)"
            },
            body: {
              type: "string",
              description: "New body content (only if changing)"
            },
            summary: {
              type: "string",
              description: "New summary (only if changing)"
            },
            published_date: {
              type: "string",
              description: "New publication date YYYY-MM-DD (only if changing)"
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "New tags - replaces ALL existing tags (only if changing)"
            },
            affinity_group: {
              type: "string",
              description: "Affinity group name or UUID. User must be coordinator."
            },
            external_link: {
              type: "object",
              description: "External link related to this announcement",
              properties: {
                uri: { type: "string", description: "URL (must include https://)" },
                title: { type: "string", description: "Link text to display" }
              },
              required: ["uri"]
            },
            where_to_share: {
              type: "array",
              items: { type: "string" },
              description: "Where to share the announcement. Options: 'Announcements page', 'Bi-Weekly Digest', 'Affinity Group page', 'Email to Affinity Group'"
            }
          },
          required: ["uuid"]
        }
      },
      {
        name: "delete_announcement",
        description: `Permanently delete an announcement. User must own the announcement.

CRITICAL: NEVER delete without explicit user confirmation for EACH announcement.

BEFORE CALLING (required for EVERY delete):
1. Use get_my_announcements to find the announcement
2. Show the user: "Delete '[title]' (status: [status])? This cannot be undone."
3. For published announcements, add warning: "⚠️ This is currently visible to the public."
4. Wait for explicit "yes" or confirmation - general statements like "sure" or "go ahead" are NOT sufficient
5. Only proceed after receiving clear confirmation for THIS SPECIFIC announcement

BULK DELETES: When user asks to delete multiple announcements, confirm EACH ONE individually.
Do NOT batch delete based on general consent. Each deletion requires its own confirmation prompt.

Returns: {success, uuid}`,
        inputSchema: {
          type: "object",
          properties: {
            uuid: {
              type: "string",
              description: "UUID of the announcement to delete"
            },
            confirmed: {
              type: "boolean",
              description: "Set to true only after user has explicitly confirmed deletion of THIS specific announcement. Required."
            }
          },
          required: ["uuid", "confirmed"]
        }
      },
      {
        name: "get_my_announcements",
        description: `List all announcements created by the authenticated user.

Returns announcements with: uuid, nid, title, status (draft/published), created date, published_date, summary, edit_url

Use this to:
- Find announcement UUIDs for update/delete operations
- Check status of submitted announcements
- Review what the user has created
- Get edit_url links for users to review in Drupal`,
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Max results (default: 25)",
              default: 25
            }
          }
        }
      },
      {
        name: "get_announcement_context",
        description: `Get user context and options BEFORE creating an announcement. Call this first.

Returns:
- tags: Available tags for announcements [{name, uuid}]
- affinity_groups: Groups the user coordinates (empty if not a coordinator)
- is_coordinator: Boolean - if true, ask about affinity_group and where_to_share
- affiliations: Available affiliation options
- where_to_share_options: Available sharing options (only relevant for coordinators)

Use this to tailor the announcement creation conversation based on the user's role.`,
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ];
  }

  protected getResources(): Resource[] {
    return [
      {
        uri: "accessci://announcements",
        name: "ACCESS Support Announcements",
        description: "Recent announcements and notifications from ACCESS support",
        mimeType: "application/json"
      }
    ];
  }

  protected getPrompts(): Prompt[] {
    return [
      {
        name: "create_announcement_guide",
        description: "Guide the user through creating a new ACCESS announcement step by step",
        arguments: [
          {
            name: "topic",
            description: "Brief description of what the announcement is about (optional, helps tailor guidance)",
            required: false,
          },
        ],
      },
      {
        name: "manage_announcements_guide",
        description: "Help the user view, update, or delete their existing announcements",
        arguments: [],
      },
    ];
  }

  protected async handleGetPrompt(request: { params: { name: string; arguments?: Record<string, string> } }): Promise<GetPromptResult> {
    const { name, arguments: args = {} } = request.params;

    if (name === "create_announcement_guide") {
      const topic = args.topic || "";

      return {
        description: "Guide for creating an ACCESS announcement",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: topic
                ? `I want to create an announcement about: ${topic}`
                : "I want to create a new announcement",
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: `I'll help you create an ACCESS announcement. Let me first check your available options and coordinator status.

First, I'll call \`get_announcement_context\` to see what tags are available and whether you coordinate any affinity groups.

**Required Information:**

1. **Title** - A clear, concise title (under 100 characters)

2. **Body** - The main content (HTML supported)

**Recommended:**

3. **Summary** - Brief teaser (1-2 sentences) for listings

4. **Tags** - Help users find your announcement (1-6 recommended)

**Optional:**

5. **Affiliation** - "ACCESS Collaboration" or "Community" (default)

6. **External Link** - If referencing external content

**For Affinity Group Coordinators:**
- Associate with your affinity group
- Choose where to share (Announcements page, Bi-Weekly Digest, Affinity Group page, Email to group)

**Important:** Announcements are created as **drafts** requiring staff review. You'll receive an edit URL.

Let me check your context first, then we'll get started!${topic ? `\n\nI see you want to announce something about "${topic}" - I'll help you craft that.` : ""}`,
            },
          },
        ],
      };
    }

    if (name === "manage_announcements_guide") {
      return {
        description: "Guide for managing existing announcements",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "I want to manage my announcements",
            },
          },
          {
            role: "assistant",
            content: {
              type: "text",
              text: `I can help you manage your ACCESS announcements. Here's what you can do:

**View Your Announcements**
Use \`get_my_announcements\` to see all announcements you've created, including:
- Draft announcements awaiting review
- Published announcements
- Their current status

**Update an Announcement**
Use \`update_announcement\` with the announcement's UUID to modify:
- Title
- Body content
- Summary
- Published date
- Tags

**Delete an Announcement**
Use \`delete_announcement\` with the UUID to remove an announcement you own.

Would you like me to:
1. **List your announcements** - See what you've created
2. **Update a specific announcement** - Make changes to an existing one
3. **Delete an announcement** - Remove one you no longer need

Which would you like to do?`,
            },
          },
        ],
      };
    }

    throw new Error(`Unknown prompt: ${name}`);
  }

  protected async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        // Read operations
        case "search_announcements":
          return await this.searchAnnouncements(args as SearchAnnouncementsArgs);

        // CRUD operations
        case "create_announcement":
          return await this.createAnnouncement(args as unknown as CreateAnnouncementArgs);
        case "update_announcement":
          return await this.updateAnnouncement(args as unknown as UpdateAnnouncementArgs);
        case "delete_announcement":
          return await this.deleteAnnouncement(args as unknown as DeleteAnnouncementArgs);
        case "get_my_announcements":
          return await this.getMyAnnouncements(args as unknown as GetMyAnnouncementsArgs);

        // Helper operations
        case "get_announcement_context":
          return await this.getAnnouncementContext();

        default:
          return this.errorResponse(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return this.errorResponse(message);
    }
  }

  protected async handleResourceRead(request: ReadResourceRequest): Promise<ReadResourceResult> {
    const { uri } = request.params;

    if (uri === "accessci://announcements") {
      try {
        const announcements = await this.fetchAnnouncements({ limit: 10 });
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(announcements, null, 2)
            }
          ]
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          contents: [
            {
              uri,
              mimeType: "text/plain",
              text: `Error loading announcements: ${message}`
            }
          ]
        };
      }
    }

    throw new Error(`Unknown resource: ${uri}`);
  }

  // ============================================================================
  // Read Operations (existing)
  // ============================================================================

  private normalizeLimit(limit?: number): number {
    const requestedLimit = limit || 25;
    if (requestedLimit <= 5) return 5;
    if (requestedLimit <= 10) return 10;
    if (requestedLimit <= 25) return 25;
    return 50;
  }

  private buildAnnouncementsUrl(filters: AnnouncementFilters): string {
    const params = new URLSearchParams();
    params.append("items_per_page", String(this.normalizeLimit(filters.limit)));

    if (filters.query) {
      params.append("search_api_fulltext", filters.query);
    }

    if (filters.tags) {
      params.append("tags", filters.tags);
    }

    const dateMap: Record<string, {start: string, end?: string}> = {
      today: {start: "today"},
      this_week: {start: "-1 week", end: "now"},
      this_month: {start: "-1 month", end: "now"},
      past: {start: "-1 year", end: "now"}
    };

    if (filters.date && dateMap[filters.date]) {
      const dateRange = dateMap[filters.date];
      params.append("relative_start_date", dateRange.start);
      if (dateRange.end) {
        params.append("relative_end_date", dateRange.end);
      }
    }

    return `/api/2.2/announcements?${params.toString()}`;
  }

  private async fetchAnnouncements(filters: AnnouncementFilters): Promise<Announcement[]> {
    const url = this.buildAnnouncementsUrl(filters);
    const response = await this.httpClient.get(url);

    if (response.status !== 200) {
      throw new Error(`API Error ${response.status}: ${response.statusText}`);
    }

    const announcements = response.data || [];
    return this.enhanceAnnouncements(announcements);
  }

  private enhanceAnnouncements(rawAnnouncements: Announcement[]): Announcement[] {
    return rawAnnouncements.map(announcement => ({
      ...announcement,
      // Tags come as comma-separated string from public API, convert to array
      tags: Array.isArray(announcement.tags)
        ? announcement.tags
        : (typeof announcement.tags === 'string' && announcement.tags.trim()
            ? announcement.tags.split(',').map((t: string) => t.trim())
            : []),
      summary: announcement.summary || (announcement.body ? announcement.body.replace(/<[^>]*>/g, '').substring(0, 200) + '...' : '')
    }));
  }

  private async searchAnnouncements(filters: SearchAnnouncementsArgs): Promise<CallToolResult> {
    const announcements = await this.fetchAnnouncements(filters);
    const limited = filters.limit ? announcements.slice(0, filters.limit) : announcements;

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          total: announcements.length,
          items: limited
        })
      }]
    };
  }

  // ============================================================================
  // CRUD Operations (new)
  // ============================================================================

  /**
   * Get the acting user's UID from environment variable.
   * This identifies who the announcement should be attributed to.
   */
  private getActingUserUid(): number {
    const envUid = process.env.ACTING_USER_UID;
    if (envUid) {
      const parsed = parseInt(envUid, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    throw new Error(
      "Cannot create announcement: No acting user specified.\n\n" +
      "The ACTING_USER_UID environment variable must be set to the Drupal user ID " +
      "of the person creating the announcement. This should be configured by the chat system."
    );
  }

  /**
   * Create a new announcement via Drupal JSON:API
   */
  private async createAnnouncement(args: CreateAnnouncementArgs): Promise<CallToolResult> {
    const auth = this.getDrupalAuth();

    // Get the acting user - required for proper attribution
    const actingUserUid = this.getActingUserUid();
    const userUuid = await this.getUserUuidByUid(actingUserUid);

    if (!userUuid) {
      throw new Error(`Could not find user with UID ${actingUserUid}. Verify the ACTING_USER_UID is correct.`);
    }

    // Build the JSON:API request body
    const requestBody: any = {
      data: {
        type: "node--access_news",
        attributes: {
          title: args.title,
          moderation_state: "draft", // Use content moderation workflow
          body: {
            value: args.body,
            format: "basic_html"
          }
        },
        relationships: {
          uid: {
            data: {
              type: "user--user",
              id: userUuid
            }
          }
        }
      }
    };

    // Add optional fields
    if (args.summary) {
      requestBody.data.attributes.body.summary = args.summary;
    }

    if (args.published_date) {
      requestBody.data.attributes.field_published_date = args.published_date;
    } else {
      // Default to today
      requestBody.data.attributes.field_published_date = new Date().toISOString().split('T')[0];
    }

    if (args.affiliation) {
      requestBody.data.attributes.field_affiliation = args.affiliation;
    }

    // Look up tag UUIDs if tags provided
    if (args.tags && args.tags.length > 0) {
      const tagUuids = await this.getTagUuidsByName(args.tags);
      if (tagUuids.length > 0) {
        requestBody.data.relationships.field_tags = {
          data: tagUuids.map(uuid => ({
            type: "taxonomy_term--tags",
            id: uuid
          }))
        };
      }
    }

    // Look up affinity group UUID if provided
    if (args.affinity_group) {
      const groupUuid = await this.getAffinityGroupUuid(args.affinity_group);
      if (groupUuid) {
        requestBody.data.relationships.field_affinity_group_node = {
          data: {
            type: "node--affinity_group",
            id: groupUuid
          }
        };
      } else {
        throw new Error(`Affinity group not found: ${args.affinity_group}. Use list_affinity_groups to see groups you coordinate.`);
      }
    }

    // Add external link if provided
    if (args.external_link) {
      requestBody.data.attributes.field_news_external_link = {
        uri: args.external_link.uri,
        title: args.external_link.title || ""
      };
    }

    // Add where to share (defaults handled by Drupal if not provided)
    if (args.where_to_share && args.where_to_share.length > 0) {
      requestBody.data.attributes.field_choose_where_to_share_this = this.normalizeWhereToShare(args.where_to_share);
    }

    const result = await auth.post("/jsonapi/node/access_news", requestBody);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          message: "Announcement created (draft status)",
          uuid: result.data?.id,
          title: result.data?.attributes?.title,
          edit_url: `${process.env.DRUPAL_API_URL}/node/${result.data?.attributes?.drupal_internal__nid}/edit`
        })
      }]
    };
  }

  /**
   * Update an existing announcement via Drupal JSON:API
   */
  private async updateAnnouncement(args: UpdateAnnouncementArgs): Promise<CallToolResult> {
    const auth = this.getDrupalAuth();

    const requestBody: any = {
      data: {
        type: "node--access_news",
        id: args.uuid,
        attributes: {}
      }
    };

    // Add fields to update
    if (args.title) {
      requestBody.data.attributes.title = args.title;
    }

    // Handle body/summary updates
    // Fetch existing to preserve values not being changed
    if (args.body || args.summary) {
      const existing = await auth.get(`/jsonapi/node/access_news/${args.uuid}`);
      const existingBody = existing.data?.attributes?.body?.value || "";
      const existingSummary = existing.data?.attributes?.body?.summary || "";

      requestBody.data.attributes.body = {
        value: args.body || existingBody,
        format: "basic_html",
        summary: args.summary !== undefined ? args.summary : existingSummary
      };
    }
    // If neither body nor summary provided, don't include body in request at all

    if (args.published_date) {
      requestBody.data.attributes.field_published_date = args.published_date;
    }

    // Update tags if provided
    if (args.tags && args.tags.length > 0) {
      const tagUuids = await this.getTagUuidsByName(args.tags);
      if (tagUuids.length > 0) {
        if (!requestBody.data.relationships) {
          requestBody.data.relationships = {};
        }
        requestBody.data.relationships.field_tags = {
          data: tagUuids.map(uuid => ({
            type: "taxonomy_term--tags",
            id: uuid
          }))
        };
      }
    }

    // Update affinity group if provided
    if (args.affinity_group) {
      const groupUuid = await this.getAffinityGroupUuid(args.affinity_group);
      if (groupUuid) {
        if (!requestBody.data.relationships) {
          requestBody.data.relationships = {};
        }
        requestBody.data.relationships.field_affinity_group_node = {
          data: {
            type: "node--affinity_group",
            id: groupUuid
          }
        };
      } else {
        throw new Error(`Affinity group not found: ${args.affinity_group}. Use list_affinity_groups to see groups you coordinate.`);
      }
    }

    // Update external link if provided
    if (args.external_link) {
      requestBody.data.attributes.field_news_external_link = {
        uri: args.external_link.uri,
        title: args.external_link.title || ""
      };
    }

    // Update where to share if provided
    if (args.where_to_share && args.where_to_share.length > 0) {
      requestBody.data.attributes.field_choose_where_to_share_this = this.normalizeWhereToShare(args.where_to_share);
    }

    const result = await auth.patch(`/jsonapi/node/access_news/${args.uuid}`, requestBody);
    const nid = result.data?.attributes?.drupal_internal__nid;
    const baseUrl = process.env.DRUPAL_API_URL;

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          message: "Announcement updated",
          uuid: result.data?.id,
          title: result.data?.attributes?.title,
          edit_url: nid ? `${baseUrl}/node/${nid}/edit` : null
        })
      }]
    };
  }

  /**
   * Delete an announcement via Drupal JSON:API
   */
  private async deleteAnnouncement(args: DeleteAnnouncementArgs): Promise<CallToolResult> {
    // Enforce confirmation parameter
    if (!args.confirmed) {
      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            error: "Deletion requires explicit confirmation. You must show the announcement title and status to the user and get explicit confirmation before setting confirmed=true.",
            uuid: args.uuid
          })
        }]
      };
    }

    const auth = this.getDrupalAuth();

    await auth.delete(`/jsonapi/node/access_news/${args.uuid}`);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          success: true,
          message: "Announcement deleted",
          uuid: args.uuid
        })
      }]
    };
  }

  /**
   * Get announcements created by the acting user
   */
  private async getMyAnnouncements(args: GetMyAnnouncementsArgs): Promise<CallToolResult> {
    const auth = this.getDrupalAuth();

    // Get the acting user's UUID
    const actingUserUid = this.getActingUserUid();
    const userUuid = await this.getUserUuidByUid(actingUserUid);

    if (!userUuid) {
      throw new Error(`Could not find user with UID ${actingUserUid}. Verify the ACTING_USER_UID is correct.`);
    }

    const limit = args.limit || 25;
    const result = await auth.get(
      `/jsonapi/node/access_news?filter[uid.id]=${userUuid}&page[limit]=${limit}&sort=-created`
    );

    const baseUrl = process.env.DRUPAL_API_URL;
    const announcements = (result.data || []).map((item: any) => {
      const nid = item.attributes?.drupal_internal__nid;
      return {
        uuid: item.id,
        nid,
        title: item.attributes?.title,
        status: item.attributes?.status ? "published" : "draft",
        created: item.attributes?.created,
        published_date: item.attributes?.field_published_date,
        summary: item.attributes?.body?.summary ||
          (item.attributes?.body?.value ?
            item.attributes.body.value.replace(/<[^>]*>/g, '').substring(0, 200) + '...' : ''),
        edit_url: nid ? `${baseUrl}/node/${nid}/edit` : null
      };
    });

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          total: announcements.length,
          items: announcements
        })
      }]
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get a user's UUID by their Drupal user ID (internal helper)
   */
  private async getUserUuidByUid(uid: number): Promise<string | null> {
    const auth = this.getDrupalAuth();
    const result = await auth.get(`/jsonapi/user/user?filter[drupal_internal__uid]=${uid}`);

    if (!result.data || result.data.length === 0) {
      return null;
    }

    return result.data[0].id;
  }

  /**
   * Get announcement context - tags, affinity groups, and options for creating announcements
   */
  private async getAnnouncementContext(): Promise<CallToolResult> {
    const auth = this.getDrupalAuth();

    // Get the acting user's UUID
    const actingUserUid = this.getActingUserUid();
    const userUuid = await this.getUserUuidByUid(actingUserUid);

    if (!userUuid) {
      throw new Error(`Could not find user with UID ${actingUserUid}`);
    }

    // Fetch tags and affinity groups in parallel
    const [tagsResult, groupsResult] = await Promise.all([
      auth.get("/jsonapi/taxonomy_term/tags?page[limit]=100"),
      auth.get(`/jsonapi/node/affinity_group?filter[field_coordinator.id]=${userUuid}&filter[status]=1&page[limit]=100`)
    ]);

    const tags = (tagsResult.data || []).map((item: any) => ({
      name: item.attributes?.name,
      uuid: item.id
    }));

    const affinityGroups = (groupsResult.data || []).map((item: any) => ({
      id: item.attributes?.field_group_id,
      uuid: item.id,
      name: item.attributes?.title,
      category: item.attributes?.field_affinity_group_category
    }));

    const isCoordinator = affinityGroups.length > 0;

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          tags: tags,
          affinity_groups: affinityGroups,
          is_coordinator: isCoordinator,
          affiliations: ["ACCESS Collaboration", "Community"],
          where_to_share_options: [
            { value: "Announcements page", description: "Public announcements listing" },
            { value: "Bi-Weekly Digest", description: "ACCESS Support bi-weekly email digest" },
            { value: "Affinity Group page", description: "Your affinity group's page (coordinators only)" },
            { value: "Email to Affinity Group", description: "Direct email to affinity group members (coordinators only)" }
          ],
          guidance: isCoordinator
            ? "User is an affinity group coordinator. Ask about affinity_group association and where_to_share preferences."
            : "User is not a coordinator. Standard announcement fields apply."
        })
      }]
    };
  }

  /**
   * Look up affinity group UUID by ID or name
   */
  private async getAffinityGroupUuid(idOrName: string): Promise<string | null> {
    const auth = this.getDrupalAuth();

    // If it looks like a UUID, return as-is
    if (idOrName.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return idOrName;
    }

    // Try by field_group_id first
    let result = await auth.get(
      `/jsonapi/node/affinity_group?filter[field_group_id]=${encodeURIComponent(idOrName)}&filter[status]=1`
    );

    if (result.data && result.data.length > 0) {
      return result.data[0].id;
    }

    // Try by title
    result = await auth.get(
      `/jsonapi/node/affinity_group?filter[title]=${encodeURIComponent(idOrName)}&filter[status]=1`
    );

    if (result.data && result.data.length > 0) {
      return result.data[0].id;
    }

    return null;
  }

  /**
   * Map human-friendly "where to share" labels to Drupal values
   */
  private static WHERE_TO_SHARE_MAP: Record<string, string> = {
    "announcements page": "on_the_announcements_page",
    "on the announcements page": "on_the_announcements_page",
    "bi-weekly digest": "in_the_access_support_bi_weekly_digest",
    "in the access support bi-weekly digest": "in_the_access_support_bi_weekly_digest",
    "affinity group page": "on_your_affinity_group_page",
    "on your affinity group page": "on_your_affinity_group_page",
    "email to affinity group": "email_to_your_affinity_group",
    "email to your affinity group": "email_to_your_affinity_group",
    // Also accept the raw values
    "on_the_announcements_page": "on_the_announcements_page",
    "in_the_access_support_bi_weekly_digest": "in_the_access_support_bi_weekly_digest",
    "on_your_affinity_group_page": "on_your_affinity_group_page",
    "email_to_your_affinity_group": "email_to_your_affinity_group",
  };

  private normalizeWhereToShare(values: string[]): string[] {
    return values.map(v => {
      const normalized = AnnouncementsServer.WHERE_TO_SHARE_MAP[v.toLowerCase()];
      if (!normalized) {
        throw new Error(
          `Invalid where_to_share value: "${v}". ` +
          `Valid options: 'Announcements page', 'Bi-Weekly Digest', 'Affinity Group page', 'Email to Affinity Group'`
        );
      }
      return normalized;
    });
  }

  /**
   * Check if tag cache is still valid
   */
  private isTagCacheValid(): boolean {
    return this.tagCacheExpiry !== undefined && new Date() < this.tagCacheExpiry;
  }

  /**
   * Populate the tag cache with all available tags
   */
  private async populateTagCache(): Promise<void> {
    const auth = this.getDrupalAuth();
    const result = await auth.get("/jsonapi/taxonomy_term/tags?page[limit]=500");

    this.tagCache.clear();
    for (const item of result.data || []) {
      const name = item.attributes?.name?.toLowerCase();
      if (name && item.id) {
        this.tagCache.set(name, item.id);
      }
    }

    this.tagCacheExpiry = new Date(Date.now() + AnnouncementsServer.TAG_CACHE_TTL_MS);
  }

  /**
   * Get tag UUIDs by their names (with caching)
   */
  private async getTagUuidsByName(tagNames: string[]): Promise<string[]> {
    // Ensure cache is populated
    if (!this.isTagCacheValid()) {
      await this.populateTagCache();
    }

    const uuids: string[] = [];
    for (const name of tagNames) {
      const uuid = this.tagCache.get(name.toLowerCase());
      if (uuid) {
        uuids.push(uuid);
      }
    }

    return uuids;
  }
}
