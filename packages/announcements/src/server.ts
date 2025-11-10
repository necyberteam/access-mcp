import { BaseAccessServer } from "@access-mcp/shared";

interface AnnouncementFilters {
  tags?: string;
  ag?: string;
  affiliation?: string;
  relative_start_date?: string;
  relative_end_date?: string;
  start_date?: string;
  end_date?: string;
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

  protected getTools() {
    return [
      {
        name: "get_announcements",
        description: "Search ACCESS support announcements about system maintenance, service updates, outages, and community news. Use this when users ask about recent announcements, service status, or need to filter by dates, tags, or affinity groups.",
        inputSchema: {
          type: "object",
          properties: {
            tags: {
              type: "string",
              description: "Filter by specific topics (comma-separated). Real examples: 'gpu,nvidia', 'machine-learning,ai', 'maintenance,downtime', 'training,workshop', 'allocation-users', 'data-science', 'cloud-computing', 'bridges-2,anvil'"
            },
            ag: {
              type: "string", 
              description: "Filter by system/community affinity group. Real examples: 'ACCESS Support', 'DELTA', 'Anvil', 'Bridges-2', 'CSSN (Computational Science Support Network)', 'Open OnDemand', 'Pegasus'"
            },
            affiliation: {
              type: "string",
              description: "Filter by organization affiliation (e.g., 'ACCESS')"
            },
            relative_start_date: {
              type: "string",
              description: "Filter announcements from a relative date. Examples: 'today', '-1 week', '-1 month', '-3 months', '-1 year'. Use negative values for past dates"
            },
            relative_end_date: {
              type: "string", 
              description: "Filter announcements up to a relative date. Examples: 'now', 'today', '-1 week' (past), '+1 week' (future)"
            },
            start_date: {
              type: "string",
              description: "Filter announcements from exact date onwards (YYYY-MM-DD). Use when users specify dates like 'since January 1st, 2024' or 'from March 15th'",
              format: "date"
            },
            end_date: {
              type: "string",
              description: "Filter announcements up to exact date (YYYY-MM-DD). Use when users specify dates like 'until December 31st, 2024' or 'before April 1st'",
              format: "date"
            },
            limit: {
              type: "number",
              description: "Maximum number of announcements to return. Use smaller values (5-10) for quick overviews, larger values (20-50) for comprehensive searches",
              default: 20
            }
          }
        }
      },
      {
        name: "get_announcements_by_tags",
        description: "Find announcements about specific topics or systems. Use when users ask about particular subjects like 'GPU maintenance', 'machine learning resources', 'training workshops', or 'cloud computing updates'.",
        inputSchema: {
          type: "object",
          properties: {
            tags: {
              type: "string",
              description: "Specific topics to search for (comma-separated). Popular examples: 'gpu,nvidia', 'machine-learning,ai', 'training,professional-development', 'data-science,python', 'cloud-computing', 'allocations-proposal'",
              required: true
            },
            limit: {
              type: "number",
              description: "Maximum number of announcements to return",
              default: 10
            }
          },
          required: ["tags"]
        }
      },
      {
        name: "get_announcements_by_affinity_group",
        description: "Get announcements for a specific ACCESS system or community group. Use when users ask about updates for particular resources like DELTA, Anvil, or Bridges-2, or community groups like CSSN.",
        inputSchema: {
          type: "object", 
          properties: {
            ag: {
              type: "string",
              description: "The system or community group name (not the technical API ID). Examples: 'DELTA', 'Anvil', 'Bridges-2', 'ACCESS Support', 'Open OnDemand', 'Pegasus', 'CSSN (Computational Science Support Network)'",
              required: true
            },
            limit: {
              type: "number",
              description: "Maximum number of announcements to return",
              default: 10
            }
          },
          required: ["ag"]
        }
      },
      {
        name: "get_recent_announcements",
        description: "Get the latest ACCESS support announcements from a recent time period. Use this when users ask 'what's new?', 'recent updates', 'latest announcements', or want a general overview of current activity.",
        inputSchema: {
          type: "object",
          properties: {
            period: {
              type: "string",
              description: "How far back to look for announcements. Examples: '1 week', '2 weeks', '1 month', '3 months', '6 months'. Default is '1 month'",
              default: "1 month"
            },
            limit: {
              type: "number", 
              description: "Maximum number of announcements to return",
              default: 10
            }
          }
        }
      }
    ];
  }

  protected getResources() {
    return [
      {
        uri: "accessci://announcements",
        name: "ACCESS Support Announcements",
        description: "Recent announcements and notifications from ACCESS support",
        mimeType: "application/json"
      }
    ];
  }

