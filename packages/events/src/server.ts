import {
  BaseAccessServer,
  handleApiError,
  projectFields,
  Tool,
  Resource,
  CallToolResult,
  DrupalAuthProvider,
  getRequestContext,
} from "@access-mcp/shared";
import {
  CallToolRequest,
  ReadResourceRequest,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("../package.json");

interface SearchEventsParams {
  query?: string;
  type?: string;
  tags?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  skill?: string;
  has_video?: boolean;
  limit?: number;
  // When true, skip compactDescription's truncation so the agent gets the
  // full event description (e.g. needs the registration URL or wants to
  // summarize a workshop in detail). Default is the truncated form because
  // a full-corpus listing can otherwise blow past LLM context windows.
  full_description?: boolean;
  fields?: string[];
}

interface GetMyEventsParams {
  limit?: number;
  fields?: string[];
}

interface RawEvent {
  title?: string;
  start_date?: string;
  end_date?: string;
  event_type?: string;
  skill_level?: string;
  tags?: string | string[];
  video?: string;
  description?: string;
  [key: string]: unknown;
}

const DESCRIPTION_MAX_CHARS = 250;

export function compactDescription(
  raw: string | undefined,
  maxChars: number = DESCRIPTION_MAX_CHARS
): string | undefined {
  if (raw === undefined || raw === null) return raw;
  const stripped = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length <= maxChars) return stripped;
  return stripped.slice(0, maxChars).trimEnd() + "…";
}

export class EventsServer extends BaseAccessServer {
  private _eventsHttpClient?: AxiosInstance;
  private drupalAuth?: DrupalAuthProvider;

  constructor() {
    super("access-mcp-events", version, "https://support.access-ci.org", {
      requireApiKey: true,
    });
  }

  protected listingLinks(
    context: "list" | "search" | "details" = "list"
  ): Record<string, string> | undefined {
    if (context === "list" || context === "search") {
      return { see_all_url: "https://support.access-ci.org/events" };
    }
    return undefined;
  }

  /**
   * Get or create the Drupal auth provider for authenticated operations.
   * Requires DRUPAL_API_URL, DRUPAL_USERNAME, and DRUPAL_PASSWORD env vars.
   */
  private getDrupalAuth(): DrupalAuthProvider {
    if (!this.drupalAuth) {
      const baseUrl = process.env.DRUPAL_API_URL;
      const username = process.env.DRUPAL_USERNAME;
      const password = process.env.DRUPAL_PASSWORD;

      if (!baseUrl || !username || !password) {
        throw new Error(
          "Authenticated operations require DRUPAL_API_URL, DRUPAL_USERNAME, and DRUPAL_PASSWORD environment variables"
        );
      }

      this.drupalAuth = new DrupalAuthProvider(baseUrl, username, password);
    }

    return this.drupalAuth;
  }

  /**
   * Get the acting user's ACCESS ID for filtering.
   */
  private getActingUserAccessId(): string {
    const context = getRequestContext();
    if (context?.actingUser) {
      return context.actingUser;
    }

    const envUser = process.env.ACTING_USER;
    if (envUser) {
      return envUser;
    }

    throw new Error(
      "Authentication required: No acting user specified.\n\n" +
        "Please authenticate with your ACCESS-CI credentials to use this tool. " +
        "If using Claude, add this server as an authenticated connector via Customize > Connectors."
    );
  }

  protected get httpClient(): AxiosInstance {
    if (!this._eventsHttpClient) {
      const headers: Record<string, string> = {
        "User-Agent": `${this.serverName}/${this.version}`,
      };

      // Add authentication if API key is provided
      const apiKey = process.env.ACCESS_CI_API_KEY;
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      this._eventsHttpClient = axios.create({
        baseURL: this.baseURL,
        timeout: 10000, // 10 seconds for events API (can be slower)
        headers,
        validateStatus: () => true, // Don't throw on HTTP errors
      });
    }
    return this._eventsHttpClient;
  }

