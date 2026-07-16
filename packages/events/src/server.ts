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
  registration?: string;
  registration_enabled?: boolean;
  registration_capacity?: number;
  registration_has_waitlist?: boolean;
  [key: string]: unknown;
}

const DESCRIPTION_MAX_CHARS = 250;

/**
 * Normalize a Drupal daterange value to an unambiguous ISO instant.
 *
 * Drupal serializes daterange fields as naive UTC strings with no zone
 * designator (e.g. "2026-07-23T20:00:00"). Appending "Z" marks them as UTC so
 * consumers don't interpret them in local time. Returns undefined for a missing
 * value, and leaves an already-zoned string untouched.
 */
export function isoInstant(value: string | undefined | null): string | undefined {
  if (!value) return undefined;
  return /[Z+-]\d{2}:?\d{2}$|Z$/.test(value) ? value : `${value}Z`;
}

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
          "Search ACCESS-CI events (workshops, webinars, training). Returns future events by default. Use date='past' or start_date/end_date for historical events. Returns {total, items}. Each event may carry `access_registration` (native ACCESS registration — when enabled, the user can register through ACCESS itself; manage it with get_event for live availability, register_for_event to sign up, get_my_registrations to list, and cancel_registration to cancel) and/or `registration_url` (an external link to register on the resource provider's own site — ACCESS does not manage these; direct the user to the URL). access_registration.enabled true means act via the ACCESS tools; registration_url means go offsite.",
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

