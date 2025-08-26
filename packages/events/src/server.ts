import { BaseAccessServer, handleApiError } from "@access-mcp/shared";
import axios, { AxiosInstance } from "axios";

export class EventsServer extends BaseAccessServer {
  private _eventsHttpClient?: AxiosInstance;

  constructor() {
    super("access-mcp-events", "0.1.0", "https://support.access-ci.org");
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
          "Get ACCESS-CI events with comprehensive filtering capabilities",
        inputSchema: {
          type: "object",
          properties: {
            // Relative date filtering
            beginning_date_relative: {
              type: "string",
              description:
                "Start date using relative values (today, +1week, -1month, etc.)",
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
                "End date using relative values (today, +1week, -1month, etc.)",
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
                "Start date in YYYY-MM-DD or YYYY-MM-DD HH:MM:SS format",
            },
            end_date: {
              type: "string",
              description:
                "End date in YYYY-MM-DD or YYYY-MM-DD HH:MM:SS format",
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
        description: "Get upcoming ACCESS-CI events (today onward)",
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
              description: "Filter by event type (workshop, webinar, etc.)",
            },
          },
          required: [],
        },
      },
      {
        name: "search_events",
        description: "Search events by keywords in title and description",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for event titles and descriptions",
            },
            beginning_date_relative: {
              type: "string",
              description: "Start date using relative values (default: today)",
              default: "today",
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
        description: "Get events filtered by specific tags",
        inputSchema: {
          type: "object",
          properties: {
            tag: {
              type: "string",
              description:
                "Event tag to filter by (e.g., python, machine-learning, gpu)",
            },
            time_range: {
              type: "string",
              description: "Time range for events",
              enum: ["upcoming", "this_week", "this_month", "all"],
              default: "upcoming",
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
    const url = new URL("/api/2.0/events", this.baseURL);

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
      // Parse dates for better handling
      start_date: new Date(event.date),
      end_date: event.date_1 ? new Date(event.date_1) : null,
      // Split tags into array
      tags: event.custom_event_tags
        ? event.custom_event_tags.split(",").map((tag: string) => tag.trim())
        : [],
      // Calculate duration if both dates present
      duration_hours: event.date_1
        ? Math.round(
            (new Date(event.date_1).getTime() -
              new Date(event.date).getTime()) /
              (1000 * 60 * 60),
          )
        : null,
      // Relative timing
      starts_in_hours: Math.max(
        0,
        Math.round(
          (new Date(event.date).getTime() - Date.now()) / (1000 * 60 * 60),
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
    };

    return this.getEvents(upcomingParams);
  }

  private async searchEvents(params: any) {
    const searchParams = {
      beginning_date_relative: params.beginning_date_relative || "today",
      limit: params.limit || 25,
    };

    // Get events and filter by search query
    const eventsResponse = await this.getEvents(searchParams);
    const eventsData = JSON.parse(eventsResponse.content[0].text);

    const query = params.query.toLowerCase();
    const filteredEvents = eventsData.events.filter(
      (event: any) =>
        event.title?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.speakers?.toLowerCase().includes(query) ||
        event.tags?.some((tag: string) => tag.toLowerCase().includes(query)),
    );

    const summary = {
      search_query: params.query,
      total_matches: filteredEvents.length,
      searched_in: eventsData.total_events,
      events: filteredEvents,
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
    const { tag, time_range = "upcoming", limit = 25 } = params;

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