  protected getTools(): Tool[] {
    return [
      {
        name: "search_events",
        description:
          "Search ACCESS-CI events (workshops, webinars, training). Returns future events by default. Use date='past' or start_date/end_date for historical events. Returns {total, items}.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search titles, descriptions, speakers, tags",
            },
            type: {
              type: "string",
              description:
                "Filter by event type. Common values: training, webinar, workshop, Office Hours, Conference, Other",
            },
            tags: {
              type: "string",
              description:
                "Filter by tag name. Examples: python, gpu, hpc, ml, open-ondemand, NAIRR-pilot, mpi, quantum-computing, data-analysis, visualization. Tags are case-sensitive as entered by event organizers.",
            },
            date: {
              type: "string",
              description:
                "Quick date filter. Use 'past' for historical events. Defaults to 'upcoming' if omitted.",
              enum: ["today", "upcoming", "past", "this_week", "this_month"],
              default: "upcoming",
            },
            start_date: {
              type: "string",
              description:
                "Start date filter (YYYY-MM-DD or relative like '-6month', '-1year'). Overrides date parameter.",
            },
            end_date: {
              type: "string",
              description:
                "End date filter (YYYY-MM-DD or relative like '+3month', '+1year'). Overrides date parameter.",
            },
            skill: {
              type: "string",
              description: "Skill level filter",
              enum: ["beginner", "intermediate", "advanced"],
            },
            has_video: {
              type: "boolean",
              description:
                "Filter to events with recorded video available. Implies past events (video is only available for past events).",
            },
            limit: {
              type: "number",
              description: "Max results (default: 20)",
              default: 20,
            },
            full_description: {
              type: "boolean",
              description:
                "When true, return the full event description (with HTML) instead of the default 250-char plain-text compact form. Use when you need the registration URL embedded in the description, or want to summarize a workshop in detail. Pair with a small limit to stay within context.",
              default: false,
            },
            fields: {
              type: "array",
              items: { type: "string" },
              description:
                "Project the response down to only these fields. Dotted path syntax: 'total', 'items[].title', 'items[].start_date', 'metadata.pagination.has_more', etc. Use to reduce payload size when you only need specific fields. Omit to receive the full response.",
            },
          },
        },
        _meta: {
          supportsFieldProjection: true,
        },
      },
      {
        name: "get_my_events",
        description: `Get events created by or associated with the authenticated user.

Returns events the user has created or is associated with, including unpublished/draft events.
Requires authentication via X-Acting-User header or ACTING_USER environment variable.

Returns: {total, items: [{title, start_date, end_date, status, ...}]}`,
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Max results (default: 50)",
              default: 50,
            },
            fields: {
              type: "array",
              items: { type: "string" },
              description:
                "Project the response down to only these fields. Dotted path syntax: 'total', 'items[].title', 'items[].status', 'metadata.pagination.has_more', etc. Use to reduce payload size when you only need specific fields. Omit to receive the full response.",
            },
          },
        },
        _meta: {
          supportsFieldProjection: true,
        },
      },
    ];
  }

  protected getResources(): Resource[] {
    return [
      {
        uri: "accessci://events",
        name: "ACCESS-CI Events",
        description: "Comprehensive events data including workshops, webinars, and training",
        mimeType: "application/json",
      },
      {
        uri: "accessci://events/upcoming",
        name: "Upcoming Events",
        description: "Events scheduled for today and beyond",
        mimeType: "application/json",
      },
      {
        uri: "accessci://events/workshops",
        name: "Workshops",
        description: "Workshop events only",
        mimeType: "application/json",
      },
      {
        uri: "accessci://events/webinars",
        name: "Webinars",
        description: "Webinar events only",
        mimeType: "application/json",
      },
    ];
  }

  protected async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case "search_events":
          return await this.searchEvents(args as SearchEventsParams);
        case "get_my_events":
          return await this.getMyEvents(args as GetMyEventsParams);
        default:
          return this.errorResponse(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return this.errorResponse(handleApiError(error));
    }
  }

  protected async handleResourceRead(request: ReadResourceRequest): Promise<ReadResourceResult> {
    const { uri } = request.params;

    switch (uri) {
      case "accessci://events": {
        const allEvents = await this.searchEvents({});
        const content = allEvents.content[0];
        const text = content.type === "text" ? content.text : "";
        return this.createJsonResource(uri, JSON.parse(text));
      }
      case "accessci://events/upcoming": {
        const upcomingEvents = await this.searchEvents({ date: "upcoming" });
        const content = upcomingEvents.content[0];
        const text = content.type === "text" ? content.text : "";
        return this.createJsonResource(uri, JSON.parse(text));
      }
      case "accessci://events/workshops": {
        const workshops = await this.searchEvents({ type: "workshop" });
        const content = workshops.content[0];
        const text = content.type === "text" ? content.text : "";
        return this.createJsonResource(uri, JSON.parse(text));
      }
      case "accessci://events/webinars": {
        const webinars = await this.searchEvents({ type: "webinar" });
        const content = webinars.content[0];
        const text = content.type === "text" ? content.text : "";
        return this.createJsonResource(uri, JSON.parse(text));
      }
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  // Allowed values for the Drupal view's exposed items_per_page pager.
  private static readonly ALLOWED_PAGE_SIZES = [25, 50, 100, 250, 500];

  private buildEventsUrl(params: SearchEventsParams): string {
    const url = new URL("/api/2.3/events", this.baseURL);

    // Map requested limit to nearest allowed page size
    const limit = params.limit || 50;
    const itemsPerPage = EventsServer.ALLOWED_PAGE_SIZES.find((s) => s >= limit)
      || EventsServer.ALLOWED_PAGE_SIZES[EventsServer.ALLOWED_PAGE_SIZES.length - 1];
    url.searchParams.set("items_per_page", String(itemsPerPage));

    if (params.query) {
      url.searchParams.set("search_api_fulltext", params.query);
    }

    // Explicit start_date/end_date override the date shortcut
    if (params.start_date || params.end_date) {
      if (params.start_date) {
        // Detect relative vs absolute: relative starts with + or - or is "today"
        const isRelative = /^[+-]/.test(params.start_date) || params.start_date === "today";
        url.searchParams.set(
          isRelative ? "beginning_date_relative" : "beginning_date",
          params.start_date
        );
      }
      if (params.end_date) {
        const isRelative = /^[+-]/.test(params.end_date) || params.end_date === "today";
        url.searchParams.set(
          isRelative ? "end_date_relative" : "end_date",
          params.end_date
        );
      }
    } else {
      // Map date shortcut to API params
      // has_video implies past events since only past events have recordings
      const dateMap: Record<string, { start: string; end?: string }> = {
        today: { start: "today" },
        upcoming: { start: "today" },
        past: { start: "-1year", end: "today" },
        this_week: { start: "today", end: "+1week" },
        this_month: { start: "today", end: "+1month" },
      };

      const dateKey = params.date || (params.has_video ? "past" : null);
      if (dateKey && dateMap[dateKey]) {
        url.searchParams.set("beginning_date_relative", dateMap[dateKey].start);
        if (dateMap[dateKey].end) {
          url.searchParams.set("end_date_relative", dateMap[dateKey].end!);
        }
      }
    }

    // Faceted filters — uses Drupal's f[0]=field:value format
    let facetIndex = 0;
    if (params.type) {
      url.searchParams.set(`f[${facetIndex++}]`, `custom_event_type:${params.type}`);
    }
    if (params.tags) {
      url.searchParams.set(`f[${facetIndex++}]`, `custom_event_tags:${params.tags}`);
    }
    if (params.skill) {
      url.searchParams.set(`f[${facetIndex++}]`, `skill_level:${params.skill}`);
    }

    return url.toString();
  }

  private async getEvents(params: SearchEventsParams): Promise<CallToolResult> {
    const url = this.buildEventsUrl(params);
    const response = await this.httpClient.get(url);

    if (response.status !== 200) {
      throw new Error(`API error ${response.status}`);
    }

    // Ensure response is an array (non-array means unexpected response like 403 HTML)
    const events: RawEvent[] = Array.isArray(response.data) ? response.data : [];

    const enhancedEvents = events.map((event: RawEvent) => ({
      ...event,
      description: params.full_description
        ? event.description
        : compactDescription(event.description),
      tags:
        typeof event.tags === "string" && event.tags.trim()
          ? event.tags.split(",").map((t: string) => t.trim())
          : Array.isArray(event.tags)
            ? event.tags
            : [],
      duration_hours: event.end_date
        ? Math.round(
            (new Date(event.end_date).getTime() - new Date(event.start_date || "").getTime()) /
              3600000
          )
        : null,
      starts_in_hours: Math.max(
        0,
        Math.round((new Date(event.start_date || "").getTime() - Date.now()) / 3600000)
      ),
    }));

    // Sort by starts_in_hours ascending so nearest events come first
    enhancedEvents.sort((a, b) => a.starts_in_hours - b.starts_in_hours);

    // Client-side filter: has_video
    const filtered = params.has_video
      ? enhancedEvents.filter((e) => typeof e.video === "string" && e.video.trim() !== "")
      : enhancedEvents;

    // Apply limit after sorting and filtering. Explicit-undefined so
    // limit: 0 (count-only callers) doesn't fall through to the full list.
    const limited = params.limit !== undefined ? filtered.slice(0, params.limit) : filtered;

    const envelope = {
      total: filtered.length,
      items: limited,
      metadata: {
        pagination: {
          limit: params.limit ?? filtered.length,
          offset: 0,
          has_more: limited.length < filtered.length,
        },
        query_relevance: params.query ? ("loose_match" as const) : ("exact" as const),
      },
      documentation: {
        links: this.listingLinks("search"),
      },
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(projectFields(envelope, params.fields)),
        },
      ],
    };
  }

  private async searchEvents(params: SearchEventsParams): Promise<CallToolResult> {
    // Validate enum parameters
    const validDateValues = ["today", "upcoming", "past", "this_week", "this_month"];
    const validSkillValues = ["beginner", "intermediate", "advanced"];

    if (params.date && !validDateValues.includes(params.date)) {
      return this.errorResponse(
        `Invalid date value: '${params.date}'`,
        `Valid values are: ${validDateValues.join(", ")}`
      );
    }

    if (params.skill && !validSkillValues.includes(params.skill)) {
      return this.errorResponse(
        `Invalid skill value: '${params.skill}'`,
        `Valid values are: ${validSkillValues.join(", ")}`
      );
    }

    return await this.getEvents(params);
  }

  /**
   * Get events for the authenticated user via the unified Drupal view.
   * Uses the /jsonapi/views/event_instance_mine/mcp_my_events endpoint
   * which filters by X-Acting-User header.
   */
  private async getMyEvents(params: GetMyEventsParams): Promise<CallToolResult> {
    const auth = this.getDrupalAuth();

    // Ensure we have an acting user
    const actingUser = this.getActingUserAccessId();

    const limit = params.limit || 50;

    // Fetch one extra so has_more can distinguish exact-limit from
    // limit-plus-more (avoids the >=limit false-positive when the
    // user's total is exactly the requested cap).
    const result = await auth.get(
      actingUser,
      `/jsonapi/views/event_instance_mine/mcp_my_events?page[limit]=${limit + 1}`
    );

    const fetchedItems = result.data || [];
    const hasMore = fetchedItems.length > limit;
    const slicedItems = fetchedItems.slice(0, limit);

    // JSON:API views return data in a different format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON:API response shape is dynamic
    const events = slicedItems.map((item: any) => ({
      id: item.id,
      type: item.type,
      title: item.attributes?.title,
      start_date: item.attributes?.field_start_date || item.attributes?.start_date,
      end_date: item.attributes?.field_end_date || item.attributes?.end_date,
      status: item.attributes?.status ? "published" : "draft",
      ...item.attributes,
    }));

    const envelope = {
      total: events.length,
      items: events,
      metadata: {
        pagination: {
          limit,
          offset: 0,
          has_more: hasMore,
        },
      },
      documentation: {
        links: this.listingLinks("list"),
      },
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(projectFields(envelope, params.fields)),
        },
      ],
    };
  }
}
