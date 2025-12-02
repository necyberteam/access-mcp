import { BaseAccessServer, handleApiError } from "@access-mcp/shared";
import axios, { AxiosInstance } from "axios";

interface SoftwareQueryParams {
  software?: string[];
  rps?: string[];
  columns?: string[];
  exclude?: boolean;
  fuzz_software?: boolean;
  fuzz_rp?: boolean;
  collapse_resource_groups?: boolean;
}

interface RpInfo {
  rp_name: string;
  rp_resource_id: string[];
  software_versions: string;
  rp_software_documentation?: string;
}

interface SoftwareItem {
  software_name: string;
  software_description?: string;
  software_web_page?: string;
  software_documentation?: string;
  software_use_link?: string;
  rps?: Record<string, RpInfo>;
  ai_description?: string;
  ai_general_tags?: string;
  ai_research_area?: string;
  ai_research_discipline?: string;
  ai_research_field?: string;
  ai_software_type?: string;
  ai_software_class?: string;
  ai_core_features?: string;
  ai_example_use?: string;
}

interface ApiResponse {
  data: SoftwareItem[];
}

export class SoftwareDiscoveryServer extends BaseAccessServer {
  private _sdsClient?: AxiosInstance;

  constructor() {
    super(
      "access-mcp-software-discovery",
      "0.6.0",
      "https://sds-ara-api.access-ci.org",
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
      resourceId = resourceId.replace(".xsede.org", ".access-ci.org");
    }
    // Convert legacy domain variations
    if (resourceId.includes(".illinois.edu")) {
      resourceId = resourceId.replace(".illinois.edu", ".access-ci.org");
    }
    if (resourceId.includes(".edu")) {
      resourceId = resourceId.replace(".edu", ".access-ci.org");
    }

    // Handle specific resource types from compute-resources service
    // Convert delta-gpu.ncsa.access-ci.org -> delta.ncsa.access-ci.org
    // Convert delta-cpu.ncsa.access-ci.org -> delta.ncsa.access-ci.org
    // Convert delta-storage.ncsa.access-ci.org -> delta.ncsa.access-ci.org
    resourceId = resourceId.replace(/-(gpu|cpu|storage|compute)\./, '.');

    // Handle other common patterns
    resourceId = resourceId.replace(/-(login|data|transfer)\./, '.');

    // If already in correct format or unknown format, return as-is
    return resourceId;
  }

