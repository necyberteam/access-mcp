import {
  BaseAccessServer,
  handleApiError,
  sanitizeGroupId,
} from "@access-mcp/shared";

export class AffinityGroupsServer extends BaseAccessServer {
  constructor() {
    super("access-mcp-affinity-groups", "0.3.0");
  }

  protected getTools() {
    return [
      {
        name: "search_affinity_groups",
        description: "Search ACCESS-CI affinity groups. Returns {total, items}.",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Group ID (omit to list all)"
            },
            include: {
              type: "string",
              enum: ["events", "kb", "all"],
              description: "Include: events, kb, or all"
            },
            query: {
              type: "string",
              description: "Search KB resources"
            },
            limit: {
              type: "number",
              description: "Max results (default: 20)",
              default: 20
            }
          }
        }
      }
    ];
  }

  protected getResources() {
    return [
      {
        uri: "accessci://affinity-groups",
        name: "ACCESS-CI Affinity Groups",
        description:
          "Information about ACCESS-CI affinity groups, their events, and knowledge base resources",
        mimeType: "application/json",
      },
    ];
  }

  protected async handleToolCall(request: any) {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case "search_affinity_groups":
          return await this.searchAffinityGroupsRouter(args);
        default:
          return this.errorResponse(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return this.errorResponse(handleApiError(error));
    }
  }

  private async searchAffinityGroupsRouter(args: any) {
    const { id, include, query, limit = 20 } = args;

    if (!id) {
      return await this.listAffinityGroups();
    }

    if (include === "all") {
      const [groupInfo, events, kb] = await Promise.all([
        this.getAffinityGroup(id),
        this.getAffinityGroupEvents(id),
        this.getAffinityGroupKB(id),
      ]);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            group: JSON.parse(groupInfo.content[0].text),
            events: JSON.parse(events.content[0].text),
            knowledge_base: JSON.parse(kb.content[0].text)
          })
        }]
      };
    }

    if (include === "events") {
      return await this.getAffinityGroupEvents(id);
    }

    if (include === "kb") {
      return await this.getAffinityGroupKB(id);
    }

    return await this.getAffinityGroup(id);
  }

  protected async handleResourceRead(request: any) {
    const { uri } = request.params;

    if (uri === "accessci://affinity-groups") {
      const result = await this.listAffinityGroups();
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: result.content[0].text,
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  }

  private async getAffinityGroup(groupId: string) {
    const sanitizedId = sanitizeGroupId(groupId);
    const response = await this.httpClient.get(
      `/1.1/affinity_groups/${sanitizedId}`,
    );

    // Check if response data exists
    if (!response.data) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              total: 0,
              items: []
            }, null, 2),
          },
        ],
      };
    }

    // Clean up the response data - API returns array with single group
    const rawGroups = Array.isArray(response.data) ? response.data : [response.data];
    const cleanedGroups = rawGroups.map((group) => ({
      id: group?.field_group_id || group?.nid,
      name: group?.title, // Changed from title to name for consistency
      description: group?.description
        ?.replace(/<[^>]*>/g, "")
        .replace(/\\n/g, "\n")
        .trim(),
      coordinator: group?.coordinator_name,
      category: group?.field_affinity_group_category,
      slack_link: group?.slack_link,
      support_url: group?.url,
      ask_ci_forum: group?.field_ask_ci_locale,
    }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            total: cleanedGroups.length,
            items: cleanedGroups
          }, null, 2),
        },
      ],
    };
  }

  private async getAffinityGroupEvents(groupId: string) {
    const sanitizedId = sanitizeGroupId(groupId);
    const response = await this.httpClient.get(`/1.1/events/ag/${sanitizedId}`);

    const events = Array.isArray(response.data) ? response.data : [];

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            total: events.length,
            items: events
          }, null, 2),
        },
      ],
    };
  }

  private async getAffinityGroupKB(groupId: string) {
    const sanitizedId = sanitizeGroupId(groupId);
    const response = await this.httpClient.get(`/1.0/kb/${sanitizedId}`);

    const kbItems = Array.isArray(response.data) ? response.data : [];

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            total: kbItems.length,
            items: kbItems
          }, null, 2),
        },
      ],
    };
  }

  private async listAffinityGroups() {
    const response = await this.httpClient.get("/1.1/affinity_groups/all");

    const groups = Array.isArray(response.data)
      ? response.data.map((group) => ({
          id: group.field_group_id || group.nid,
          name: group.title, // Changed from title to name for consistency
          description: group.description?.replace(/<[^>]*>/g, "").replace(/\\n/g, "\n").trim(),
          coordinator: group.coordinator_name,
          category: group.field_affinity_group_category
        }))
      : [];

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          total: groups.length,
          items: groups
        }, null, 2)
      }]
    };
  }
}