Returns: {total, items: [{id, type, title, start_date, end_date, status}]} where status is the editorial moderation state (draft / ready_for_review / published).`,
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
      {
        name: "get_my_registrations",
        description:
          "List the events the authenticated user has registered to attend (distinct from get_my_events, which lists events they CREATED). Returns one entry per registration: registrant_id (the handle for cancel_registration), eventinstance_id, event_title, start/end dates, location, virtual_meeting_link, event_type, and waitlist status. Defaults to upcoming registrations; pass when=past or when=all to see past/all. Scoped to the authenticated acting user. Read-only.",
        inputSchema: {
          type: "object" as const,
          properties: {
            when: {
              type: "string",
              enum: ["upcoming", "past", "all"],
              description: "Which registrations to return (default: upcoming).",
            },
          },
          required: [],
        },
      },
      {
        name: "get_event",
        description:
          "Fetch one ACCESS event's full detail and LIVE registration state (seats_remaining, registration_open, and whether the acting user is already_registered). Use before register_for_event to show the user current availability. registration.enabled=false means native ACCESS registration is off; registration_url (if present) is an external offsite link ACCESS does not manage.",
        inputSchema: {
          type: "object" as const,
          properties: {
            eventinstance_id: {
              type: "string",
              description: "The eventinstance id (from search_events `id`).",
            },
          },
          required: ["eventinstance_id"],
        },
      },
      {
        name: "register_for_event",
        description:
          "Register the acting user for an ACCESS event via native ACCESS registration. WITHOUT `confirmed` (or confirmed:false) this returns a PREVIEW of what would happen (seat vs. waitlist) and writes NOTHING. WITH confirmed:true it registers and returns a registrant_id. NOTE: this is the OPPOSITE default of cancel_registration — here confirmed:false (or omitted) is a SAFE no-write PREVIEW, whereas in cancel_registration confirmed:false REFUSES the action; do not assume one tool's confirmed semantics from the other. Pair with get_event (live availability before registering), get_my_registrations (list the acting user's registrations), and cancel_registration (cancel one, takes the registrant_id).",
        inputSchema: {
          type: "object" as const,
          properties: {
            eventinstance_id: {
              type: "string",
              description: "The eventinstance id (from search_events/get_event `id`).",
            },
            confirmed: {
              type: "boolean",
              description:
                "Omit or false for a no-write preview (seat vs. waitlist); true to actually register. This is the OPPOSITE of cancel_registration, where confirmed:false refuses.",
            },
          },
          required: ["eventinstance_id"],
        },
      },
      {
        name: "cancel_registration",
        description:
          "Permanently cancel one of the authenticated user's OWN event registrations. Pass registrant_id, obtained from get_my_registrations. This cannot cancel other users' registrations — it is scoped to the authenticated acting user. Requires explicit user confirmation: show the registration's event details to the user and only set confirmed=true after they explicitly confirm cancelling THIS specific registration. NOTE: here confirmed:false (or omitted) REFUSES the cancel — the opposite of register_for_event, where confirmed:false is a safe no-write preview.",
        inputSchema: {
          type: "object" as const,
          properties: {
            registrant_id: {
              type: "string",
              description: "The registration id from get_my_registrations.",
            },
            confirmed: {
              type: "boolean",
              description:
                "Set to true only after the user has explicitly confirmed cancellation of THIS specific registration. Required.",
            },
          },
          required: ["registrant_id", "confirmed"],
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
        case "get_event":
          return await this.getEvent(args.eventinstance_id as string);
        case "register_for_event":
          return await this.registerForEvent(
            args.eventinstance_id as string,
            args.confirmed as boolean | undefined
          );
        case "get_my_registrations":
          return await this.getMyRegistrations(((args as { when?: string }).when) || "upcoming");
        case "cancel_registration":
          return await this.cancelRegistration(args.registrant_id as string, args.confirmed as boolean);
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

    const enhancedEvents = events.map((event: RawEvent) => {
      const {
        registration,
        registration_enabled,
        registration_capacity,
        registration_has_waitlist,
        ...rest
      } = event;
      return {
        ...rest,
        // Z-normalize the daterange fields so search_events matches
        // get_my_events / get_event, which already emit Z-suffixed UTC via
        // isoInstant. The raw event.start_date/end_date are still used below
        // for the duration/starts computations (unaffected). Preserve the
        // original if isoInstant returns undefined (belt and suspenders).
        start_date: isoInstant(event.start_date) ?? event.start_date,
        end_date: isoInstant(event.end_date) ?? event.end_date,
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
        // Native ACCESS registration (managed via the registration tools),
        // distinct from the external registration_url below.
        access_registration: registration_enabled
          ? {
              enabled: true,
              capacity: registration_capacity ? registration_capacity : null,
              has_waitlist: !!registration_has_waitlist,
            }
          : { enabled: false },
        // External offsite registration link (ACCESS does not manage these).
        registration_url: registration && registration.trim() ? registration : null,
      };
    });

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

    // jsonapi_views serializes only the base eventinstance entity (it drops
    // configured view fields / Twig rewrites), so we read the base-entity
    // attributes directly: `date` is a daterange ({value, end_value}, naive
    // UTC), `status` is the publish boolean, and `moderation_state` carries the
    // real editorial state (draft/ready_for_review/published) shown in the view.
    // We deliberately do NOT spread ...item.attributes — that re-added the raw
    // boolean `status`, clobbering the mapped value, and leaked revision/langcode
    // internals into the response.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- JSON:API response shape is dynamic
    const events = slicedItems.map((item: any) => {
      const attrs = item.attributes ?? {};
      const dateRange = Array.isArray(attrs.date) ? attrs.date[0] : attrs.date;
      return {
        id: item.id,
        type: item.type,
        title: attrs.title,
        start_date: isoInstant(dateRange?.value),
        end_date: isoInstant(dateRange?.end_value),
        status: attrs.moderation_state,
      };
    });

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

  /**
   * Wrap a Drupal response body as an MCP text content block. Guards against a
   * missing/undefined body: JSON.stringify(undefined) returns undefined (not a
   * string), which produces a content[0] with no `text` field and fails MCP
   * response validation. Emit an explicit message instead.
   */
  private jsonContent(data: unknown): CallToolResult {
    const text =
      data === undefined || data === null || data === ""
        ? "The request succeeded but returned no data."
        : JSON.stringify(data, null, 2);
    return { content: [{ type: "text", text }] };
  }

  /**
   * Fetch one event's full detail + live registration state via the Drupal
   * GET /api/1.0/events/{eventinstance_id} route (built in Phase A). Drupal
   * already Z-normalizes the dates and shapes the registration block, so this
   * is a thin passthrough with error handling. Uses the non-throwing
   * requestRaw accessor so a 404 is surfaced as a first-class error rather than
   * a thrown exception.
   */
  private async getEvent(eventinstanceId: string): Promise<CallToolResult> {
    if (!eventinstanceId || typeof eventinstanceId !== "string") {
      return this.errorResponse(
        "eventinstance_id is required",
        "Pass the event `id` from search_events."
      );
    }
    const actingUser = this.getActingUserAccessId(); // throws → aligned auth error if no acting user
    const auth = this.getDrupalAuth();
    const { status, data } = await auth.requestRaw(
      actingUser,
      "GET",
      `/api/1.0/events/${encodeURIComponent(eventinstanceId)}`
    );
    if (status === 404) {
      return this.errorResponse(
        `No event found with id ${eventinstanceId}`,
        "Check the id via search_events."
      );
    }
    if (status < 200 || status >= 300) {
      return this.errorResponse(`Events service error (${status})`, "Try again shortly.");
    }
    return this.jsonContent(data); // pass the Drupal detail through
  }

  /**
   * Register the acting user for an event via the Drupal
   * POST /api/1.0/events/{eventinstance_id}/register route (built in Phase A).
   * Without confirmed → a no-write preview; confirmed:true → commit + registrant_id.
   *
   * Status branching (via the non-throwing requestRaw accessor):
   *  - 2xx → pass the Drupal body through (preview or success shape).
   *  - 409 → a state-based refusal (e.g. already_registered, event_full,
   *    registration_closed). Surfaced as a FIRST-CLASS result
   *    { success:false, error, message } with isError UNSET — NOT a thrown/error
   *    response — so the LLM reads the refusal reason instead of an exception.
   *    (Phase A moved not_permitted to 409, so role refusals arrive here too.)
   *  - 403 → a genuine identity/auth failure from the RpAccountAccess gate (the
   *    acting-user could not be resolved/authorized). This is NOT a state refusal
   *    and must not be conflated with 409 — surface it as an actionable error.
   *  - 404 → no such event.
   *  - other non-2xx → generic service error.
   */
  private async registerForEvent(
    eventinstanceId: string,
    confirmed?: boolean
  ): Promise<CallToolResult> {
    if (!eventinstanceId || typeof eventinstanceId !== "string") {
      return this.errorResponse(
        "eventinstance_id is required",
        "Pass the event `id` from search_events or get_event."
      );
    }
    const actingUser = this.getActingUserAccessId(); // throws → aligned auth error if no acting user
    const auth = this.getDrupalAuth();
    const { status, data } = await auth.requestRaw(
      actingUser,
      "POST",
      `/api/1.0/events/${encodeURIComponent(eventinstanceId)}/register`,
      { confirmed: confirmed === true }
    );

    if (status >= 200 && status < 300) {
      // preview or success body, passed through
      return this.jsonContent(data);
    }

    // 409 = state-based refusal → first-class result (isError unset). Phase A
    // returns not_permitted as 409, so role refusals also land here.
    if (status === 409) {
      return this.jsonContent({
        success: false,
        error: data?.error ?? "refused",
        message: data?.message ?? "Registration was refused.",
      });
    }

    // A bare 403 (no not_permitted state code) is an identity/auth failure from
    // the acting-user gate, not a state refusal — never conflate it with 409.
    if (status === 403) {
      return this.errorResponse(
        "Not authorized to register — your acting-user identity could not be resolved or authorized.",
        data?.message ??
          "Confirm the X-Acting-User identity and the mcp_service credentials."
      );
    }

    if (status === 404) {
      return this.errorResponse(
        `No event found with id ${eventinstanceId}`,
        "Check the id via search_events."
      );
    }

    return this.errorResponse(`Events service error (${status})`, "Try again shortly.");
  }

  /**
   * List the acting user's event registrations via the Drupal
   * /api/1.0/registrations endpoint. The response body is
   * { registrations: [...] } at the top level (no data wrapper).
   */
  private async getMyRegistrations(when: string): Promise<CallToolResult> {
    const actingUser = this.getActingUserAccessId(); // throws → aligned auth error if no acting user
    const auth = this.getDrupalAuth();
    const body = await auth.get(
      actingUser,
      `/api/1.0/registrations?when=${encodeURIComponent(when)}`
    );
    return this.jsonContent(body); // body === { registrations: [...] }
  }

  /**
   * Cancel one of the acting user's registrations via the Drupal
   * DELETE /api/1.0/registrations/{registrant_id} endpoint. Ownership is
   * enforced server-side (403 for another user's registration; 404 for an
   * unknown id) and surfaces through the shared error handling above.
   */
  private async cancelRegistration(registrantId: string, confirmed?: boolean): Promise<CallToolResult> {
    if (!registrantId || typeof registrantId !== "string") {
      return this.errorResponse(
        "registrant_id is required",
        "Call get_my_registrations to find the registrant_id of the registration to cancel."
      );
    }
    // Enforce confirmation parameter (destructive tool — mirrors delete_announcement).
    // Require STRICT boolean true: truthy-but-not-true values (1, "false", {})
    // must not slip through and trigger an irreversible cancel.
    if (confirmed !== true) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error:
                "Cancellation requires explicit confirmation. You must show the registration's event details to the user and get explicit confirmation before setting confirmed=true.",
              registrant_id: registrantId,
            }),
          },
        ],
      };
    }
    const actingUser = this.getActingUserAccessId(); // throws → aligned auth error if no acting user
    const auth = this.getDrupalAuth();
    await auth.delete(
      actingUser,
      `/api/1.0/registrations/${encodeURIComponent(registrantId)}`
    );
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            message: `Registration ${registrantId} cancelled`,
            registrant_id: registrantId,
          }),
        },
      ],
    };
  }
}