  protected get sdsClient(): AxiosInstance {
    if (!this._sdsClient) {
      const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;

      this._sdsClient = axios.create({
        baseURL: "https://sds-ara-api.access-ci.org",
        timeout: 30000,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "access-mcp-software-discovery/0.6.0",
          ...(apiKey ? { "X-API-Key": apiKey } : {}),
        },
        validateStatus: () => true,
      });
    }
    return this._sdsClient;
  }

  /**
   * Makes a query to the new SDS API v1
   */
  private async queryApi(params: SoftwareQueryParams): Promise<SoftwareItem[]> {
    const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;

    if (!apiKey) {
      throw new Error("SDS API key not configured. Set SDS_API_KEY environment variable.");
    }

    const response = await this.sdsClient.post("/api/v1", params);

    if (response.status !== 200) {
      throw new Error(`SDS API error: ${response.status} ${response.statusText}`);
    }

    // Handle the new API response format: { data: [...] }
    const responseData = response.data as ApiResponse | SoftwareItem[];
    if ('data' in responseData && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    return Array.isArray(responseData) ? responseData : [];
  }

  protected getTools() {
    return [
      {
        name: "search_software",
        description: "Search software packages on ACCESS-CI HPC resources with fuzzy matching. Returns {total, items}.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Software name to search (e.g., 'python', 'tensorflow', 'gromacs'). Fuzzy matching finds partial matches."
            },
            resource: {
              type: "string",
              description: "Filter to resource (e.g., 'anvil', 'delta', 'expanse', 'bridges-2')"
            },
            fuzzy: {
              type: "boolean",
              description: "Enable fuzzy/partial matching (default: true)",
              default: true
            },
            include_ai_metadata: {
              type: "boolean",
              description: "Include AI metadata (tags, research area, software type)",
              default: true
            },
            limit: {
              type: "number",
              description: "Max results (default: 100)",
              default: 100
            }
          },
          examples: [
            {
              name: "Search for Python",
              arguments: { query: "python", limit: 10 }
            },
            {
              name: "Find TensorFlow on Anvil",
              arguments: { query: "tensorflow", resource: "anvil" }
            },
            {
              name: "Search MPI libraries on Delta",
              arguments: { query: "mpi", resource: "delta", limit: 20 }
            }
          ]
        }
      },
      {
        name: "list_all_software",
        description: "List all available software packages on ACCESS-CI resources. Returns {total, items}.",
        inputSchema: {
          type: "object",
          properties: {
            resource: {
              type: "string",
              description: "Filter to resource (e.g., 'anvil', 'delta'). Omit for all resources."
            },
            include_ai_metadata: {
              type: "boolean",
              description: "Include AI metadata (default: false for compact output)",
              default: false
            },
            limit: {
              type: "number",
              description: "Max results (default: 100)",
              default: 100
            }
          },
          examples: [
            {
              name: "List all software",
              arguments: { limit: 50 }
            },
            {
              name: "List software on Delta",
              arguments: { resource: "delta", limit: 100 }
            }
          ]
        }
      },
      {
        name: "get_software_details",
        description: "Get detailed info about a specific software package including versions and availability. Returns {found, details, other_matches}.",
        inputSchema: {
          type: "object",
          properties: {
            software_name: {
              type: "string",
              description: "Software name (e.g., 'tensorflow', 'gromacs', 'python')"
            },
            resource: {
              type: "string",
              description: "Filter to specific resource (optional)"
            },
            fuzzy: {
              type: "boolean",
              description: "Enable fuzzy matching (default: true)",
              default: true
            }
          },
          required: ["software_name"],
          examples: [
            {
              name: "Get TensorFlow details",
              arguments: { software_name: "tensorflow" }
            },
            {
              name: "Get GROMACS on Expanse",
              arguments: { software_name: "gromacs", resource: "expanse" }
            }
          ]
        }
      },
      {
        name: "compare_software_availability",
        description: "Compare availability of multiple software packages across resources. Returns {comparison, summary}.",
        inputSchema: {
          type: "object",
          properties: {
            software_names: {
              type: "array",
              items: { type: "string" },
              description: "Software packages to compare (e.g., ['tensorflow', 'pytorch'])"
            },
            resources: {
              type: "array",
              items: { type: "string" },
              description: "Resources to check (optional, compares all if omitted)"
            }
          },
          required: ["software_names"],
          examples: [
            {
              name: "Compare ML frameworks",
              arguments: { software_names: ["tensorflow", "pytorch", "cuda"] }
            },
            {
              name: "Check compilers on specific resources",
              arguments: {
                software_names: ["gcc", "intel", "nvhpc"],
                resources: ["anvil", "delta", "expanse"]
              }
            }
          ]
        }
      }
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
        name: "Software Filter Values",
        description: "Discover available filter values from actual software data",
        mimeType: "application/json",
      },
    ];
  }

  protected async handleToolCall(request: any) {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case "search_software":
          return await this.searchSoftware(args);
        case "list_all_software":
          return await this.listAllSoftware(args);
        case "get_software_details":
          return await this.getSoftwareDetails(args);
        case "compare_software_availability":
          return await this.compareSoftwareAvailability(args);
        default:
          return this.errorResponse(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return this.errorResponse(handleApiError(error));
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
              text: "ACCESS-CI Software Discovery Service - Search and discover software packages available on ACCESS-CI resources. Uses the new SDS API v1 with fuzzy search support.",
            },
          ],
        };
      case "accessci://software/categories":
        const filterValues = await this.discoverFilterValues();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: filterValues.content[0].text,
            },
          ],
        };
      default:
        throw new Error(`Unknown resource: ${uri}`);
    }
  }

  /**
   * Transform raw API response to enhanced format
   */
  private transformSoftwareItem(item: SoftwareItem, includeAiMetadata: boolean = true): any {
    // Extract resource information from the rps object
    const resources: string[] = [];
    const resourceIds: string[] = [];
    const versionsPerResource: Record<string, string> = {};

    if (item.rps) {
      for (const [rpKey, rpInfo] of Object.entries(item.rps)) {
        resources.push(rpInfo.rp_name || rpKey);
        if (rpInfo.rp_resource_id) {
          resourceIds.push(...rpInfo.rp_resource_id);
        }
        if (rpInfo.software_versions) {
          versionsPerResource[rpInfo.rp_name || rpKey] = rpInfo.software_versions;
        }
      }
    }

    // Collect all unique versions across resources
    const allVersions = new Set<string>();
    Object.values(versionsPerResource).forEach(versions => {
      versions.split(',').forEach(v => {
        const trimmed = v.trim();
        if (trimmed) allVersions.add(trimmed);
      });
    });

    const result: any = {
      name: item.software_name,
      description: item.software_description || null,
      versions: Array.from(allVersions).sort(),
      documentation: item.software_documentation || null,
      website: item.software_web_page || null,
      usage_link: item.software_use_link || null,
      available_on_resources: [...new Set(resources)],
      resource_ids: [...new Set(resourceIds)],
      versions_by_resource: Object.keys(versionsPerResource).length > 0 ? versionsPerResource : undefined,
    };

    if (includeAiMetadata) {
      result.ai_metadata = {
        description: item.ai_description || null,
        tags: item.ai_general_tags
          ? item.ai_general_tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          : [],
        research_area: item.ai_research_area || null,
        research_discipline: item.ai_research_discipline || null,
        research_field: item.ai_research_field || null,
        software_type: item.ai_software_type || null,
        software_class: item.ai_software_class || null,
        core_features: item.ai_core_features || null,
        example_use: item.ai_example_use || null,
      };
    }

    return result;
  }

  private async searchSoftware(args: {
    query?: string;
    resource?: string;
    fuzzy?: boolean;
    include_ai_metadata?: boolean;
    limit?: number;
  }) {
    const {
      query,
      resource,
      fuzzy = true,
      include_ai_metadata = true,
      limit = 100
    } = args;

    // Build query params
    const params: SoftwareQueryParams = {};

    if (query) {
      params.software = [query];
      if (fuzzy) {
        params.fuzz_software = true;
      }
    } else {
      // Get all software if no query
      params.software = ["*"];
    }

    if (resource) {
      const normalizedResource = this.normalizeResourceId(resource);
      params.rps = [normalizedResource];
      if (fuzzy) {
        params.fuzz_rp = true;
      }
    }

    try {
      let results = await this.queryApi(params);

      // Sort results by match quality when there's a query: exact > starts-with > contains
      if (query) {
        const queryLower = query.toLowerCase();
        results = [...results].sort((a, b) => {
          const aName = a.software_name.toLowerCase();
          const bName = b.software_name.toLowerCase();

          const aExact = aName === queryLower ? 0 : 1;
          const bExact = bName === queryLower ? 0 : 1;
          if (aExact !== bExact) return aExact - bExact;

          const aStarts = aName.startsWith(queryLower) ? 0 : 1;
          const bStarts = bName.startsWith(queryLower) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;

          const aContains = aName.includes(queryLower) ? 0 : 1;
          const bContains = bName.includes(queryLower) ? 0 : 1;
          return aContains - bContains;
        });
      }

      // Apply limit
      const limitedResults = results.slice(0, limit);

      // Transform results
      const transformedResults = limitedResults.map(item =>
        this.transformSoftwareItem(item, include_ai_metadata)
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            total: transformedResults.length,
            query: query || null,
            resource_filter: resource || null,
            fuzzy_matching: fuzzy,
            items: transformedResults
          })
        }]
      };
    } catch (error: any) {
      return this.errorResponse(error.message);
    }
  }

  private async listAllSoftware(args: {
    resource?: string;
    include_ai_metadata?: boolean;
    limit?: number;
  }) {
    const {
      resource,
      include_ai_metadata = false,
      limit = 100
    } = args;

    const params: SoftwareQueryParams = {
      software: ["*"]
    };

    if (resource) {
      const normalizedResource = this.normalizeResourceId(resource);
      params.rps = [normalizedResource];
      params.fuzz_rp = true;
    }

    try {
      const results = await this.queryApi(params);

      // Apply limit
      const limitedResults = results.slice(0, limit);

      // Transform results
      const transformedResults = limitedResults.map(item =>
        this.transformSoftwareItem(item, include_ai_metadata)
      );

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            total: transformedResults.length,
            resource_filter: resource || "all resources",
            items: transformedResults
          })
        }]
      };
    } catch (error: any) {
      return this.errorResponse(error.message);
    }
  }

  private async getSoftwareDetails(args: {
    software_name: string;
    resource?: string;
    fuzzy?: boolean;
  }) {
    const {
      software_name,
      resource,
      fuzzy = true
    } = args;

    const params: SoftwareQueryParams = {
      software: [software_name],
      fuzz_software: fuzzy
    };

    if (resource) {
      const normalizedResource = this.normalizeResourceId(resource);
      params.rps = [normalizedResource];
      params.fuzz_rp = true;
    }

    try {
      const results = await this.queryApi(params);

      if (results.length === 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              software_name,
              found: false,
              message: `No software found matching '${software_name}'${resource ? ` on resource '${resource}'` : ''}`,
              suggestion: "Try a different search term or enable fuzzy matching"
            })
          }]
        };
      }

      // Sort results by match quality: exact > starts-with > contains
      const queryLower = software_name.toLowerCase();
      const sortedResults = [...results].sort((a, b) => {
        const aName = a.software_name.toLowerCase();
        const bName = b.software_name.toLowerCase();

        const aExact = aName === queryLower ? 0 : 1;
        const bExact = bName === queryLower ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;

        const aStarts = aName.startsWith(queryLower) ? 0 : 1;
        const bStarts = bName.startsWith(queryLower) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;

        const aContains = aName.includes(queryLower) ? 0 : 1;
        const bContains = bName.includes(queryLower) ? 0 : 1;
        return aContains - bContains;
      });

      // Get the best match with full details
      const bestMatch = this.transformSoftwareItem(sortedResults[0], true);

      // If there are multiple matches, include them
      const otherMatches = sortedResults.slice(1, 5).map(item => ({
        name: item.software_name,
        resources: item.rps ? Object.values(item.rps).map(rp => rp.rp_name) : []
      }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            software_name,
            found: true,
            details: bestMatch,
            other_matches: otherMatches.length > 0 ? otherMatches : undefined
          })
        }]
      };
    } catch (error: any) {
      return this.errorResponse(error.message);
    }
  }

  private async compareSoftwareAvailability(args: {
    software_names: string[];
    resources?: string[];
  }) {
    const { software_names, resources } = args;

    try {
      // Query for all requested software
      const params: SoftwareQueryParams = {
        software: software_names,
        fuzz_software: true
      };

      if (resources && resources.length > 0) {
        params.rps = resources.map(r => this.normalizeResourceId(r));
        params.fuzz_rp = true;
      }

      const results = await this.queryApi(params);

      // Build availability matrix
      const availabilityMap: Record<string, Set<string>> = {};
      const allResources = new Set<string>();

      for (const item of results) {
        const softwareName = item.software_name.toLowerCase();

        if (!availabilityMap[softwareName]) {
          availabilityMap[softwareName] = new Set();
        }

        // Extract resources from the rps object
        if (item.rps) {
          for (const rpInfo of Object.values(item.rps)) {
            const rpName = rpInfo.rp_name;
            if (rpName) {
              availabilityMap[softwareName].add(rpName);
              allResources.add(rpName);
            }
          }
        }
      }

      // Create comparison table
      const comparison: any[] = [];

      for (const softwareName of software_names) {
        const softwareLower = softwareName.toLowerCase();

        // Priority matching: exact match first, then starts-with, then contains
        let foundKey = Object.keys(availabilityMap).find(k => k === softwareLower);
        if (!foundKey) {
          foundKey = Object.keys(availabilityMap).find(k => k.startsWith(softwareLower));
        }
        if (!foundKey) {
          foundKey = Object.keys(availabilityMap).find(k => k.includes(softwareLower));
        }
        if (!foundKey) {
          foundKey = Object.keys(availabilityMap).find(k => softwareLower.includes(k));
        }

        comparison.push({
          software: softwareName,
          found: !!foundKey,
          available_on: foundKey ? Array.from(availabilityMap[foundKey]) : [],
          resource_count: foundKey ? availabilityMap[foundKey].size : 0
        });
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            requested_software: software_names,
            requested_resources: resources || "all",
            all_resources_found: Array.from(allResources).sort(),
            comparison,
            summary: {
              total_software_requested: software_names.length,
              software_found: comparison.filter(c => c.found).length,
              software_not_found: comparison.filter(c => !c.found).map(c => c.software)
            }
          })
        }]
      };
    } catch (error: any) {
      return this.errorResponse(error.message);
    }
  }

  private async discoverFilterValues() {
    try {
      // Get a sample of all software
      const results = await this.queryApi({
        software: ["*"]
      });

      // Extract unique values
      const researchAreas = new Set<string>();
      const tags = new Map<string, number>();
      const softwareTypes = new Set<string>();
      const resources = new Set<string>();

      for (const item of results) {
        // Collect research areas
        if (item.ai_research_area) researchAreas.add(item.ai_research_area);
        if (item.ai_research_discipline) researchAreas.add(item.ai_research_discipline);
        if (item.ai_research_field) researchAreas.add(item.ai_research_field);

        // Collect and count tags
        if (item.ai_general_tags) {
          const itemTags = item.ai_general_tags.split(',').map(t => t.trim()).filter(Boolean);
          for (const tag of itemTags) {
            tags.set(tag, (tags.get(tag) || 0) + 1);
          }
        }

        // Collect software types
        if (item.ai_software_type) softwareTypes.add(item.ai_software_type);
        if (item.ai_software_class) softwareTypes.add(item.ai_software_class);

        // Collect resources from the rps object
        if (item.rps) {
          for (const rpInfo of Object.values(item.rps)) {
            if (rpInfo.rp_name) resources.add(rpInfo.rp_name);
          }
        }
      }

      // Sort tags by frequency
      const sortedTags = Array.from(tags.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([tag, count]) => ({ value: tag, count }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            sample_size: results.length,
            discovered_values: {
              research_areas: Array.from(researchAreas).sort(),
              software_types: Array.from(softwareTypes).sort(),
              top_tags: sortedTags,
              resources: Array.from(resources).sort()
            },
            api_info: {
              version: "v1",
              base_url: "https://sds-ara-api.access-ci.org",
              supports_fuzzy_search: true
            }
          }, null, 2)
        }]
      };
    } catch (error: any) {
      return this.errorResponse(error.message);
    }
  }
}