  async handleToolCall(request: any) {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "get_announcements":
          return await this.getAnnouncements(args);
        case "get_announcements_by_tags":
          return await this.getAnnouncementsByTags(args.tags, args.limit);
        case "get_announcements_by_affinity_group":
          return await this.getAnnouncementsByAffinityGroup(args.ag, args.limit);
        case "get_recent_announcements":
          return await this.getRecentAnnouncements(args.period, args.limit);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ]
      };
    }
  }

  async handleResourceRead(request: any) {
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
      } catch (error: any) {
        return {
          contents: [
            {
              uri,
              mimeType: "text/plain", 
              text: `Error loading announcements: ${error.message}`
            }
          ]
        };
      }
    }

    throw new Error(`Unknown resource: ${uri}`);
  }

  private buildAnnouncementsUrl(filters: AnnouncementFilters): string {
    const params = new URLSearchParams();

    // Add required pagination parameter for 2.2 API
    params.append("items_per_page", String(filters.limit || 50));

    if (filters.tags) {
      params.append("tags", filters.tags);
    }
    if (filters.ag) {
      params.append("ag", filters.ag);
    }
    if (filters.affiliation) {
      params.append("affiliation", filters.affiliation);
    }
    if (filters.relative_start_date) {
      params.append("relative_start_date", filters.relative_start_date);
    }
    if (filters.relative_end_date) {
      params.append("relative_end_date", filters.relative_end_date);
    }
    if (filters.start_date) {
      params.append("start_date", filters.start_date);
    }
    if (filters.end_date) {
      params.append("end_date", filters.end_date);
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

  private enhanceAnnouncements(rawAnnouncements: any[]): Announcement[] {
    return rawAnnouncements.map(announcement => ({
      ...announcement,
      date: announcement.published_date,
      tags: Array.isArray(announcement.tags) ? announcement.tags : [],
      formatted_date: announcement.published_date
        ? new Date(announcement.published_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        : '',
      body_preview: announcement.summary ||
        (announcement.body
          ? announcement.body.replace(/<[^>]*>/g, '').substring(0, 200) + '...'
          : ''),
      affinity_groups: Array.isArray(announcement.affinity_group) ? announcement.affinity_group : []
    }));
  }

  private async getAnnouncements(filters: AnnouncementFilters) {
    const announcements = await this.fetchAnnouncements(filters);
    const limited = filters.limit ? announcements.slice(0, filters.limit) : announcements;
    
    // Build filters_applied object
    const filters_applied: any = {};
    if (filters.tags) filters_applied.tags = filters.tags;
    if (filters.ag) filters_applied.affinity_group = filters.ag;
    if (filters.relative_start_date || filters.relative_end_date) {
      filters_applied.date_range = `${filters.relative_start_date || 'any'} to ${filters.relative_end_date || 'now'}`;
    }
    if (filters.start_date || filters.end_date) {
      filters_applied.date_range = `${filters.start_date || 'any'} to ${filters.end_date || 'now'}`;
    }
    if (filters.limit) filters_applied.limit = filters.limit;
    
    const result = {
      total_announcements: announcements.length,
      filtered_announcements: limited.length,
      announcements: limited,
      filters_applied,
      popular_tags: this.getPopularTags(limited),
      message: limited.length === 0 ? "No announcements found matching the filters" : undefined
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  private async getAnnouncementsByTags(tags: string, limit: number = 10) {
    return await this.getAnnouncements({ tags, limit });
  }

  private async getAnnouncementsByAffinityGroup(ag: string, limit: number = 10) {
    return await this.getAnnouncements({ ag, limit });
  }

  private async getRecentAnnouncements(period: string = "1 month", limit: number = 10) {
    const relativeStart = `-${period}`;
    return await this.getAnnouncements({ 
      relative_start_date: relativeStart,
      relative_end_date: "now",
      limit 
    });
  }

  private getPopularTags(announcements: any[]): string[] {
    const tagCounts: { [key: string]: number } = {};
    
    announcements.forEach(announcement => {
      if (announcement.tags) {
        announcement.tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    return Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([tag]) => tag);
  }

  private getAffinityGroups(announcements: any[]): string[] {
    const groups = new Set<string>();
    announcements.forEach(announcement => {
      if (announcement.affinity_groups && Array.isArray(announcement.affinity_groups)) {
        announcement.affinity_groups.forEach((group: string) => {
          if (group) groups.add(group);
        });
      }
    });
    return Array.from(groups);
  }
}