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
        name: "list_affinity_groups",
        description: "Retrieve a complete list of all ACCESS-CI affinity groups to discover available communities, special interest groups, and collaborative networks. Use this when users want to explore available communities or need to find a specific group ID.",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "get_affinity_group",
        description:
          "Get information about a specific ACCESS-CI affinity group",
        inputSchema: {
          type: "object",
          properties: {
            group_id: {
              type: "string",
              description: "The affinity group ID. Use list_affinity_groups to get valid group IDs.",
              examples: [
                "cloudbank.access-ci.org",
                "nairrpilot.access-ci.org",
                "appverse-ag.ondemand.connectci.org"
              ]
            },
          },
          required: ["group_id"],
        },
      },
      {
        name: "get_affinity_group_events",
        description:
          "Get events and trainings for a specific ACCESS-CI affinity group",
        inputSchema: {
          type: "object",
          properties: {
            group_id: {
              type: "string",
              description: "The affinity group ID. Use list_affinity_groups to get valid group IDs.",
              examples: [
                "cloudbank.access-ci.org",
                "nairrpilot.access-ci.org",
                "classroom.ondemand.connectci.org"
              ]
            },
          },
          required: ["group_id"],
        },
      },
      {
        name: "get_affinity_group_kb",
        description:
          "Get knowledge base resources for a specific ACCESS-CI affinity group",
        inputSchema: {
          type: "object",
          properties: {
            group_id: {
              type: "string",
              description: "The affinity group ID. Use list_affinity_groups to get valid group IDs.",
              examples: [
                "cloudbank.access-ci.org",
                "nairrpilot.access-ci.org",
                "ood-ags.ondemand.connectci.org"
              ]
            },
          },
          required: ["group_id"],
        },
      },
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
        case "list_affinity_groups":
          return await this.listAffinityGroups();
        case "get_affinity_group":
          if (!args.group_id) {
            throw new Error("group_id parameter is required");
          }
          return await this.getAffinityGroup(args.group_id);
        case "get_affinity_group_events":
          if (!args.group_id) {
            throw new Error("group_id parameter is required");
          }
          return await this.getAffinityGroupEvents(args.group_id);
        case "get_affinity_group_kb":
          if (!args.group_id) {
            throw new Error("group_id parameter is required");
          }
          return await this.getAffinityGroupKB(args.group_id);
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

  protected async handleResourceRead(request: any) {
    const { uri } = request.params;

    if (uri === "accessci://affinity-groups") {
      return {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: "ACCESS-CI Affinity Groups API - Use the available tools to query specific groups, events, and knowledge base resources.",
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
            text: `No data found for affinity group ID: ${groupId}`,
          },
        ],
      };
    }

    // Clean up the response data
    const cleanData = Array.isArray(response.data)
      ? response.data.map((group) => ({
          title: group?.title,
          description: group?.description
            ?.replace(/<[^>]*>/g, "")
            .replace(/\\n/g, "\n")
            .trim(),
          coordinator: group?.coordinator_name,
          category: group?.field_affinity_group_category,
          slack_link: group?.slack_link,
          support_url: group?.url,
          ask_ci_forum: group?.field_ask_ci_locale,
        }))
      : response.data;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(cleanData, null, 2),
        },
      ],
    };
  }

  private async getAffinityGroupEvents(groupId: string) {
    const sanitizedId = sanitizeGroupId(groupId);
    const response = await this.httpClient.get(`/1.1/events/ag/${sanitizedId}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getAffinityGroupKB(groupId: string) {
    const sanitizedId = sanitizeGroupId(groupId);
    const response = await this.httpClient.get(`/1.0/kb/${sanitizedId}`);

    // Check for empty array response
    if (Array.isArray(response.data) && response.data.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No knowledge base resources found for this affinity group",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async listAffinityGroups() {
    const response = await this.httpClient.get("/1.1/affinity_groups/all");

    // Clean up the response data for better readability
    const cleanData = Array.isArray(response.data)
      ? response.data.map((group) => ({
          id: group.field_group_id || group.nid, // Use field_group_id if available
          nid: group.nid,
          title: group.title,
          description: group.description
            ?.replace(/<[^>]*>/g, "")
            .replace(/\\n/g, "\n")
            .trim(),
          coordinator: group.coordinator_name,
          category: group.field_affinity_group_category,
          slack_link: group.slack_link,
          support_url: group.url,
          ask_ci_forum: group.field_ask_ci_locale,
        }))
      : response.data;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              total_groups: Array.isArray(cleanData) ? cleanData.length : 0,
              groups: cleanData,
            },
            null,
            2,
          ),
        },
      ],
    };
  }
}
