import {
  BaseAccessServer,
  handleApiError,
  projectFields,
  Tool,
  Resource,
  CallToolResult,
  DrupalAuthProvider,
  DrupalApiError,
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
  // The flat /api/2.3/events API serializes Drupal boolean fields as the
  // strings 'Yes'/'No' and numeric fields as strings ('0'/'11'), so these
  // arrive as strings in practice. Typed permissively and parsed at the map
  // (see parseDrupalBool / access_registration below) — do NOT treat the raw
  // value as a JS truthiness test, since Boolean('No') === true.
  registration_enabled?: string | boolean | number;
  registration_capacity?: string | number;
  registration_has_waitlist?: string | boolean | number;
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

/**
 * Parse a Drupal boolean value that may arrive as a string. The flat
 * /api/2.3/events API renders boolean fields as the strings 'Yes'/'No'
 * (not JS booleans), so a naive `Boolean(value)` is wrong — Boolean('No')
 * is `true`. Treats 'yes'/'true'/'1'/true/1 as true; everything else
 * ('no'/'false'/'0'/''/false/0/null/undefined) as false. Mirrors the
 * jsm server's Yes/No convention.
 */
export function parseDrupalBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const val = String(value ?? "").trim().toLowerCase();
  return val === "yes" || val === "true" || val === "1";
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
        description: `Events the acting user CREATED or organized — NOT events they are attending. For events the user has registered to attend, use get_my_registrations instead.

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
          "Fetch one ACCESS event's full detail and LIVE registration state (seats_remaining, registration_open, and whether the acting user is already_registered). Use before register_for_event to show the user current availability. Read the top-level registration_path to decide how to register: \"native\" means native ACCESS registration is on — use register_for_event (any external offsite link is surfaced as external_registration_url, a labeled alternative); \"external\" means native registration is off but an offsite registration_url exists — direct the user there, register_for_event does NOT apply; \"none\" means no registration is available. Before reporting seat availability, read registration.capacity_type: \"limited\" means seats_remaining is a real count, \"unlimited\" means there is no cap — do not report a seat count.",
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
          "Register the acting user for an ACCESS event via native ACCESS registration. WITHOUT `confirmed` (or confirmed:false) this returns a PREVIEW of what would happen (seat vs. waitlist) and writes NOTHING. WITH confirmed:true it registers. Returns the write-envelope shape {action:\"register\", status, executed, data}: read `status` (preview | registered | waitlisted | already_registered) and `executed` (true only when a write actually happened). status:\"preview\" means executed:false — nothing was written; call again with confirmed:true to commit. status:\"registered\"/\"waitlisted\" carries data.registrant_id. status:\"already_registered\" (executed:false) means the acting user already holds a seat — no change. Refusals (event_full, registration_closed, not_registrable, not_permitted) come back as errors with a machine-readable `code`. Pair with get_event (live availability before registering), get_my_registrations (list the acting user's registrations), and cancel_registration (cancel one, takes the registrant_id).",
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
                "Omit or false for a no-write preview (status:\"preview\", executed:false — seat vs. waitlist); true to actually register (status:\"registered\"/\"waitlisted\", executed:true).",
            },
          },
          required: ["eventinstance_id"],
        },
      },
      {
        name: "cancel_registration",
        description:
          "Permanently cancel one of the authenticated user's OWN event registrations. Pass registrant_id, obtained from get_my_registrations. This cannot cancel other users' registrations — it is scoped to the authenticated acting user. WITHOUT confirmed:true (confirmed:false or omitted) this returns a PREVIEW of what would be cancelled (the registration's event title and start date) and writes NOTHING — show it to the user for confirmation. WITH confirmed:true it permanently cancels the registration. Returns the write-envelope shape {action:\"cancel\", status, executed, data}: read `status` (preview | cancelled) and `executed` (true only when a cancel actually happened). status:\"preview\" means executed:false — nothing was cancelled; call again with confirmed:true to commit. An unknown registrant_id (or one that is not yours) comes back as an error with code:\"not_found\".",
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
        // distinct from the external registration_url below. The flat API
        // sends these as Drupal strings ('Yes'/'No', '0'/'11'), so parse
        // rather than testing raw truthiness (Boolean('No') === true).
        access_registration: parseDrupalBool(registration_enabled)
          ? {
              enabled: true,
              // capacity 0 means unlimited → null; also NaN/absent → null.
              capacity: (() => {
                const n = parseInt(String(registration_capacity), 10);
                return Number.isNaN(n) || n === 0 ? null : n;
              })(),
              has_waitlist: parseDrupalBool(registration_has_waitlist),
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
   * GET /api/2.3/events/{eventinstance_id} route. Drupal
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
      `/api/2.3/events/${encodeURIComponent(eventinstanceId)}`
    );
    if (status === 404) {
      return this.errorResponse(
        `No event found with id ${eventinstanceId}`,
        "Check the id via search_events."
      );
    }
    const authError = this.authRedirectError(status);
    if (authError) return authError;
    if (status < 200 || status >= 300) {
      return this.errorResponse(
        `Events service error (${status})`,
        "Try again shortly.",
        "upstream_error"
      );
    }
    // Compute a single top-level registration_path so a caller reads one value
    // instead of inferring intent from two peer fields (native registration vs
    // an external URL). When native is enabled AND an external URL is present,
    // relocate the URL to a labeled external_registration_url and drop the
    // ambiguous registration_url key.
    const detail = data as Record<string, any>;
    const nativeEnabled = detail.registration?.enabled === true;
    const externalUrl =
      typeof detail.registration_url === "string" ? detail.registration_url : undefined;
    let registration_path: "native" | "external" | "none";
    if (nativeEnabled) {
      registration_path = "native";
      if (externalUrl) {
        detail.external_registration_url = externalUrl;
        delete detail.registration_url;
      }
    } else if (externalUrl) {
      registration_path = "external";
    } else {
      registration_path = "none";
    }
    detail.registration_path = registration_path;
    return this.jsonContent(detail);
  }

  /**
   * A 3xx from an authenticated Drupal request means the session was rejected and
   * Drupal is redirecting to the CILogon login page (maxRedirects:0 keeps it a 3xx
   * rather than following it and returning the login HTML). Surface a clear auth
   * error instead of a generic "service error" so the agent/user knows to
   * re-authenticate. Returns null for non-redirect statuses.
   */
  private authRedirectError(status: number): CallToolResult | null {
    if (status >= 300 && status < 400) {
      return this.errorResponse(
        "Authentication required: your ACCESS session may have expired.",
        "Re-authenticate the ACCESS connector and try again."
      );
    }
    return null;
  }

  /**
   * Register the acting user for an event via the Drupal
   * POST /api/1.0/events/{eventinstance_id}/register route.
   * Without confirmed → a no-write preview; confirmed:true → commit + registrant_id.
   *
   * Every non-error outcome returns the StandardWriteResponse envelope
   * ({action:"register", status, executed, data?}); errors go through
   * errorResponse ({error, hint?, code}, isError:true).
   *
   * Status branching (via the non-throwing requestRaw accessor):
   *  - 2xx → a writeResponse. status "registered"/"waitlisted" with executed:true
   *    (a commit) when confirmed:true, else status "preview" with executed:false
   *    (the projected outcome_if_confirmed; no write performed). The raw Drupal
   *    body is NOT passed through — it is remapped onto the envelope.
   *  - 409 = state-based refusal. already_registered is the ONLY 409 that is a
   *    terminal, non-error writeResponse (status "already_registered",
   *    executed:false — the user already holds a seat). Every OTHER 409 code
   *    (event_full, registration_closed, not_permitted) is an errorResponse
   *    carrying the Drupal `code` (isError:true). The Drupal route returns
   *    not_permitted as 409, so role refusals arrive here too.
   *  - 403 → a genuine identity/auth failure from the acting-user gate
   *    (ActingUserAccess / acting_user_uid resolution; the acting-user could not
   *    be resolved/authorized). This is NOT a state refusal and must not be
   *    conflated with 409 — errorResponse with code "auth_required".
   *  - 404 → no such event; errorResponse with code "not_found".
   *  - other non-2xx → errorResponse with code "upstream_error".
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
      // Commit (confirmed:true) → Drupal returns a terminal status; preview
      // (confirmed omitted/false) → the projected outcome, no write performed.
      if (data?.status === "registered" || data?.status === "waitlisted") {
        return this.writeResponse({
          action: "register",
          status: data.status,
          executed: true,
          data: { registrant_id: data.registrant_id },
        });
      }
      // The real Drupal preview body always carries outcome_if_confirmed (see the
      // spec Ground Truth), so no guard is needed here — reading it unconditionally
      // is safe. If it were ever absent, JSON.stringify drops the undefined key and
      // data serializes to {}; the envelope stays conformant either way.
      return this.writeResponse({
        action: "register",
        status: "preview",
        executed: false,
        data: {
          outcome_if_confirmed: data?.outcome_if_confirmed,
          ...(data?.waitlisted_count != null && {
            waitlisted_count: data.waitlisted_count,
          }),
        },
      });
    }

    // 409 = state-based refusal. already_registered is a terminal, non-error
    // status (the user already holds a seat); every other 409 code is an
    // actionable error carrying the Drupal code. The Drupal route returns
    // not_permitted as 409, so role refusals also arrive here.
    if (status === 409) {
      if (data?.error === "already_registered") {
        return this.writeResponse({
          action: "register",
          status: "already_registered",
          executed: false,
        });
      }
      return this.errorResponse(
        data?.message ?? "Registration refused.",
        "See the event's registration state via get_event.",
        data?.error
      );
    }

    // A bare 403 (no not_permitted state code) is an identity/auth failure from
    // the acting-user gate, not a state refusal — never conflate it with 409.
    if (status === 403) {
      return this.errorResponse(
        "Not authorized to register — your acting-user identity could not be resolved or authorized.",
        "Re-authenticate the ACCESS connector and try again.",
        "auth_required"
      );
    }

    if (status === 404) {
      return this.errorResponse(
        `No event found with id ${eventinstanceId}`,
        "Check the id via search_events.",
        "not_found"
      );
    }

    const authError = this.authRedirectError(status);
    if (authError) return authError;

    return this.errorResponse(
      `Events service error (${status})`,
      "Try again shortly.",
      "upstream_error"
    );
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
   * DELETE /api/1.0/registrations/{registrant_id} endpoint. PREVIEW-by-default:
   *
   *  - confirmed !== true → a no-write PREVIEW. Looks the registration up in the
   *    acting user's when=all registration list (when=all, NOT the default
   *    upcoming, so a past-dated registration still previews) and returns the
   *    write envelope {action:"cancel", status:"preview", executed:false, data:
   *    {registrant_id, event}}. STRICT === true gates the destructive path — a
   *    truthy-but-not-true value (1, "true") lands here, never on the delete.
   *    An unknown registrant_id (not in the when=all list) → errorResponse
   *    code:"not_found".
   *  - confirmed === true → EXECUTE the DELETE. On 2xx → {action:"cancel",
   *    status:"cancelled", executed:true, data:{registrant_id}}. auth.delete
   *    throws DrupalApiError on non-2xx: 404 (unknown/other id) → code:"not_found",
   *    403 (non-owner) → code:"forbidden", else → code:"upstream_error". Branches
   *    on DrupalApiError.status structurally, never on the message string.
   */
  private async cancelRegistration(registrantId: string, confirmed?: boolean): Promise<CallToolResult> {
    if (!registrantId || typeof registrantId !== "string") {
      return this.errorResponse(
        "registrant_id is required",
        "Call get_my_registrations to find the registrant_id of the registration to cancel."
      );
    }
    const actingUser = this.getActingUserAccessId(); // throws → aligned auth error if no acting user
    const auth = this.getDrupalAuth();

    // PREVIEW (confirmed omitted/false, or any truthy-but-not-true value). Never
    // deletes — enforce STRICT boolean true so 1/"true"/{} cannot trigger an
    // irreversible cancel. Look the registration up in the acting user's when=all
    // list so a past-dated registration still previews.
    if (confirmed !== true) {
      let body: { registrations?: Array<Record<string, unknown>> } | undefined;
      try {
        body = await auth.get(actingUser, `/api/1.0/registrations?when=all`);
      } catch (error) {
        // The preview lookup can itself fail. Carry the same machine-readable
        // code as the execute path so callers branch identically (403→forbidden,
        // else→upstream_error); a failed read never means the registration is
        // absent, so it must NOT map to not_found.
        if (error instanceof DrupalApiError) {
          if (error.status === 403) {
            return this.errorResponse(
              "Not authorized to look up your registrations.",
              "Re-authenticate the ACCESS connector and try again.",
              "forbidden"
            );
          }
          return this.errorResponse(
            `Events service error (${error.status})`,
            "Try again shortly.",
            "upstream_error"
          );
        }
        throw error;
      }
      const registrations = (body?.registrations ?? []) as Array<Record<string, unknown>>;
      const row = registrations.find((r) => r.registrant_id === registrantId);
      if (!row) {
        return this.errorResponse(
          "Registration not found (or not yours).",
          "Call get_my_registrations to find your registrant_id.",
          "not_found"
        );
      }
      return this.writeResponse({
        action: "cancel",
        status: "preview",
        executed: false,
        data: {
          registrant_id: registrantId,
          event: {
            title: row.event_title,
            start_date: row.start_date,
          },
        },
      });
    }

    // EXECUTE the destructive cancel. auth.delete throws DrupalApiError on
    // non-2xx; branch on the structured .status (not the message string).
    try {
      await auth.delete(
        actingUser,
        `/api/1.0/registrations/${encodeURIComponent(registrantId)}`
      );
    } catch (error) {
      if (error instanceof DrupalApiError) {
        if (error.status === 404) {
          return this.errorResponse(
            "Registration not found (or not yours).",
            "Call get_my_registrations to find your registrant_id.",
            "not_found"
          );
        }
        if (error.status === 403) {
          return this.errorResponse(
            "Not authorized to cancel this registration — you may only cancel your own.",
            "Confirm the registrant_id belongs to you via get_my_registrations.",
            "forbidden"
          );
        }
        return this.errorResponse(
          `Events service error (${error.status})`,
          "Try again shortly.",
          "upstream_error"
        );
      }
      throw error;
    }

    return this.writeResponse({
      action: "cancel",
      status: "cancelled",
      executed: true,
      data: { registrant_id: registrantId },
    });
  }
}
