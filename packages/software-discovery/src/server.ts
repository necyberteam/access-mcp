import { BaseAccessServer, handleApiError } from "@access-mcp/shared";
import axios, { AxiosInstance } from "axios";

export class SoftwareDiscoveryServer extends BaseAccessServer {
  private _sdsClient?: AxiosInstance;

  constructor() {
    super(
      "access-mcp-software-discovery",
      "0.3.0",
      "https://ara-db.ccs.uky.edu",
    );
  }

  /**
   * Normalizes resource IDs to handle legacy XSEDE format and domain variations.
   * This provides backward compatibility while the SDS API migrates to ACCESS-CI format.
   *
   * @param resourceId - The resource ID to normalize
   * @returns The normalized resource ID in ACCESS-CI format
   */
  private normalizeResourceId(resourceId: string): string {
    // Convert old XSEDE format to new ACCESS-CI format
    if (resourceId.includes(".xsede.org")) {
      return resourceId.replace(".xsede.org", ".access-ci.org");
    }
    // Convert legacy domain variations
    if (resourceId.includes(".illinois.edu")) {
      return resourceId.replace(".illinois.edu", ".access-ci.org");
    }
    if (resourceId.includes(".edu")) {
      return resourceId.replace(".edu", ".access-ci.org");
    }
    // If already in correct format or unknown format, return as-is
    return resourceId;
  }

  protected get sdsClient(): AxiosInstance {
    if (!this._sdsClient) {
      this._sdsClient = axios.create({
        baseURL: "https://ara-db.ccs.uky.edu",
        timeout: 10000,
        headers: {
          "User-Agent": "access-mcp-software-discovery/0.3.0",
        },
        validateStatus: () => true,
      });
    }
    return this._sdsClient;
  }

  protected getTools() {
    return [
      {
        name: "search_software",
        description: "Search for software packages across ACCESS-CI resources. Supports global search (without resource_filter) to find software across all resources, or resource-specific search (with resource_filter).",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for software names (e.g., 'python', 'tensorflow', 'gromacs')",
            },
            resource_filter: {
              type: "string",
              description: "Optional: filter results by specific resource ID (e.g., 'delta.ncsa.access-ci.org'). If omitted, searches across all ACCESS-CI resources.",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "list_software_by_resource",
        description:
          "List all available software packages for a specific ACCESS-CI resource",
        inputSchema: {
          type: "object",
          properties: {
            resource_id: {
              type: "string",
              description: "The resource ID (e.g., anvil.purdue.access-ci.org)",
            },
            limit: {
              type: "number",
              description:
                "Maximum number of packages to return (default: 100)",
            },
          },
          required: ["resource_id"],
        },
      },
      {
        name: "get_software_details",
        description:
          "Get detailed information about a specific software package",
        inputSchema: {
          type: "object",
          properties: {
            software_name: {
              type: "string",
              description: "Name of the software package",
            },
            resource_id: {
              type: "string",
              description:
                "Optional: specific resource to get package details for",
            },
          },
          required: ["software_name"],
        },
      },
      {
        name: "get_software_categories",
        description: "Get available software categories and domains",
        inputSchema: {
          type: "object",
          properties: {
            resource_id: {
              type: "string",
              description: "Optional: filter categories by specific resource",
            },
          },
          required: [],
        },
      },
    ];
  }

  protected getResources() {
    return [
      {
        uri: "accessci://software-discovery",
        name: "ACCESS-CI Software Discovery Service",
        description:
          "Search and discover software packages available on ACCESS-CI resources",
        mimeType: "application/json",
      },
      {
        uri: "accessci://software/categories",
        name: "Software Categories",
        description: "Browse software by category and domain",
        mimeType: "application/json",
      },
    ];
  }

