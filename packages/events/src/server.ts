import { BaseAccessServer, handleApiError } from "@access-mcp/shared";
import axios, { AxiosInstance } from "axios";

export class EventsServer extends BaseAccessServer {
  private _eventsHttpClient?: AxiosInstance;

  constructor() {
    super("access-mcp-events", "0.3.0", "https://support.access-ci.org");
  }

  protected get httpClient(): AxiosInstance {
    if (!this._eventsHttpClient) {
      const headers: any = {
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

  protected getTools() {
    return [
      {
        name: "get_events",
        description:
          "Get ACCESS-CI events with comprehensive filtering capabilities. Returns events in UTC timezone with enhanced metadata.",
        inputSchema: {
          type: "object",
          properties: {
            // Relative date filtering
            beginning_date_relative: {
              type: "string",
              description:
                "Start date using relative values. Calculated in UTC by default, or use 'timezone' parameter for local calculations.",
              enum: [
                "today",
                "+1week",
                "+2week",
                "+1month",
                "+2month",
                "+1year",
                "-1week",
                "-1month",
                "-1year",
              ],
            },
            end_date_relative: {
              type: "string",
              description:
                "End date using relative values. Calculated in UTC by default, or use 'timezone' parameter for local calculations.",
              enum: [
                "today",
                "+1week",
                "+2week",
                "+1month",
                "+2month",
                "+1year",
                "-1week",
                "-1month",
                "-1year",
              ],
            },
            // Absolute date filtering
            beginning_date: {
              type: "string",
              description:
                "Start date in YYYY-MM-DD or YYYY-MM-DD HH:MM:SS format. Always interpreted as provided (no timezone conversion).",
            },
            end_date: {
              type: "string",
              description:
                "End date in YYYY-MM-DD or YYYY-MM-DD HH:MM:SS format. Always interpreted as provided (no timezone conversion).",
            },
            // Timezone parameter for relative date calculations
            timezone: {
              type: "string",
              description:
                "Timezone for relative date calculations (default: UTC). Common values: UTC, America/New_York (Eastern), America/Chicago (Central), America/Denver (Mountain), America/Los_Angeles (Pacific), Europe/London (British), Europe/Berlin (CET). Only affects relative dates, not absolute dates. Invalid timezones default to UTC.",
              default: "UTC",
            },
            // Faceted search filters
            event_type: {
              type: "string",
              description: "Filter by event type (workshop, webinar, etc.)",
            },
            event_affiliation: {
              type: "string",
              description:
                "Filter by organizational affiliation (Community, ACCESS, etc.)",
            },
            skill_level: {
              type: "string",
              description:
                "Filter by required skill level (beginner, intermediate, advanced)",
              enum: ["beginner", "intermediate", "advanced"],
            },
            event_tags: {
              type: "string",
              description:
                "Filter by event tags (python, big-data, machine-learning, etc.)",
            },
            limit: {
              type: "number",
              description: "Maximum number of events to return (default: 100)",
              minimum: 1,
              maximum: 1000,
            },
          },
          required: [],
        },
      },
      {
        name: "get_upcoming_events",
        description: "Get upcoming ACCESS-CI events (from today onward in UTC). Convenient shortcut for get_events with beginning_date_relative=today.",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Maximum number of events to return (default: 50)",
              minimum: 1,
              maximum: 100,
            },
            event_type: {
              type: "string",
              description: "Filter by event type (workshop, webinar, Office Hours, Training, etc.)",
            },
            timezone: {
              type: "string",
              description: "Timezone for 'today' calculation (default: UTC). Use user's local timezone for better relevance.",
              default: "UTC",
            },
          },
          required: [],
        },
      },
      {
        name: "search_events",
        description: "Search events using API's native full-text search. Searches across titles, descriptions, speakers, tags, location, and event type. Much more powerful than tag filtering.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (case-insensitive). Use spaces for multiple words (e.g., 'machine learning', 'office hours'). Searches across all event content including descriptions.",
            },
            beginning_date_relative: {
              type: "string",
              description: "Start date using relative values (default: today). Use '-1month' or '-1year' to search past events, or omit for all-time search.",
              default: "today",
            },
            timezone: {
              type: "string",
              description: "Timezone for relative date calculation (default: UTC)",
              default: "UTC",
            },
            limit: {
              type: "number",
              description: "Maximum number of events to return (default: 25)",
              minimum: 1,
              maximum: 100,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_events_by_tag",
        description: "Get events filtered by specific tags. Useful for finding events on topics like 'python', 'ai', 'machine-learning', 'gpu', etc.",
        inputSchema: {
          type: "object",
          properties: {
            tag: {
              type: "string",
              description:
                "Event tag to filter by. Common tags: python, ai, machine-learning, gpu, deep-learning, neural-networks, big-data, hpc, jetstream, neocortex",
            },
            time_range: {
              type: "string",
              description: "Time range for events (upcoming=today onward, this_week=next 7 days, this_month=next 30 days, all=no date filter)",
              enum: ["upcoming", "this_week", "this_month", "all"],
              default: "upcoming",
            },
            timezone: {
              type: "string",
              description: "Timezone for time_range calculations (default: UTC)",
              default: "UTC",
            },
            limit: {
              type: "number",
              description: "Maximum number of events to return (default: 25)",
              minimum: 1,
              maximum: 100,
            },
          },
          required: ["tag"],
        },
      },
    ];
  }

