import { BaseAccessServer, handleApiError } from '../../shared/dist/index.js';

export class SystemStatusServer extends BaseAccessServer {
  constructor() {
    super('access-mcp-system-status', '0.1.0', 'https://operations-api.access-ci.org');
  }

  protected getTools() {
    return [
      {
        name: 'get_current_outages',
        description: 'Get current system outages and issues affecting ACCESS-CI resources',
        inputSchema: {
          type: 'object',
          properties: {
            resource_filter: {
              type: 'string',
              description: 'Optional: filter by specific resource name or ID',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_scheduled_maintenance',
        description: 'Get scheduled maintenance and future outages for ACCESS-CI resources',
        inputSchema: {
          type: 'object',
          properties: {
            resource_filter: {
              type: 'string',
              description: 'Optional: filter by specific resource name or ID',
            },
          },
          required: [],
        },
      },
      {
        name: 'get_system_announcements',
        description: 'Get all system announcements (current and scheduled)',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of announcements to return (default: 50)',
            },
          },
          required: [],
        },
      },
      {
        name: 'check_resource_status',
        description: 'Check the operational status of specific ACCESS-CI resources',
        inputSchema: {
          type: 'object',
          properties: {
            resource_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of resource IDs to check status for',
            },
          },
          required: ['resource_ids'],
        },
      },
    ];
  }

  protected getResources() {
    return [
      {
        uri: 'accessci://system-status',
        name: 'ACCESS-CI System Status',
        description: 'Real-time status of ACCESS-CI infrastructure, outages, and maintenance',
        mimeType: 'application/json',
      },
      {
        uri: 'accessci://outages/current',
        name: 'Current Outages',
        description: 'Currently active outages and system issues',
        mimeType: 'application/json',
      },
      {
        uri: 'accessci://outages/scheduled',
        name: 'Scheduled Maintenance',
        description: 'Upcoming scheduled maintenance and planned outages',
        mimeType: 'application/json',
      },
    ];
  }

  async handleToolCall(request: any) {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case 'get_current_outages':
          return await this.getCurrentOutages(args.resource_filter);
        case 'get_scheduled_maintenance':
          return await this.getScheduledMaintenance(args.resource_filter);
        case 'get_system_announcements':
          return await this.getSystemAnnouncements(args.limit);
        case 'check_resource_status':
          return await this.checkResourceStatus(args.resource_ids);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${handleApiError(error)}`,
          },
        ],
      };
    }
  }

  async handleResourceRead(request: any) {
    const { uri } = request.params;

    switch (uri) {
      case 'accessci://system-status':
        return {
          contents: [
            {
              uri,
              mimeType: 'text/plain',
              text: 'ACCESS-CI System Status API - Monitor real-time status, outages, and maintenance for ACCESS-CI resources.',
            },
          ],
        };
      case 'accessci://outages/current':
        const currentOutages = await this.getCurrentOutages();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: currentOutages.content[0].text,
            },
          ],
        };
      case 'accessci://outages/scheduled':
        const scheduledMaintenance = await this.getScheduledMaintenance();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: scheduledMaintenance.content[0].text,
            },
          ],
        };
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  private async getCurrentOutages(resourceFilter?: string) {
    const response = await this.httpClient.get(
      '/wh2/news/v1/affiliation/access-ci.org/current_outages/'
    );

    let outages = response.data.results || [];

    // Filter by resource if specified
    if (resourceFilter) {
      const filter = resourceFilter.toLowerCase();
      outages = outages.filter((outage: any) =>
        outage.Subject?.toLowerCase().includes(filter) ||
        outage.AffectedResources?.some((resource: any) =>
          resource.ResourceName?.toLowerCase().includes(filter) ||
          resource.ResourceID?.toString().includes(filter)
        )
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
      const subject = outage.Subject?.toLowerCase() || '';
      let severity = 'unknown';
      if (subject.includes('emergency') || subject.includes('critical')) {
        severity = 'high';
      } else if (subject.includes('maintenance') || subject.includes('scheduled')) {
        severity = 'low';
      } else {
        severity = 'medium';
      }
      severityCounts[severity as keyof typeof severityCounts]++;

      return {
        ...outage,
        severity,
        posted_time: outage.CreationTime,
        last_updated: outage.LastModificationTime,
      };
    });

    const summary = {
      total_outages: outages.length,
      affected_resources: Array.from(affectedResources),
      severity_counts: severityCounts,
      outages: enhancedOutages
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ...summary,
            affected_resources: summary.affected_resources
          }, null, 2),
        },
      ],
    };
  }

  private async getScheduledMaintenance(resourceFilter?: string) {
    const response = await this.httpClient.get(
      '/wh2/news/v1/affiliation/access-ci.org/future_outages/'
    );

    let maintenance = response.data.results || [];

    // Filter by resource if specified
    if (resourceFilter) {
      const filter = resourceFilter.toLowerCase();
      maintenance = maintenance.filter((item: any) =>
        item.Subject?.toLowerCase().includes(filter) ||
        item.AffectedResources?.some((resource: any) =>
          resource.ResourceName?.toLowerCase().includes(filter) ||
          resource.ResourceID?.toString().includes(filter)
        )
      );
    }

    // Sort by scheduled start time
    maintenance.sort((a: any, b: any) => {
      const dateA = new Date(a.OutageStartDateTime || a.CreationTime);
      const dateB = new Date(b.OutageStartDateTime || b.CreationTime);
      return dateA.getTime() - dateB.getTime();
    });

    const summary = {
      total_scheduled: maintenance.length,
      upcoming_24h: 0,
      upcoming_week: 0,
      affected_resources: new Set(),
      maintenance: maintenance.map((item: any) => {
        // Track affected resources
        item.AffectedResources?.forEach((resource: any) => {
          summary.affected_resources.add(resource.ResourceName);
        });

        // Check timing
        const startTime = new Date(item.OutageStartDateTime || item.CreationTime);
        const now = new Date();
        const hoursUntil = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursUntil <= 24) summary.upcoming_24h++;
        if (hoursUntil <= 168) summary.upcoming_week++; // 7 days * 24 hours

        return {
          ...item,
          scheduled_start: item.OutageStartDateTime,
          scheduled_end: item.OutageEndDateTime,
          hours_until_start: Math.max(0, Math.round(hoursUntil)),
          duration_hours: item.OutageEndDateTime && item.OutageStartDateTime
            ? Math.round((new Date(item.OutageEndDateTime).getTime() - 
                         new Date(item.OutageStartDateTime).getTime()) / (1000 * 60 * 60))
            : null,
        };
      })
    };


    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ...summary,
            affected_resources: summary.affected_resources
          }, null, 2),
        },
      ],
    };
  }

  private async getSystemAnnouncements(limit: number = 50) {
    // Get both current and future announcements
    const [currentResponse, futureResponse] = await Promise.all([
      this.httpClient.get('/wh2/news/v1/affiliation/access-ci.org/current_outages/'),
      this.httpClient.get('/wh2/news/v1/affiliation/access-ci.org/future_outages/')
    ]);

    const currentOutages = currentResponse.data.results || [];
    const futureOutages = futureResponse.data.results || [];

    // Combine and sort by creation time
    const allAnnouncements = [...currentOutages, ...futureOutages]
      .sort((a: any, b: any) => {
        const dateA = new Date(a.CreationTime);
        const dateB = new Date(b.CreationTime);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      })
      .slice(0, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            total_announcements: allAnnouncements.length,
            current_outages: currentOutages.length,
            scheduled_maintenance: futureOutages.length,
            announcements: allAnnouncements
          }, null, 2),
        },
      ],
    };
  }

  private async checkResourceStatus(resourceIds: string[]) {
    // Get current outages to check against resource IDs
    const currentOutages = await this.getCurrentOutages();
    const outageData = JSON.parse(currentOutages.content[0].text);

    const resourceStatus = resourceIds.map(resourceId => {
      const affectedOutages = outageData.outages.filter((outage: any) =>
        outage.AffectedResources?.some((resource: any) =>
          resource.ResourceID?.toString() === resourceId ||
          resource.ResourceName?.toLowerCase().includes(resourceId.toLowerCase())
        )
      );

      let status = 'operational';
      let severity = null;
      
      if (affectedOutages.length > 0) {
        status = 'affected';
        // Get highest severity
        const severities = affectedOutages.map((o: any) => o.severity);
        if (severities.includes('high')) severity = 'high';
        else if (severities.includes('medium')) severity = 'medium';
        else severity = 'low';
      }

      return {
        resource_id: resourceId,
        status,
        severity,
        active_outages: affectedOutages.length,
        outage_details: affectedOutages.map((outage: any) => ({
          subject: outage.Subject,
          severity: outage.severity,
          posted: outage.posted_time
        }))
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            checked_at: new Date().toISOString(),
            resources_checked: resourceIds.length,
            operational: resourceStatus.filter(r => r.status === 'operational').length,
            affected: resourceStatus.filter(r => r.status === 'affected').length,
            resource_status: resourceStatus
          }, null, 2),
        },
      ],
    };
  }
}