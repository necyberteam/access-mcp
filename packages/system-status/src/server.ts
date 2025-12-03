import { BaseAccessServer, handleApiError, Tool, Resource, CallToolResult } from "@access-mcp/shared";
import { CallToolRequest, ReadResourceRequest, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

interface InfrastructureNewsArgs {
  query?: string;
  time?: string;
  ids?: string[];
  limit?: number;
  use_group_api?: boolean;
}

interface InfrastructureNewsRouterArgs {
  resource?: string;
  time?: string;
  resource_ids?: string[];
  limit?: number;
  use_group_api?: boolean;
}

interface AffectedResource {
  ResourceName?: string;
  ResourceID?: string | number;
}

interface OutageItem {
  Subject?: string;
  AffectedResources?: AffectedResource[];
  OutageStart?: string;
  OutageEnd?: string;
  OutageType?: string;
  category?: string;
}

interface EnhancedOutage extends OutageItem {
  severity?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  hours_until_start?: number;
  duration_hours?: number | null;
  has_scheduled_time?: boolean;
  outage_start?: string;
  outage_end?: string;
  days_ago?: number;
  outage_type?: string;
}

export class SystemStatusServer extends BaseAccessServer {
  constructor() {
    super(
      "access-mcp-system-status",
      "0.4.0",
      "https://operations-api.access-ci.org",
    );
  }

  protected getTools(): Tool[] {
    return [
      {
        name: "get_infrastructure_news",
        description: "Get ACCESS-CI infrastructure status (outages, maintenance, incidents). Returns {total, items}.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Filter by resource name (e.g., 'delta', 'bridges2')"
            },
            time: {
              type: "string",
              enum: ["current", "scheduled", "past", "all"],
              description: "Period: current (active), scheduled (future), past, all",
              default: "current"
            },
            ids: {
              type: "array",
              items: { type: "string" },
              description: "Check status for specific resource IDs"
            },
            limit: {
              type: "number",
              description: "Max results (default: 50)",
              default: 50
            },
            use_group_api: {
              type: "boolean",
              description: "Use group API for status (with ids only)",
              default: false
            }
          }
        },
      },
    ];
  }

  protected getResources(): Resource[] {
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

  protected async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args = {} } = request.params;
    const typedArgs = args as InfrastructureNewsArgs;

    try {
      switch (name) {
        case "get_infrastructure_news":
          return await this.getInfrastructureNewsRouter({
            resource: typedArgs.query,
            time: typedArgs.time,
            resource_ids: typedArgs.ids,
            limit: typedArgs.limit,
            use_group_api: typedArgs.use_group_api
          });
        default:
          return this.errorResponse(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return this.errorResponse(handleApiError(error));
    }
  }

  /**
   * Router for consolidated get_infrastructure_news tool
   * Routes to appropriate handler based on parameters
   */
  private async getInfrastructureNewsRouter(args: InfrastructureNewsRouterArgs): Promise<CallToolResult> {
    const { resource, time = "current", resource_ids, limit, use_group_api = false } = args;

    // Check resource status (returns operational/affected)
    if (resource_ids && Array.isArray(resource_ids)) {
      return await this.checkResourceStatus(resource_ids, use_group_api);
    }

    // Time-based routing
    switch (time) {
      case "current":
        return await this.getCurrentOutages(resource);
      case "scheduled":
        return await this.getScheduledMaintenance(resource);
      case "past":
        return await this.getPastOutages(resource, limit || 100);
      case "all":
        return await this.getSystemAnnouncements(limit || 50);
      default:
        throw new Error(`Invalid time parameter: ${time}. Must be one of: current, scheduled, past, all`);
    }
  }

  protected async handleResourceRead(request: ReadResourceRequest): Promise<ReadResourceResult> {
    const { uri } = request.params;

    switch (uri) {
      case "accessci://system-status": {
        return {
          contents: [
            {
              uri,
              mimeType: "text/plain",
              text: "ACCESS-CI System Status API - Monitor real-time status, outages, and maintenance for ACCESS-CI resources.",
            },
          ],
        };
      }
      case "accessci://outages/current": {
        const currentOutages = await this.getCurrentOutages();
        const content = currentOutages.content[0];
        const text = content.type === "text" ? content.text : "";
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text,
            },
          ],
        };
      }
      case "accessci://outages/scheduled": {
        const scheduledMaintenance = await this.getScheduledMaintenance();
        const content = scheduledMaintenance.content[0];
        const text = content.type === "text" ? content.text : "";
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text,
            },
          ],
        };
      }
      case "accessci://outages/past": {
        const pastOutages = await this.getPastOutages();
        const content = pastOutages.content[0];
        const text = content.type === "text" ? content.text : "";
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text,
            },
          ],
        };
      }
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  private async getCurrentOutages(resourceFilter?: string): Promise<CallToolResult> {
    const response = await this.httpClient.get(
      "/wh2/news/v1/affiliation/access-ci.org/current_outages/",
    );

    let outages: OutageItem[] = response.data.results || [];

    // Filter by resource if specified
    if (resourceFilter) {
      const filter = resourceFilter.toLowerCase();
      outages = outages.filter(
        (outage: OutageItem) =>
          outage.Subject?.toLowerCase().includes(filter) ||
          outage.AffectedResources?.some(
            (resource: AffectedResource) =>
              resource.ResourceName?.toLowerCase().includes(filter) ||
              resource.ResourceID?.toString().includes(filter),
          ),
      );
    }

    // Initialize tracking variables
    const affectedResources = new Set();
    const severityCounts = { high: 0, medium: 0, low: 0, unknown: 0 };

    // Enhance outages with status summary
    const enhancedOutages = outages.map((outage: OutageItem): EnhancedOutage => {
      // Track affected resources
      outage.AffectedResources?.forEach((resource: AffectedResource) => {
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
          type: "text" as const,
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  private async getScheduledMaintenance(resourceFilter?: string): Promise<CallToolResult> {
    const response = await this.httpClient.get(
      "/wh2/news/v1/affiliation/access-ci.org/future_outages/",
    );

    let maintenance: OutageItem[] = response.data.results || [];

    // Filter by resource if specified
    if (resourceFilter) {
      const filter = resourceFilter.toLowerCase();
      maintenance = maintenance.filter(
        (item: OutageItem) =>
          item.Subject?.toLowerCase().includes(filter) ||
          item.AffectedResources?.some(
            (resource: AffectedResource) =>
              resource.ResourceName?.toLowerCase().includes(filter) ||
              resource.ResourceID?.toString().includes(filter),
          ),
      );
    }

    // Sort by scheduled start time
    maintenance.sort((a: OutageItem, b: OutageItem) => {
      const dateA = new Date(a.OutageStart || "");
      const dateB = new Date(b.OutageStart || "");
      return dateA.getTime() - dateB.getTime();
    });

    // Initialize tracking variables
    const affectedResources = new Set();
    let upcoming24h = 0;
    let upcomingWeek = 0;

    const enhancedMaintenance = maintenance.map((item: OutageItem): EnhancedOutage => {
      // Track affected resources
      item.AffectedResources?.forEach((resource: AffectedResource) => {
        affectedResources.add(resource.ResourceName);
      });

      // Check timing - use OutageStart for scheduling
      const hasScheduledTime = !!item.OutageStart;
      const startTime = new Date(item.OutageStart || "");
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
          type: "text" as const,
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  private async getPastOutages(resourceFilter?: string, limit: number = 100): Promise<CallToolResult> {
    const response = await this.httpClient.get(
      "/wh2/news/v1/affiliation/access-ci.org/past_outages/",
    );

    let pastOutages: OutageItem[] = response.data.results || [];

    // Filter by resource if specified
    if (resourceFilter) {
      const filter = resourceFilter.toLowerCase();
      pastOutages = pastOutages.filter(
        (outage: OutageItem) =>
          outage.Subject?.toLowerCase().includes(filter) ||
          outage.AffectedResources?.some(
            (resource: AffectedResource) =>
              resource.ResourceName?.toLowerCase().includes(filter) ||
              resource.ResourceID?.toString().includes(filter),
          ),
      );
    }

    // Sort by outage end time (most recent first)
    pastOutages.sort((a: OutageItem, b: OutageItem) => {
      const dateA = new Date(a.OutageEnd || "");
      const dateB = new Date(b.OutageEnd || "");
      return dateB.getTime() - dateA.getTime();
    });

    // Apply limit
    if (limit && pastOutages.length > limit) {
      pastOutages = pastOutages.slice(0, limit);
    }

    // Initialize tracking variables
    const affectedResources = new Set<string>();
    const outageTypes = new Set<string>();
    const recentOutages = pastOutages.filter((outage: OutageItem) => {
      const endTime = new Date(outage.OutageEnd || "");
      const daysAgo = (Date.now() - endTime.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30; // Last 30 days
    });

    // Enhance outages with calculated fields
    const enhancedOutages = pastOutages.map((outage: OutageItem): EnhancedOutage => {
      // Track affected resources
      outage.AffectedResources?.forEach((resource: AffectedResource) => {
        if (resource.ResourceName) {
          affectedResources.add(resource.ResourceName);
        }
      });

      // Track outage types
      if (outage.OutageType) {
        outageTypes.add(outage.OutageType);
      }

      // Calculate duration
      const startTime = new Date(outage.OutageStart || "");
      const endTime = new Date(outage.OutageEnd || "");
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
              .filter((o: EnhancedOutage) => o.duration_hours && o.duration_hours > 0)
              .reduce((sum: number, o: EnhancedOutage) => sum + (o.duration_hours || 0), 0) /
            enhancedOutages.filter((o: EnhancedOutage) => o.duration_hours && o.duration_hours > 0).length
          )
        : 0,
      outages: enhancedOutages,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  private async getSystemAnnouncements(limit: number = 50): Promise<CallToolResult> {
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

    const currentOutages: OutageItem[] = currentResponse.data.results || [];
    const futureOutages: OutageItem[] = futureResponse.data.results || [];
    const pastOutagesData: OutageItem[] = pastResponse.data.results || [];

    // Filter recent past outages (last 30 days) for announcements
    const recentPastOutages = pastOutagesData.filter((outage: OutageItem) => {
      const endTime = new Date(outage.OutageEnd || "");
      const daysAgo = (Date.now() - endTime.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 30;
    });

    // Combine all announcements and sort by most relevant date
    const allAnnouncements: OutageItem[] = [
      ...currentOutages.map((item: OutageItem) => ({ ...item, category: 'current' as const })),
      ...futureOutages.map((item: OutageItem) => ({ ...item, category: 'scheduled' as const })),
      ...recentPastOutages.map((item: OutageItem) => ({ ...item, category: 'recent_past' as const })),
    ]
      .sort((a: OutageItem, b: OutageItem) => {
        // Sort by most relevant date: current first, then future by start time, then past by end time
        if (a.category === 'current' && b.category !== 'current') return -1;
        if (b.category === 'current' && a.category !== 'current') return 1;

        const dateA = new Date(a.OutageStart || "");
        const dateB = new Date(b.OutageStart || "");
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
          type: "text" as const,
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  private async checkResourceStatus(resourceIds: string[], useGroupApi: boolean = false): Promise<CallToolResult> {
    if (!resourceIds || !Array.isArray(resourceIds) || resourceIds.length === 0) {
      throw new Error("resource_ids parameter is required and must be a non-empty array of resource IDs");
    }

    if (useGroupApi) {
      return await this.checkResourceStatusViaGroups(resourceIds);
    }

    // Efficient approach: fetch raw current outages data once
    const response = await this.httpClient.get(
      "/wh2/news/v1/affiliation/access-ci.org/current_outages/",
    );
    const rawOutages: OutageItem[] = response.data.results || [];

    const resourceStatus = resourceIds.map((resourceId) => {
      const affectedOutages = rawOutages.filter((outage: OutageItem) =>
        outage.AffectedResources?.some(
          (resource: AffectedResource) =>
            resource.ResourceID?.toString() === resourceId ||
            resource.ResourceName?.toLowerCase().includes(
              resourceId.toLowerCase(),
            ),
        ),
      );

      let status = "operational";
      let severity: string | null = null;

      if (affectedOutages.length > 0) {
        status = "affected";
        // Get highest severity using same logic as getCurrentOutages
        const severities = affectedOutages.map((outage: OutageItem) => {
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
        outage_details: affectedOutages.map((outage: OutageItem) => ({
          subject: outage.Subject,
          severity,
        })),
      };
    });

    return {
      content: [
        {
          type: "text" as const,
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

  private async checkResourceStatusViaGroups(resourceIds: string[]): Promise<CallToolResult> {
    if (!resourceIds || !Array.isArray(resourceIds) || resourceIds.length === 0) {
      throw new Error("resource_ids parameter is required and must be a non-empty array of resource IDs");
    }

    // Try to use the more efficient group-based API
    const statusPromises = resourceIds.map(async (resourceId) => {
      try {
        const response = await this.httpClient.get(
          `/wh2/news/v1/info_groupid/${resourceId}/`,
        );

        const groupData: OutageItem[] = response.data.results || [];
        const hasOutages = groupData.length > 0;

        return {
          resource_id: resourceId,
          status: hasOutages ? "affected" : "operational",
          severity: hasOutages ? "medium" : null,
          active_outages: groupData.length,
          outage_details: groupData.map((outage: OutageItem) => ({
            subject: outage.Subject,
          })),
          api_method: "group_specific",
        };
      } catch {
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
          type: "text" as const,
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