  protected getResources() {
    return [
      {
        uri: "accessci://events",
        name: "ACCESS-CI Events",
        description:
          "Comprehensive events data including workshops, webinars, and training",
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

  async handleToolCall(request: any) {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case "get_events":
          return await this.getEvents(args);
        case "get_upcoming_events":
          return await this.getUpcomingEvents(args);
        case "search_events":
          return await this.searchEvents(args);
        case "get_events_by_tag":
          return await this.getEventsByTag(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${handleApiError(error)}`,
          },
        ],
      };
    }
  }

  async handleResourceRead(request: any) {
    const { uri } = request.params;

    switch (uri) {
      case "accessci://events":
        const allEvents = await this.getEvents({});
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: allEvents.content[0].text,
            },
          ],
        };
      case "accessci://events/upcoming":
        const upcomingEvents = await this.getUpcomingEvents({});
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: upcomingEvents.content[0].text,
            },
          ],
        };
      case "accessci://events/workshops":
        const workshops = await this.getEvents({ event_type: "workshop" });
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: workshops.content[0].text,
            },
          ],
        };
      case "accessci://events/webinars":
        const webinars = await this.getEvents({ event_type: "webinar" });
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: webinars.content[0].text,
            },
          ],
        };
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  private buildEventsUrl(params: any): string {
    const url = new URL("/api/2.2/events", this.baseURL);

    // Add pagination - 2.2 API requires specific values: 25, 50, 75, or 100
    const limit = params.limit || 100;
    let itemsPerPage = 25;
    if (limit >= 100) itemsPerPage = 100;
    else if (limit >= 75) itemsPerPage = 75;
    else if (limit >= 50) itemsPerPage = 50;
    else itemsPerPage = 25;
    url.searchParams.set("items_per_page", String(itemsPerPage));

    // Add full-text search parameter (API native search)
    if (params.search_api_fulltext) {
      url.searchParams.set("search_api_fulltext", params.search_api_fulltext);
    }

    // Add date filtering parameters
    if (params.beginning_date_relative) {
      url.searchParams.set(
        "beginning_date_relative",
        params.beginning_date_relative,
      );
    }
    if (params.end_date_relative) {
      url.searchParams.set("end_date_relative", params.end_date_relative);
    }
    if (params.beginning_date) {
      url.searchParams.set("beginning_date", params.beginning_date);
    }
    if (params.end_date) {
      url.searchParams.set("end_date", params.end_date);
    }

    // Add timezone parameter for relative date calculations
    if (params.timezone) {
      url.searchParams.set("timezone", params.timezone);
    }

    // Add faceted search filters
    let filterIndex = 0;
    if (params.event_type) {
      url.searchParams.set(
        `f[${filterIndex}]`,
        `custom_event_type:${params.event_type}`,
      );
      filterIndex++;
    }
    if (params.event_affiliation) {
      url.searchParams.set(
        `f[${filterIndex}]`,
        `custom_event_affiliation:${params.event_affiliation}`,
      );
      filterIndex++;
    }
    if (params.skill_level) {
      url.searchParams.set(
        `f[${filterIndex}]`,
        `skill_level:${params.skill_level}`,
      );
      filterIndex++;
    }
    if (params.event_tags) {
      url.searchParams.set(
        `f[${filterIndex}]`,
        `custom_event_tags:${params.event_tags}`,
      );
      filterIndex++;
    }

    return url.toString();
  }

  private async getEvents(params: any) {
    const url = this.buildEventsUrl(params);
    const response = await this.httpClient.get(url);

    if (response.status !== 200) {
      throw new Error(
        `Events API returned ${response.status}: ${response.statusText}`,
      );
    }

    let events = response.data || [];

    // Apply limit if specified
    if (params.limit && events.length > params.limit) {
      events = events.slice(0, params.limit);
    }

    // Enhance events with additional metadata
    const enhancedEvents = events.map((event: any) => ({
      ...event,
      // Parse dates for better handling (2.2 API already uses start_date/end_date)
      start_date_parsed: new Date(event.start_date),
      end_date_parsed: event.end_date ? new Date(event.end_date) : null,
      // Tags are already an array in 2.2 API
      tags: Array.isArray(event.tags) ? event.tags : [],
      // Calculate duration if both dates present
      duration_hours: event.end_date
        ? Math.round(
            (new Date(event.end_date).getTime() -
              new Date(event.start_date).getTime()) /
              (1000 * 60 * 60),
          )
        : null,
      // Relative timing
      starts_in_hours: Math.max(
        0,
        Math.round(
          (new Date(event.start_date).getTime() - Date.now()) / (1000 * 60 * 60),
        ),
      ),
    }));

    const summary = {
      total_events: enhancedEvents.length,
      upcoming_events: enhancedEvents.filter((e: any) => e.starts_in_hours >= 0)
        .length,
      events_this_week: enhancedEvents.filter(
        (e: any) => e.starts_in_hours <= 168 && e.starts_in_hours >= 0,
      ).length,
      api_info: {
        endpoint_version: "2.2",
        timezone_handling: "All timestamps in UTC (Z suffix). Relative dates calculated using timezone parameter (default: UTC).",
        timezone_used: params.timezone || "UTC",
        pagination: "API requires items_per_page in [25, 50, 75, 100]",
      },
      event_types: [
        ...new Set(
          enhancedEvents.map((e: any) => e.event_type).filter(Boolean),
        ),
      ],
      affiliations: [
        ...new Set(
          enhancedEvents.map((e: any) => e.event_affiliation).filter(Boolean),
        ),
      ],
      skill_levels: [
        ...new Set(
          enhancedEvents.map((e: any) => e.skill_level).filter(Boolean),
        ),
      ],
      popular_tags: this.getPopularTags(enhancedEvents),
      events: enhancedEvents,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  private async getUpcomingEvents(params: any) {
    const upcomingParams = {
      ...params,
      beginning_date_relative: "today",
      limit: params.limit || 50,
      // Pass through timezone if provided
      ...(params.timezone && { timezone: params.timezone }),
    };

    return this.getEvents(upcomingParams);
  }

  private async searchEvents(params: any) {
    // Use API's native full-text search instead of client-side filtering
    const searchParams = {
      search_api_fulltext: params.query,
      beginning_date_relative: params.beginning_date_relative || "today",
      limit: params.limit || 25,
      // Pass through timezone if provided
      ...(params.timezone && { timezone: params.timezone }),
    };

    // Use the API's native search capabilities
    const eventsResponse = await this.getEvents(searchParams);
    const eventsData = JSON.parse(eventsResponse.content[0].text);

    // API returns already filtered results, no need for client-side filtering
    const summary = {
      search_query: params.query,
      total_matches: eventsData.total_events,
      search_method: "API native full-text search",
      search_scope: "titles, descriptions, speakers, tags, location, event type",
      events: eventsData.events,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  private async getEventsByTag(params: any) {
    const { tag, time_range = "upcoming", limit = 25, timezone } = params;

    let dateParams: any = {};
    switch (time_range) {
      case "upcoming":
        dateParams.beginning_date_relative = "today";
        break;
      case "this_week":
        dateParams.beginning_date_relative = "today";
        dateParams.end_date_relative = "+1week";
        break;
      case "this_month":
        dateParams.beginning_date_relative = "today";
        dateParams.end_date_relative = "+1month";
        break;
      case "all":
        // No date restrictions
        break;
    }

    const taggedParams = {
      ...dateParams,
      event_tags: tag,
      limit,
      // Pass through timezone if provided
      ...(timezone && { timezone }),
    };

    const eventsResponse = await this.getEvents(taggedParams);
    const eventsData = JSON.parse(eventsResponse.content[0].text);

    const summary = {
      tag: tag,
      time_range: time_range,
      total_events: eventsData.events.length,
      events: eventsData.events,
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  private getPopularTags(events: any[]): string[] {
    const tagCounts: { [key: string]: number } = {};

    events.forEach((event) => {
      if (event.tags) {
        event.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);
  }
}
