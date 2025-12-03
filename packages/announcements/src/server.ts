import { BaseAccessServer, Tool, Resource, CallToolResult } from "@access-mcp/shared";
import { CallToolRequest, ReadResourceRequest, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

interface SearchAnnouncementsArgs {
  tags?: string;
  date?: string;
  limit?: number;
}

interface AnnouncementFilters {
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
  title: string;
  body: string;
  published_date: string;
  affinity_group: string[];
  tags: string[];
  affiliation: string;
  summary?: string;
}

export class AnnouncementsServer extends BaseAccessServer {
  constructor() {
    super("access-announcements", "0.1.0", "https://support.access-ci.org");
  }

  protected getTools(): Tool[] {
    return [
      {
        name: "search_announcements",
        description: "Search ACCESS announcements (news, updates, notifications). Returns {total, items}.",
        inputSchema: {
          type: "object",
          properties: {
            tags: {
              type: "string",
              description: "Filter by topics: gpu, ml, hpc"
            },
            date: {
              type: "string",
              description: "Time period filter",
              enum: ["today", "this_week", "this_month", "past"]
            },
            limit: {
              type: "number",
              description: "Max results (default: 25)",
              default: 25
            }
          }
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

  protected async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "search_announcements":
          return await this.searchAnnouncements(args as SearchAnnouncementsArgs);
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

  private normalizeLimit(limit?: number): number {
    // Drupal API only accepts specific pagination values: 5, 10, 25, 50
    const requestedLimit = limit || 25; // Default to 25 (valid API value)

    // Find the closest valid size
    if (requestedLimit <= 5) return 5;
    if (requestedLimit <= 10) return 10;
    if (requestedLimit <= 25) return 25;
    return 50;
  }

  private buildAnnouncementsUrl(filters: AnnouncementFilters): string {
    const params = new URLSearchParams();
    params.append("items_per_page", String(this.normalizeLimit(filters.limit)));

    if (filters.tags) {
      params.append("tags", filters.tags);
    }

    // Map universal 'date' to API params
    const dateMap: Record<string, {start: string, end?: string}> = {
      today: {start: "today"},
      this_week: {start: "-1 week", end: "now"},
      this_month: {start: "-1 month", end: "now"},
      past: {start: "-1 year", end: "now"}
    };

    if (filters.date && dateMap[filters.date]) {
      params.append("relative_start_date", dateMap[filters.date].start);
      if (dateMap[filters.date].end) {
        params.append("relative_end_date", dateMap[filters.date].end);
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
      tags: Array.isArray(announcement.tags) ? announcement.tags : [],
      body_preview: announcement.summary || (announcement.body ? announcement.body.replace(/<[^>]*>/g, '').substring(0, 200) + '...' : '')
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
}