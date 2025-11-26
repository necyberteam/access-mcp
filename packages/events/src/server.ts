import { BaseAccessServer, handleApiError, UniversalSearchParams, UniversalResponse } from "@access-mcp/shared";
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
        name: "search_events",
        description: "Search ACCESS-CI events (workshops, webinars, training). Returns {total, items}.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search titles, descriptions, speakers, tags"
            },
            type: {
              type: "string",
              description: "Filter: workshop, webinar, training"
            },
            tags: {
              type: "string",
              description: "Filter: python, gpu, hpc, ml"
            },
            date: {
              type: "string",
              description: "Filter by time period",
              enum: ["today", "upcoming", "past", "this_week", "this_month"]
            },
            skill: {
              type: "string",
              description: "Skill level filter",
              enum: ["beginner", "intermediate", "advanced"]
            },
            limit: {
              type: "number",
              description: "Max results (default: 50)",
              default: 50
            }
          }
        }
      }
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
        case "search_events":
          return await this.searchEvents(args);
        default:
          return this.errorResponse(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return this.errorResponse(handleApiError(error));
    }
  }

  async handleResourceRead(request: any) {
    const { uri } = request.params;

    switch (uri) {
      case "accessci://events":
        const allEvents = await this.searchEvents({});
        return this.createJsonResource(uri, JSON.parse(allEvents.content[0].text));
      case "accessci://events/upcoming":
        const upcomingEvents = await this.searchEvents({ date: "upcoming" });
        return this.createJsonResource(uri, JSON.parse(upcomingEvents.content[0].text));
      case "accessci://events/workshops":
        const workshops = await this.searchEvents({ type: "workshop" });
        return this.createJsonResource(uri, JSON.parse(workshops.content[0].text));
      case "accessci://events/webinars":
        const webinars = await this.searchEvents({ type: "webinar" });
        return this.createJsonResource(uri, JSON.parse(webinars.content[0].text));
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  private buildEventsUrl(params: any): string {
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
    const dateMap: Record<string, {start: string, end?: string}> = {
      today: {start: "today"},
      upcoming: {start: "today"},
      past: {start: "-1year", end: "today"},
      this_week: {start: "today", end: "+1week"},
      this_month: {start: "today", end: "+1month"}
    };

    if (params.date && dateMap[params.date]) {
      const dateMapping = dateMap[params.date];
      url.searchParams.set("beginning_date_relative", dateMapping.start);
      if (dateMapping.end) {
        url.searchParams.set("end_date_relative", dateMapping.end);
      }
    }

    // Faceted filters
    let filterIndex = 0;
    if (params.type) {
      url.searchParams.set(`f[${filterIndex}]`, `custom_event_type:${params.type}`);
      filterIndex++;
    }
    if (params.tags) {
      url.searchParams.set(`f[${filterIndex}]`, `custom_event_tags:${params.tags}`);
      filterIndex++;
    }
    if (params.skill) {
      url.searchParams.set(`f[${filterIndex}]`, `skill_level:${params.skill}`);
      filterIndex++;
    }

    return url.toString();
  }

  private async getEvents(params: any) {
    const url = this.buildEventsUrl(params);
    const response = await this.httpClient.get(url);

    if (response.status !== 200) {
      throw new Error(`API error ${response.status}`);
    }

    let events = response.data || [];
    if (params.limit && events.length > params.limit) {
      events = events.slice(0, params.limit);
    }

    const enhancedEvents = events.map((event: any) => ({
      ...event,
      tags: Array.isArray(event.tags) ? event.tags : [],
      duration_hours: event.end_date
        ? Math.round((new Date(event.end_date).getTime() - new Date(event.start_date).getTime()) / 3600000)
        : null,
      starts_in_hours: Math.max(0, Math.round((new Date(event.start_date).getTime() - Date.now()) / 3600000))
    }));

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          total: enhancedEvents.length,
          items: enhancedEvents
        })
      }]
    };
  }

  private async searchEvents(params: any) {
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
}
