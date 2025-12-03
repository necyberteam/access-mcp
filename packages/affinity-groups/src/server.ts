import {
  BaseAccessServer,
  handleApiError,
  sanitizeGroupId,
  Tool,
  Resource,
  CallToolResult,
} from "@access-mcp/shared";
import { CallToolRequest, ReadResourceRequest, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";

interface SearchAffinityGroupsArgs {
  id?: string;
  include?: string;
  query?: string;
  limit?: number;
}

export class AffinityGroupsServer extends BaseAccessServer {
  constructor() {
    super("access-mcp-affinity-groups", "0.3.0");
  }

  protected getTools(): Tool[] {
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

  protected getResources(): Resource[] {
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

  protected async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case "search_affinity_groups":
          return await this.searchAffinityGroupsRouter(args as SearchAffinityGroupsArgs);
        default:
          return this.errorResponse(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return this.errorResponse(handleApiError(error));
    }
  }

  private async searchAffinityGroupsRouter(args: SearchAffinityGroupsArgs): Promise<CallToolResult> {
    const { id, include } = args;

    if (!id) {
      return await this.listAffinityGroups();
    }

    if (include === "all") {
      const [groupInfo, events, kb] = await Promise.all([
        this.getAffinityGroup(id),
        this.getAffinityGroupEvents(id),
        this.getAffinityGroupKB(id),
      ]);

      const groupContent = groupInfo.content[0];
      const eventsContent = events.content[0];
      const kbContent = kb.content[0];
      const groupText = groupContent.type === "text" ? groupContent.text : "";
      const eventsText = eventsContent.type === "text" ? eventsContent.text : "";
      const kbText = kbContent.type === "text" ? kbContent.text : "";

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            group: JSON.parse(groupText),
            events: JSON.parse(eventsText),
            knowledge_base: JSON.parse(kbText)
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

  protected async handleResourceRead(request: ReadResourceRequest): Promise<ReadResourceResult> {
    const { uri } = request.params;

    if (uri === "accessci://affinity-groups") {
      const result = await this.listAffinityGroups();
      const content = result.content[0];
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

    throw new Error(`Unknown resource: ${uri}`);
  }

  private async getAffinityGroup(groupId: string): Promise<CallToolResult> {
    const sanitizedId = sanitizeGroupId(groupId);
    const response = await this.httpClient.get(
      `/1.1/affinity_groups/${sanitizedId}`,
    );

    // Check if response data exists
    if (!response.data) {
      return {
        content: [
          {
            type: "text" as const,
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
          type: "text" as const,
          text: JSON.stringify({
            total: cleanedGroups.length,
            items: cleanedGroups
          }, null, 2),
        },
      ],
    };
  }

  private async getAffinityGroupEvents(groupId: string): Promise<CallToolResult> {
    const sanitizedId = sanitizeGroupId(groupId);
    const response = await this.httpClient.get(`/1.1/events/ag/${sanitizedId}`);

    const events = Array.isArray(response.data) ? response.data : [];

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            total: events.length,
            items: events
          }, null, 2),
        },
      ],
    };
  }

  private async getAffinityGroupKB(groupId: string): Promise<CallToolResult> {
    const sanitizedId = sanitizeGroupId(groupId);
    const response = await this.httpClient.get(`/1.0/kb/${sanitizedId}`);

    const kbItems = Array.isArray(response.data) ? response.data : [];

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            total: kbItems.length,
            items: kbItems
          }, null, 2),
        },
      ],
    };
  }

  private async listAffinityGroups(): Promise<CallToolResult> {
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
        type: "text" as const,
        text: JSON.stringify({
          total: groups.length,
          items: groups
        }, null, 2)
      }]
    };
  }
}
