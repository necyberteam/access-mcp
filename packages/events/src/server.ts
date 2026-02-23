import {
  BaseAccessServer,
  handleApiError,
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
  skill?: string;
  limit?: number;
}

interface GetMyEventsParams {
  limit?: number;
}

interface RawEvent {
  title?: string;
  start_date?: string;
  end_date?: string;
  event_type?: string;
  skill_level?: string;
  tags?: string | string[];
  [key: string]: unknown;
}

export class EventsServer extends BaseAccessServer {
  private _eventsHttpClient?: AxiosInstance;
  private drupalAuth?: DrupalAuthProvider;

  constructor() {
    super("access-mcp-events", version, "https://support.access-ci.org", {
      requireApiKey: true,
    });
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

    // Update acting user from request context or env var
    const context = getRequestContext();
    const actingUser = context?.actingUser || process.env.ACTING_USER;
    if (actingUser) {
      this.drupalAuth.setActingUser(actingUser);
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
      "Cannot get user events: No acting user specified.\n\n" +
        "Either set the X-Acting-User header or the ACTING_USER environment variable " +
        "to the ACCESS ID (e.g., username@access-ci.org)."
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
          "Search ACCESS-CI events (workshops, webinars, training). Returns {total, items}.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search titles, descriptions, speakers, tags",
            },
            type: {
              type: "string",
              description: "Filter: workshop, webinar, training",
            },
            tags: {
              type: "string",
              description: "Filter: python, gpu, hpc, ml",
            },
            date: {
              type: "string",
              description: "Filter by time period",
              enum: ["today", "upcoming", "past", "this_week", "this_month"],
            },
            skill: {
              type: "string",
              description: "Skill level filter",
              enum: ["beginner", "intermediate", "advanced"],
            },
            limit: {
              type: "number",
              description: "Max results (default: 50)",
              default: 50,
            },
          },
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
          },
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

  private buildEventsUrl(params: SearchEventsParams): string {
    const url = new URL("/api/2.2/events", this.baseURL);

    const limit = params.limit || 50;
    let itemsPerPage = 50;
    if (limit >= 100) itemsPerPage = 100;
    else if (limit >= 75) itemsPerPage = 75;
    else if (limit >= 50) itemsPerPage = 50;
    else if (limit >= 25) itemsPerPage = 25;
    else itemsPerPage = 25;
    url.searchParams.set("items_per_page", String(itemsPerPage));

    if (params.query) {
      url.searchParams.set("search_api_fulltext", params.query);
    }

    // Map universal 'date' to API params
    const dateMap: Record<string, { start: string; end?: string }> = {
      today: { start: "today" },
      upcoming: { start: "today" },
      past: { start: "-1year", end: "today" },
      this_week: { start: "today", end: "+1week" },
      this_month: { start: "today", end: "+1month" },
    };

    if (params.date && dateMap[params.date]) {
      const dateMapping = dateMap[params.date];
      url.searchParams.set("beginning_date_relative", dateMapping.start);
      if (dateMapping.end) {
        url.searchParams.set("end_date_relative", dateMapping.end);
      }
    }

    // Note: faceted filters (f[0]=field:value) are not supported on the
    // data_export API display — they're bound to the page display in Drupal.
    // Type, tags, and skill filters are applied client-side in getEvents().

    return url.toString();
  }

  private async getEvents(params: SearchEventsParams): Promise<CallToolResult> {
    const url = this.buildEventsUrl(params);
    const response = await this.httpClient.get(url);

    if (response.status !== 200) {
      throw new Error(`API error ${response.status}`);
    }

    // Ensure response is an array (non-array means unexpected response like 403 HTML)
    let events: RawEvent[] = Array.isArray(response.data) ? response.data : [];

    // Client-side filters (faceted search not available on data_export display)
    if (params.type) {
      const typeFilter = params.type.toLowerCase();
      events = events.filter(
        (e) => (e.event_type as string || "").toLowerCase() === typeFilter
      );
    }
    if (params.tags) {
      const tagFilter = params.tags.toLowerCase();
      events = events.filter((e) => {
        const tags = typeof e.tags === "string" ? e.tags : Array.isArray(e.tags) ? e.tags.join(",") : "";
        return tags.toLowerCase().includes(tagFilter);
      });
    }
    if (params.skill) {
      const skillFilter = params.skill.toLowerCase();
      events = events.filter(
        (e) => (e.skill_level as string || "").toLowerCase() === skillFilter
      );
    }

    if (params.limit && events.length > params.limit) {
      events = events.slice(0, params.limit);
    }

    const enhancedEvents = events.map((event: RawEvent) => ({
      ...event,
      tags: Array.isArray(event.tags) ? event.tags : [],
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

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            total: enhancedEvents.length,
            items: enhancedEvents,
          }),
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
   * Uses the /jsonapi/views/event_instance_mine/my_events_page endpoint
   * which filters by X-Acting-User header.
   */
  private async getMyEvents(params: GetMyEventsParams): Promise<CallToolResult> {
    const auth = this.getDrupalAuth();

    // Ensure we have an acting user
    this.getActingUserAccessId();

    const limit = params.limit || 50;

    // Use the unified view endpoint - it respects X-Acting-User header
    const result = await auth.get(
      `/jsonapi/views/event_instance_mine/my_events_page?page[limit]=${limit}`
    );

    // JSON:API views return data in a different format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON:API response shape is dynamic
    const events = (result.data || []).map((item: any) => ({
      id: item.id,
      type: item.type,
      title: item.attributes?.title,
      start_date: item.attributes?.field_start_date || item.attributes?.start_date,
      end_date: item.attributes?.field_end_date || item.attributes?.end_date,
      status: item.attributes?.status ? "published" : "draft",
      ...item.attributes,
    }));

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            total: events.length,
            items: events,
          }),
        },
      ],
    };
  }
}
