import { BaseAccessServer, handleApiError } from "@access-mcp/shared";

export class SystemStatusServer extends BaseAccessServer {
  constructor() {
    super(
      "access-mcp-system-status",
      "0.4.0",
      "https://operations-api.access-ci.org",
    );
  }

  protected getTools() {
    return [
      {
        name: "get_current_outages",
        description:
          "Get current system outages and issues affecting ACCESS-CI resources",
        inputSchema: {
          type: "object",
          properties: {
            resource_filter: {
              type: "string",
              description: "Optional: filter by specific resource name or ID",
            },
          },
          required: [],
        },
      },
      {
        name: "get_scheduled_maintenance",
        description:
          "Get scheduled maintenance and future outages for ACCESS-CI resources",
        inputSchema: {
          type: "object",
          properties: {
            resource_filter: {
              type: "string",
              description: "Optional: filter by specific resource name or ID",
            },
          },
          required: [],
        },
      },
      {
        name: "get_past_outages",
        description:
          "Get historical outages and past incidents affecting ACCESS-CI resources",
        inputSchema: {
          type: "object",
          properties: {
            resource_filter: {
              type: "string",
              description: "Optional: filter by specific resource name or ID",
            },
            limit: {
              type: "number",
              description: "Maximum number of past outages to return (default: 100)",
            },
          },
          required: [],
        },
      },
      {
        name: "get_system_announcements",
        description: "Get all system announcements (current and scheduled)",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description:
                "Maximum number of announcements to return (default: 50)",
            },
          },
          required: [],
        },
      },
      {
        name: "check_resource_status",
        description:
          "Check the operational status of specific ACCESS-CI resources",
        inputSchema: {
          type: "object",
          properties: {
            resource_ids: {
              type: "array",
              items: { type: "string" },
              description: "List of resource IDs or names to check status for",
            },
            use_group_api: {
              type: "boolean",
              description: "Use resource group API for more efficient querying (default: false)",
              default: false,
            },
          },
          required: ["resource_ids"],
        },
      },
    ];
  }

  protected getResources() {
    return [
      {
        uri: "accessci://system-status",
        name: "ACCESS-CI System Status",
        description:
          "Real-time status of ACCESS-CI infrastructure, outages, and maintenance",
        mimeType: "application/json",
      },
      {
        uri: "accessci://outages/current",
        name: "Current Outages",
        description: "Currently active outages and system issues",
        mimeType: "application/json",
      },
      {
        uri: "accessci://outages/scheduled",
        name: "Scheduled Maintenance",
        description: "Upcoming scheduled maintenance and planned outages",
        mimeType: "application/json",
      },
      {
        uri: "accessci://outages/past",
        name: "Past Outages",
        description: "Historical outages and past incidents",
        mimeType: "application/json",
      },
    ];
  }

  async handleToolCall(request: any) {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case "get_current_outages":
          return await this.getCurrentOutages(args.resource_filter);
        case "get_scheduled_maintenance":
          return await this.getScheduledMaintenance(args.resource_filter);
        case "get_past_outages":
          return await this.getPastOutages(args.resource_filter, args.limit);
        case "get_system_announcements":
          return await this.getSystemAnnouncements(args.limit);
        case "check_resource_status":
          return await this.checkResourceStatus(args.resource_ids, args.use_group_api);
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
      case "accessci://system-status":
        return {
          contents: [
            {
              uri,
              mimeType: "text/plain",
              text: "ACCESS-CI System Status API - Monitor real-time status, outages, and maintenance for ACCESS-CI resources.",
            },
          ],
        };
      case "accessci://outages/current":
        const currentOutages = await this.getCurrentOutages();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: currentOutages.content[0].text,
            },
          ],
        };
      case "accessci://outages/scheduled":
        const scheduledMaintenance = await this.getScheduledMaintenance();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: scheduledMaintenance.content[0].text,
            },
          ],
        };
      case "accessci://outages/past":
        const pastOutages = await this.getPastOutages();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: pastOutages.content[0].text,
            },
          ],
        };
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  private async getCurrentOutages(resourceFilter?: string) {
    const response = await this.httpClient.get(
      "/wh2/news/v1/affiliation/access-ci.org/current_outages/",
    );

    let outages = response.data.results || [];

    // Filter by resource if specified
    if (resourceFilter) {
      const filter = resourceFilter.toLowerCase();
      outages = outages.filter(
        (outage: any) =>
          outage.Subject?.toLowerCase().includes(filter) ||
          outage.AffectedResources?.some(
            (resource: any) =>
              resource.ResourceName?.toLowerCase().includes(filter) ||
              resource.ResourceID?.toString().includes(filter),
          ),
      );
    }

    // Initialize tracking variables
    const affectedResources = new Set();
    const severityCounts = { high: 0, medium: 0, low: 0, unknown: 0 };

    // Enhance outages with status summary
    const enhancedOutages = outages.map((outage: any) => {
      // Track affected resources
      outage.AffectedResources?.forEach((resource: any) => {
        affectedResources.add(resource.ResourceName);
      });

      // Categorize severity (basic heuristic)
      const subject = outage.Subject?.toLowerCase() || "";
      let severity = "unknown";
      if (subject.includes("emergency") || subject.includes("critical")) {
        severity = "high";
      } else if (
        subject.includes("maintenance") ||
        subject.includes("scheduled")
      ) {
        severity = "low";
      } else {
        severity = "medium";
      }
      severityCounts[severity as keyof typeof severityCounts]++;

      return {
        ...outage,
        severity,
      };
    });

    const summary = {
      total_outages: outages.length,
      affected_resources: Array.from(affectedResources),
      severity_counts: severityCounts,
      outages: enhancedOutages,
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

  private async getScheduledMaintenance(resourceFilter?: string) {
    const response = await this.httpClient.get(
      "/wh2/news/v1/affiliation/access-ci.org/future_outages/",
    );

    let maintenance = response.data.results || [];

    // Filter by resource if specified
    if (resourceFilter) {
      const filter = resourceFilter.toLowerCase();
      maintenance = maintenance.filter(
        (item: any) =>
          item.Subject?.toLowerCase().includes(filter) ||
          item.AffectedResources?.some(
            (resource: any) =>
              resource.ResourceName?.toLowerCase().includes(filter) ||
              resource.ResourceID?.toString().includes(filter),
          ),
      );
    }

    // Sort by scheduled start time
    maintenance.sort((a: any, b: any) => {
      const dateA = new Date(a.OutageStart);
      const dateB = new Date(b.OutageStart);
      return dateA.getTime() - dateB.getTime();
    });

    // Initialize tracking variables
    const affectedResources = new Set();
    let upcoming24h = 0;
    let upcomingWeek = 0;

    const enhancedMaintenance = maintenance.map((item: any) => {
      // Track affected resources
      item.AffectedResources?.forEach((resource: any) => {
        affectedResources.add(resource.ResourceName);
      });

      // Check timing - use OutageStart for scheduling
      const hasScheduledTime = !!item.OutageStart;
      const startTime = new Date(item.OutageStart);
      const now = new Date();
      const hoursUntil =
        (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntil <= 24) upcoming24h++;
      if (hoursUntil <= 168) upcomingWeek++; // 7 days * 24 hours

      return {
        ...item,
        scheduled_start: item.OutageStart,
        scheduled_end: item.OutageEnd,
        hours_until_start: Math.max(0, Math.round(hoursUntil)),
        duration_hours:
          item.OutageEnd && item.OutageStart
            ? Math.round(
                (new Date(item.OutageEnd).getTime() -
                  new Date(item.OutageStart).getTime()) /
                  (1000 * 60 * 60),
              )
            : null,
        has_scheduled_time: hasScheduledTime,
      };
    });

    const summary = {
      total_scheduled: maintenance.length,
      upcoming_24h: upcoming24h,
      upcoming_week: upcomingWeek,
      affected_resources: Array.from(affectedResources),
      maintenance: enhancedMaintenance,
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

  private async getPastOutages(resourceFilter?: string, limit: number = 100) {
    const response = await this.httpClient.get(
      "/wh2/news/v1/affiliation/access-ci.org/past_outages/",
    );

    let pastOutages = response.data.results || [];

    // Filter by resource if specified
    if (resourceFilter) {
      const filter = resourceFilter.toLowerCase();
      pastOutages = pastOutages.filter(
        (outage: any) =>
          outage.Subject?.toLowerCase().includes(filter) ||
          outage.AffectedResources?.some(
            (resource: any) =>
              resource.ResourceName?.toLowerCase().includes(filter) ||
              resource.ResourceID?.toString().includes(filter),
          ),
      );
    }

    // Sort by outage end time (most recent first)
    pastOutages.sort((a: any, b: any) => {
      const dateA = new Date(a.OutageEnd);
      const dateB = new Date(b.OutageEnd);
      return dateB.getTime() - dateA.getTime();
    });

    // Apply limit
    if (limit && pastOutages.length > limit) {
      pastOutages = pastOutages.slice(0, limit);
    }

    // Initialize tracking variables
    const affectedResources = new Set();
    const outageTypes = new Set();
    const recentOutages = pastOutages.filter((outage: any) => {
      const endTime = new Date(outage.OutageEnd);
      const daysAgo = (Date.now() - endTime.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30; // Last 30 days
    });

    // Enhance outages with calculated fields
    const enhancedOutages = pastOutages.map((outage: any) => {
      // Track affected resources
      outage.AffectedResources?.forEach((resource: any) => {
        affectedResources.add(resource.ResourceName);
      });

      // Track outage types
      if (outage.OutageType) {
        outageTypes.add(outage.OutageType);
      }

      // Calculate duration
      const startTime = new Date(outage.OutageStart);
      const endTime = new Date(outage.OutageEnd);
      const durationHours = Math.round(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60),
      );

      // Calculate how long ago it ended
      const daysAgo = Math.round(
        (Date.now() - endTime.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        ...outage,
        outage_start: outage.OutageStart,
        outage_end: outage.OutageEnd,
        duration_hours: durationHours,
        days_ago: daysAgo,
        outage_type: outage.OutageType,
      };
    });

    const summary = {
      total_past_outages: enhancedOutages.length,
      recent_outages_30_days: recentOutages.length,
      affected_resources: Array.from(affectedResources),
      outage_types: Array.from(outageTypes),
      average_duration_hours: enhancedOutages.length > 0
        ? Math.round(
            enhancedOutages
              .filter((o: any) => o.duration_hours > 0)
              .reduce((sum: number, o: any) => sum + o.duration_hours, 0) /
            enhancedOutages.filter((o: any) => o.duration_hours > 0).length
          )
        : 0,
      outages: enhancedOutages,
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

  private async getSystemAnnouncements(limit: number = 50) {
    // Get current, future, and recent past announcements for comprehensive view
    const [currentResponse, futureResponse, pastResponse] = await Promise.all([
      this.httpClient.get(
        "/wh2/news/v1/affiliation/access-ci.org/current_outages/",
      ),
      this.httpClient.get(
        "/wh2/news/v1/affiliation/access-ci.org/future_outages/",
      ),
      this.httpClient.get(
        "/wh2/news/v1/affiliation/access-ci.org/past_outages/",
      ),
    ]);

    const currentOutages = currentResponse.data.results || [];
    const futureOutages = futureResponse.data.results || [];
    const pastOutages = pastResponse.data.results || [];

    // Filter recent past outages (last 30 days) for announcements
    const recentPastOutages = pastOutages.filter((outage: any) => {
      const endTime = new Date(outage.OutageEnd);
      const daysAgo = (Date.now() - endTime.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30;
    });

    // Combine all announcements and sort by most relevant date
    const allAnnouncements = [
      ...currentOutages.map((item: any) => ({ ...item, category: 'current' })),
      ...futureOutages.map((item: any) => ({ ...item, category: 'scheduled' })),
      ...recentPastOutages.map((item: any) => ({ ...item, category: 'recent_past' })),
    ]
      .sort((a: any, b: any) => {
        // Sort by most relevant date: current first, then future by start time, then past by end time
        if (a.category === 'current' && b.category !== 'current') return -1;
        if (b.category === 'current' && a.category !== 'current') return 1;
        
        const dateA = new Date(a.OutageStart);
        const dateB = new Date(b.OutageStart);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      })
      .slice(0, limit);

    const summary = {
      total_announcements: allAnnouncements.length,
      current_outages: currentOutages.length,
      scheduled_maintenance: futureOutages.length,
      recent_past_outages: recentPastOutages.length,
      categories: {
        current: allAnnouncements.filter(a => a.category === 'current').length,
        scheduled: allAnnouncements.filter(a => a.category === 'scheduled').length,
        recent_past: allAnnouncements.filter(a => a.category === 'recent_past').length,
      },
      announcements: allAnnouncements,
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

  private async checkResourceStatus(resourceIds: string[], useGroupApi: boolean = false) {
    if (useGroupApi) {
      return await this.checkResourceStatusViaGroups(resourceIds);
    }

    // Efficient approach: fetch raw current outages data once
    const response = await this.httpClient.get(
      "/wh2/news/v1/affiliation/access-ci.org/current_outages/",
    );
    const rawOutages = response.data.results || [];

    const resourceStatus = resourceIds.map((resourceId) => {
      const affectedOutages = rawOutages.filter((outage: any) =>
        outage.AffectedResources?.some(
          (resource: any) =>
            resource.ResourceID?.toString() === resourceId ||
            resource.ResourceName?.toLowerCase().includes(
              resourceId.toLowerCase(),
            ),
        ),
      );

      let status = "operational";
      let severity = null;

      if (affectedOutages.length > 0) {
        status = "affected";
        // Get highest severity using same logic as getCurrentOutages
        const severities = affectedOutages.map((outage: any) => {
          const subject = outage.Subject?.toLowerCase() || "";
          if (subject.includes("emergency") || subject.includes("critical")) {
            return "high";
          } else if (subject.includes("maintenance") || subject.includes("scheduled")) {
            return "low";
          } else {
            return "medium";
          }
        });
        
        if (severities.includes("high")) severity = "high";
        else if (severities.includes("medium")) severity = "medium";
        else severity = "low";
      }

      return {
        resource_id: resourceId,
        status,
        severity,
        active_outages: affectedOutages.length,
        outage_details: affectedOutages.map((outage: any) => ({
          subject: outage.Subject,
          severity,
        })),
      };
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              checked_at: new Date().toISOString(),
              resources_checked: resourceIds.length,
              operational: resourceStatus.filter(
                (r) => r.status === "operational",
              ).length,
              affected: resourceStatus.filter((r) => r.status === "affected")
                .length,
              api_method: "direct_outages_check",
              resource_status: resourceStatus,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private async checkResourceStatusViaGroups(resourceIds: string[]) {
    // Try to use the more efficient group-based API
    const statusPromises = resourceIds.map(async (resourceId) => {
      try {
        const response = await this.httpClient.get(
          `/wh2/news/v1/info_groupid/${resourceId}/`,
        );
        
        const groupData = response.data.results || [];
        const hasOutages = groupData.length > 0;
        
        return {
          resource_id: resourceId,
          status: hasOutages ? "affected" : "operational",
          severity: hasOutages ? "medium" : null,
          active_outages: groupData.length,
          outage_details: groupData.map((outage: any) => ({
            subject: outage.Subject,
          })),
          api_method: "group_specific",
        };
      } catch (error) {
        // Fallback to general check if group API fails
        return {
          resource_id: resourceId,
          status: "unknown",
          severity: null,
          active_outages: 0,
          outage_details: [],
          error: `Group API failed for ${resourceId}`,
          api_method: "group_specific_failed",
        };
      }
    });

    const resourceStatus = await Promise.all(statusPromises);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              checked_at: new Date().toISOString(),
              resources_checked: resourceIds.length,
              operational: resourceStatus.filter(
                (r) => r.status === "operational",
              ).length,
              affected: resourceStatus.filter((r) => r.status === "affected")
                .length,
              unknown: resourceStatus.filter((r) => r.status === "unknown")
                .length,
              api_method: "resource_group_api",
              resource_status: resourceStatus,
            },
            null,
            2,
          ),
        },
      ],
    };
  }
}