  protected async handleToolCall(request: any) {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case "search_software":
          return await this.searchSoftware(args.query, args.resource_filter);
        case "list_software_by_resource":
          return await this.listSoftwareByResource(
            args.resource_id,
            args.limit,
          );
        case "get_software_details":
          return await this.getSoftwareDetails(
            args.software_name,
            args.resource_id,
          );
        case "get_software_categories":
          return await this.getSoftwareCategories(args.resource_id);
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

    switch (uri) {
      case "accessci://software-discovery":
        return {
          contents: [
            {
              uri,
              mimeType: "text/plain",
              text: "ACCESS-CI Software Discovery Service - Search and discover software packages available on ACCESS-CI resources.",
            },
          ],
        };
      case "accessci://software/categories":
        const categories = await this.getSoftwareCategories();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: categories.content[0].text,
            },
          ],
        };
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  private async searchSoftware(query: string, resourceFilter?: string) {
    const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;

    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                error:
                  "SDS API key not configured. Set SDS_API_KEY environment variable.",
                results: [],
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    // If resourceFilter is provided, use the old resource-specific search
    if (resourceFilter) {
      return await this.listSoftwareByResource(resourceFilter, 100, query);
    }

    // Use the new global software search API format
    try {
      const apiFields = [
        "software_name",
        "software_description", 
        "software_web_page",
        "software_documentation",
        "software_use_link",
        "software_versions",
        "rp_name",
        "rp_group_id"
      ];

      const response = await this.sdsClient.get(
        `/API_0.1/${apiKey}/software=${encodeURIComponent(query)},include=${apiFields.join("+")}`
      );

      if (response.status !== 200) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  error: `SDS API error: ${response.status} ${response.statusText}`,
                  results: [],
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      const results = Array.isArray(response.data) ? response.data : [];
      
      // Transform results to show which resources have the software
      const transformedResults = results.map((item: any) => {
        const resources = Array.isArray(item.rp_name) ? item.rp_name : [item.rp_name];
        const resourceIds = Array.isArray(item.rp_group_id) ? item.rp_group_id : [item.rp_group_id];
        
        return {
          name: item.software_name,
          description: item.software_description,
          versions: item.software_versions || [],
          documentation: item.software_documentation,
          website: item.software_web_page,
          usage_link: item.software_use_link,
          available_on_resources: resources.filter(Boolean),
          resource_ids: resourceIds.filter(Boolean),
        };
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                query,
                search_type: "global",
                total_matches: transformedResults.length,
                software: transformedResults,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                query,
                error: `Global search failed: ${error.message}`,
                fallback: "Try using list_software_by_resource with a specific resource ID",
                results: [],
              },
              null,
              2,
            ),
          },
        ],
      };
    }
  }

  private async listSoftwareByResource(
    resourceId: string,
    limit = 100,
    searchQuery?: string,
  ) {
    const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;

    if (!apiKey) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                resource_id: resourceId,
                error:
                  "SDS API key not configured. Set SDS_API_KEY environment variable.",
                software: [],
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    // Normalize the resource ID to handle legacy formats
    const normalizedResourceId = this.normalizeResourceId(resourceId);

    const apiFields = [
      "software_name",
      "software_description",
      "software_web_page",
      "software_documentation",
      "software_use_link",
      "software_versions",
    ];

    const response = await this.sdsClient.get(
      `/API_0.1/${apiKey}/rp=${normalizedResourceId},include=${apiFields.join("+")}`,
    );

    if (response.status !== 200) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                resource_id: resourceId,
                normalized_resource_id: normalizedResourceId,
                error: `SDS API error: ${response.status} ${response.statusText}`,
                software: [],
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    let softwareList = Array.isArray(response.data) ? response.data : [];

    // Apply search filter if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      softwareList = softwareList.filter(
        (pkg: any) =>
          pkg.software_name?.toLowerCase().includes(query) ||
          pkg.software_description?.toLowerCase().includes(query),
      );
    }

    // Apply limit
    if (limit && softwareList.length > limit) {
      softwareList = softwareList.slice(0, limit);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              resource_id: resourceId,
              normalized_resource_id: normalizedResourceId,
              total_packages: softwareList.length,
              search_query: searchQuery,
              software: softwareList.map((pkg: any) => ({
                name: pkg.software_name,
                description: pkg.software_description,
                versions: pkg.software_versions || [],
                documentation: pkg.software_documentation,
                website: pkg.software_web_page,
                usage_link: pkg.software_use_link,
              })),
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private async getSoftwareDetails(softwareName: string, resourceId?: string) {
    if (!resourceId) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                software_name: softwareName,
                error:
                  "resource_id parameter is required to get software details",
                details: null,
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    // Get all software for the resource and filter by name
    const allSoftware = await this.listSoftwareByResource(resourceId, 1000);
    const allSoftwareData = JSON.parse(allSoftware.content[0].text);

    if (allSoftwareData.error) {
      return allSoftware;
    }

    const softwareDetails = allSoftwareData.software.find(
      (pkg: any) => pkg.name.toLowerCase() === softwareName.toLowerCase(),
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              software_name: softwareName,
              resource_id: resourceId,
              found: !!softwareDetails,
              details: softwareDetails || null,
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  private async getSoftwareCategories(resourceId?: string) {
    // This would ideally query the SDS API for categories
    // For now, return common software categories found on HPC systems
    const categories = [
      {
        name: "Compilers",
        description: "Programming language compilers and toolchains",
      },
      { name: "Libraries", description: "Software libraries and frameworks" },
      { name: "Applications", description: "End-user applications and tools" },
      {
        name: "Development Tools",
        description: "Development and debugging tools",
      },
      {
        name: "Scientific Computing",
        description: "Scientific and numerical computing packages",
      },
      {
        name: "Data Analytics",
        description: "Data analysis and visualization tools",
      },
      {
        name: "Machine Learning",
        description: "AI and machine learning frameworks",
      },
      { name: "Bioinformatics", description: "Biological data analysis tools" },
      { name: "Chemistry", description: "Computational chemistry packages" },
      { name: "Physics", description: "Physics simulation and modeling tools" },
    ];

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              resource_id: resourceId,
              categories: categories,
            },
            null,
            2,
          ),
        },
      ],
    };
  }
}
