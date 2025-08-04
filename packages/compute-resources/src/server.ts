import {
  BaseAccessServer,
  handleApiError,
  sanitizeGroupId,
} from "@access-mcp/shared";

export class ComputeResourcesServer extends BaseAccessServer {
  constructor() {
    super(
      "access-mcp-compute-resources",
      "0.1.0",
      "https://operations-api.access-ci.org",
    );
  }

  protected getTools() {
    return [
      {
        name: "list_compute_resources",
        description: "List all ACCESS-CI compute resources",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "get_compute_resource",
        description:
          "Get detailed information about a specific compute resource",
        inputSchema: {
          type: "object",
          properties: {
            resource_id: {
              type: "string",
              description: "The resource ID or info_groupid",
            },
          },
          required: ["resource_id"],
        },
      },
      {
        name: "get_resource_hardware",
        description: "Get hardware specifications for a compute resource",
        inputSchema: {
          type: "object",
          properties: {
            resource_id: {
              type: "string",
              description: "The resource ID or info_groupid",
            },
          },
          required: ["resource_id"],
        },
      },
    ];
  }

  protected getResources() {
    return [
      {
        uri: "accessci://compute-resources",
        name: "ACCESS-CI Compute Resources",
        description:
          "Information about ACCESS-CI compute resources, hardware, and software",
        mimeType: "application/json",
      },
    ];
  }

  async handleToolCall(request: any) {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "list_compute_resources":
          return await this.listComputeResources();
        case "get_compute_resource":
          return await this.getComputeResource(args.resource_id);
        case "get_resource_hardware":
          return await this.getResourceHardware(args.resource_id);
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

    if (uri === "accessci://compute-resources") {
      return {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: "ACCESS-CI Compute Resources API - Use the available tools to query compute resources, hardware specifications, and software availability.",
          },
        ],
      };
    }

    throw new Error(`Unknown resource: ${uri}`);
  }

  private async listComputeResources() {
    // Get all active resource groups
    const response = await this.httpClient.get(
      "/wh2/cider/v1/access-active-groups/type/resource-catalog.access-ci.org/",
    );

    // Check if the response has the expected structure
    if (
      !response.data ||
      !response.data.results ||
      !response.data.results.active_groups
    ) {
      throw new Error(
        `Unexpected API response structure. Got: ${JSON.stringify(response.data)}`,
      );
    }

    const computeResources = response.data.results.active_groups
      .filter((group: any) => {
        // Filter for compute resources (category 1 = "Compute & Storage Resources")
        return (
          group.rollup_info_resourceids &&
          !group.rollup_feature_ids.includes(137)
        );
      })
      .map((group: any) => ({
        id: group.info_groupid,
        name: group.group_descriptive_name,
        description: group.group_description,
        organization: group.rollup_organization_ids,
        features: group.rollup_feature_ids,
        resources: group.rollup_info_resourceids,
        logoUrl: group.group_logo_url,
        accessAllocated: group.rollup_feature_ids.includes(139),
      }));

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              total: computeResources.length,
              resources: computeResources,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private async getComputeResource(resourceId: string) {
    const sanitizedId = sanitizeGroupId(resourceId);

    // Get detailed resource information
    const response = await this.httpClient.get(
      `/wh2/cider/v1/access-active/info_groupid/${sanitizedId}/?format=json`,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data.results, null, 2),
        },
      ],
    };
  }

  private async getResourceHardware(resourceId: string) {
    // For now, return hardware info from the detailed resource endpoint
    // This could be enhanced with dedicated hardware endpoints if available
    const resourceData = await this.getComputeResource(resourceId);

    // Extract hardware-related information
    const fullData = JSON.parse(resourceData.content[0].text);
    const hardwareInfo = fullData.filter(
      (item: any) =>
        item.cider_type === "Compute" ||
        item.cider_type === "Storage" ||
        item.resource_descriptive_name?.toLowerCase().includes("node") ||
        item.resource_descriptive_name?.toLowerCase().includes("core") ||
        item.resource_descriptive_name?.toLowerCase().includes("memory"),
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              resource_id: resourceId,
              hardware: hardwareInfo,
            },
            null,
            2,
          ),
        },
      ],
    };
  }
}
