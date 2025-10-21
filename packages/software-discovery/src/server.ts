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
        description: "Search for software packages across ACCESS-CI resources. Returns both standard and AI-enhanced metadata when available. **Resource Discovery Workflow**: 1) Use `access-compute-resources:search_resources` with `include_resource_ids: true` to find resource IDs, 2) Use returned IDs in the `resource_id` parameter to filter results by specific resources.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for software names (e.g., 'python', 'tensorflow', 'gromacs')",
            },
            resource_id: {
              type: "string",
              description: "Optional: filter by specific resource ID (e.g., 'delta.ncsa.access-ci.org'). **Finding Resource IDs**: If you don't know the exact resource ID, first use `access-compute-resources:search_resources` with `include_resource_ids: true` to discover available resources and their IDs.",
            },
            include_ai_metadata: {
              type: "boolean",
              description: "Include AI-generated metadata (tags, research area, software type) when available. Default: true",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 100)",
            },
          },
        },
      },
      {
        name: "search_with_filters",
        description: "Advanced search with client-side filtering on AI-enhanced metadata. Can search all software or filter specific search results. **Resource Discovery**: Use `access-compute-resources:search_resources` with `include_resource_ids: true` to find resource IDs for the `resource_id` parameter.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Base search query (optional - if omitted, searches all software; use specific terms to narrow the base set)",
            },
            resource_id: {
              type: "string",
              description: "Optional: specific resource to search. **Finding Resource IDs**: If you don't know the exact resource ID, first use `access-compute-resources:search_resources` with `include_resource_ids: true` to discover available resources and their IDs.",
            },
            filter_research_area: {
              type: "string",
              description: "Filter by AI-identified research area (partial match, case-insensitive).",
            },
            filter_tags: {
              type: "array",
              items: { type: "string" },
              description: "Filter by AI tags (matches any of the provided tags from ai_general_tags field).",
            },
            filter_software_type: {
              type: "string",
              description: "Filter by AI-identified software type (partial match)",
            },
            limit: {
              type: "number",
              description: "Maximum results after filtering (default: 50)",
            },
          },
        },
      },
      {
        name: "list_software_by_resource",
        description:
          "List all available software packages for a specific ACCESS-CI resource. **REQUIRED**: You must have a valid resource ID. Use `access-compute-resources:search_resources` with `include_resource_ids: true` to discover available resources and their IDs first.",
        inputSchema: {
          type: "object",
          properties: {
            resource_id: {
              type: "string",
              description: "The resource ID (e.g., anvil.purdue.access-ci.org). **Finding Resource IDs**: If you don't know the exact resource ID, first use `access-compute-resources:search_resources` with `include_resource_ids: true` to discover available resources and their IDs.",
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
                "Optional: specific resource to get package details for. **Finding Resource IDs**: If you don't know the exact resource ID, first use `access-compute-resources:search_resources` with `include_resource_ids: true` to discover available resources and their IDs.",
            },
          },
          required: ["software_name"],
        },
      },
      {
        name: "discover_filter_values",
        description: "Discover available filter values by sampling actual software data from all software or a specific resource. **Resource Discovery**: Use `access-compute-resources:search_resources` with `include_resource_ids: true` to find resource IDs for the `resource_id` parameter.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Optional: Search query to get sample data (if omitted, samples from all software)",
            },
            resource_id: {
              type: "string",
              description: "Optional: discover values for a specific resource only. **Finding Resource IDs**: If you don't know the exact resource ID, first use `access-compute-resources:search_resources` with `include_resource_ids: true` to discover available resources and their IDs.",
            },
            sample_size: {
              type: "number",
              description: "Number of software packages to sample for discovering values (default: 200)",
            },
          },
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
        case "search_with_filters":
          return await this.searchWithFilters(args);
        case "discover_filter_values":
          return await this.discoverFilterValues(args);
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
        // Discover actual filter values from the data
        const filterValues = await this.discoverFilterValues({ sample_size: 100 });
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

  private async getAllSoftware(args: {
    resource_id?: string;
    include_ai_metadata?: boolean;
    limit?: number;
  }) {
    const apiKey = process.env.SDS_API_KEY || process.env.VITE_SDS_API_KEY;

    if (!apiKey) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: "SDS API key not configured. Set SDS_API_KEY environment variable."
          }, null, 2)
        }]
      };
    }

    // If resource_id is provided, get all software from that resource
    if (args.resource_id) {
      return await this.listSoftwareByResource(
        args.resource_id,
        args.limit || 1000
      );
    }

    // For all software across all resources, try a direct API call without software filter
    // Based on SDS API docs, we can query by just including fields
    try {
      const baseFields = [
        "software_name",
        "software_description", 
        "software_web_page",
        "software_documentation",
        "software_use_link",
        "software_versions",
        "rp_name",
        "rp_group_id"
      ];
      
      const aiFields = args.include_ai_metadata ? [
        "ai_description",
        "ai_general_tags",
        "ai_research_area",
        "ai_research_discipline",
        "ai_research_field",
        "ai_software_type",
        "ai_software_class",
        "ai_core_features",
        "ai_example_use"
      ] : [];
      
      const apiFields = [...baseFields, ...aiFields];

      // Try different API approaches to get all software
      const apiAttempts = [
        // Approach 1: Query all with wildcard
        `/API_0.1/${apiKey}/software=*,include=${apiFields.join("+")}`,
        // Approach 2: Query all without software filter
        `/API_0.1/${apiKey}/include=${apiFields.join("+")}`,
        // Approach 3: Empty software query
        `/API_0.1/${apiKey}/software=,include=${apiFields.join("+")}`,
      ];

      for (const endpoint of apiAttempts) {
        try {
          const response = await this.sdsClient.get(endpoint);
          
          if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
            let results = response.data;
            
            // Apply limit
            const limit = args.limit || 1000;
            if (results.length > limit) {
              results = results.slice(0, limit);
            }
            
            // Transform results
            const transformedResults = results.map((item: any) => {
              const resources = Array.isArray(item.rp_name) ? item.rp_name : [item.rp_name];
              const resourceIds = Array.isArray(item.rp_group_id) ? item.rp_group_id : [item.rp_group_id];
              
              const baseResult: any = {
                name: item.software_name,
                description: item.software_description,
                versions: item.software_versions || [],
                documentation: item.software_documentation,
                website: item.software_web_page,
                usage_link: item.software_use_link,
                available_on_resources: resources.filter(Boolean),
                resource_ids: resourceIds.filter(Boolean),
              };
              
              // Add AI-enhanced fields if available
              if (args.include_ai_metadata) {
                baseResult.ai_metadata = {
                  description: item.ai_description || null,
                  tags: item.ai_general_tags ? item.ai_general_tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
                  research_area: item.ai_research_area || null,
                  research_discipline: item.ai_research_discipline || null,
                  research_field: item.ai_research_field || null,
                  software_type: item.ai_software_type || null,
                  software_class: item.ai_software_class || null,
                  core_features: item.ai_core_features || null,
                  example_use: item.ai_example_use || null,
                };
              }
              
              return baseResult;
            });

            return {
              content: [{
                type: "text",
                text: JSON.stringify({
                  search_type: "all_software",
                  api_endpoint: endpoint,
                  total_matches: transformedResults.length,
                  ai_metadata_included: args.include_ai_metadata,
                  software: transformedResults,
                }, null, 2)
              }]
            };
          }
        } catch (e) {
          // Try next approach
          continue;
        }
      }

      // If all API approaches fail, fall back to broad search terms
      const broadTerms = ['software', 'tool', 'library', 'application'];
      let allSoftware: any[] = [];
      
      for (const term of broadTerms) {
        try {
          const result = await this.searchSoftware({
            query: term,
            include_ai_metadata: args.include_ai_metadata,
            limit: 250,
          });
          
          const data = JSON.parse(result.content[0].text);
          if (!data.error && data.software) {
            allSoftware.push(...data.software);
          }
        } catch (e) {
          continue;
        }
      }

      // Remove duplicates based on software name
      const uniqueSoftware = allSoftware.filter((item, index, self) => 
        index === self.findIndex(s => s.name === item.name)
      );

      const limit = args.limit || 1000;
      const limitedResults = uniqueSoftware.slice(0, limit);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            search_type: "aggregated_broad_search",
            total_matches: limitedResults.length,
            ai_metadata_included: args.include_ai_metadata,
            software: limitedResults,
          }, null, 2)
        }]
      };
      
    } catch (error: any) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: `Failed to retrieve all software: ${error.message}`,
            suggestion: "Try using search_software with a specific query term"
          }, null, 2)
        }]
      };
    }
  }

  private async searchSoftware(args: {
    query?: string;
    resource_id?: string;
    include_ai_metadata?: boolean;
    limit?: number;
  }) {
    const { 
      query = '', 
      resource_id,
      include_ai_metadata = true,
      limit = 100
    } = args;
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

    // If resource_id is provided, use the resource-specific search
    if (resource_id) {
      return await this.listSoftwareByResource(resource_id, limit, query);
    }

    // Use the new global software search API format
    try {
      // Include AI-enhanced fields if requested
      const baseFields = [
        "software_name",
        "software_description", 
        "software_web_page",
        "software_documentation",
        "software_use_link",
        "software_versions",
        "rp_name",
        "rp_group_id"
      ];
      
      const aiFields = include_ai_metadata ? [
        "ai_description",
        "ai_general_tags",
        "ai_research_area",
        "ai_research_discipline",
        "ai_research_field",
        "ai_software_type",
        "ai_software_class",
        "ai_core_features",
        "ai_example_use"
      ] : [];
      
      const apiFields = [...baseFields, ...aiFields];

      const response = await this.sdsClient.get(
        `/API_0.1/${apiKey}/software=${encodeURIComponent(query)},include=${apiFields.join("+")}`
      );

      if (response.status !== 200) {
        let suggestion = "Try a different search term or check your API key.";
        if (response.status === 404) {
          suggestion = "The search term may not be found in the database. Try broader terms like 'python', 'gcc', or 'software'.";
        }
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query,
                  error: `SDS API error: ${response.status} ${response.statusText}`,
                  suggestion,
                  help: {
                    resource_discovery: "Use the compute-resources server's search_resources tool with include_resource_ids: true",
                    broad_search_examples: ["python", "gcc", "mpi", "cuda", "software"],
                  },
                  results: [],
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      let results = Array.isArray(response.data) ? response.data : [];
      
      // Apply limit
      if (limit && results.length > limit) {
        results = results.slice(0, limit);
      }
      
      // Transform results to show which resources have the software
      const transformedResults = results.map((item: any) => {
        const resources = Array.isArray(item.rp_name) ? item.rp_name : [item.rp_name];
        const resourceIds = Array.isArray(item.rp_group_id) ? item.rp_group_id : [item.rp_group_id];
        
        const baseResult: any = {
          name: item.software_name,
          description: item.software_description,
          versions: item.software_versions || [],
          documentation: item.software_documentation,
          website: item.software_web_page,
          usage_link: item.software_use_link,
          available_on_resources: resources.filter(Boolean),
          resource_ids: resourceIds.filter(Boolean),
        };
        
        // Add AI-enhanced fields if available
        if (include_ai_metadata) {
          baseResult.ai_metadata = {
            description: item.ai_description || null,
            tags: item.ai_general_tags ? item.ai_general_tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
            research_area: item.ai_research_area || null,
            research_discipline: item.ai_research_discipline || null,
            research_field: item.ai_research_field || null,
            software_type: item.ai_software_type || null,
            software_class: item.ai_software_class || null,
            core_features: item.ai_core_features || null,
            example_use: item.ai_example_use || null,
          };
        }
        
        return baseResult;
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
                ai_metadata_included: include_ai_metadata,
                software: transformedResults,
              },
              null,
              2,
            ),
          },
        ],
      };
    } catch (error: any) {
      // If exact search failed, try getting a broad sample and do substring matching
      let fallbackResults = null;
      
      try {
        // Try to get a large sample of software to search through
        const broadResult = await this.getAllSoftware({
          resource_id,
          include_ai_metadata,
          limit: 500, // Get a good sample size
        });
        
        const broadData = JSON.parse(broadResult.content[0].text);
        if (!broadData.error && broadData.software) {
          const queryLower = query.toLowerCase();
          
          // Find software that contains the search term in name or description
          const matches = broadData.software.filter((item: any) => 
            item.name?.toLowerCase().includes(queryLower) ||
            item.description?.toLowerCase().includes(queryLower)
          );
          
          if (matches.length > 0) {
            const limitedMatches = matches.slice(0, limit);
            
            fallbackResults = {
              content: [{
                type: "text",
                text: JSON.stringify({
                  query,
                  search_type: "substring_match",
                  total_matches: limitedMatches.length,
                  note: `Exact search failed, found ${limitedMatches.length} software packages containing "${query}"`,
                  ai_metadata_included: include_ai_metadata,
                  software: limitedMatches,
                }, null, 2)
              }]
            };
          }
        }
      } catch (e) {
        // If broad search also fails, continue to error response
      }
      
      if (fallbackResults) {
        const data = JSON.parse(fallbackResults.content[0].text);
        data.fallback_used = `Original query "${query}" failed, showing results for "${data.query}"`;
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify(data, null, 2)
          }]
        };
      }
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                query,
                error: `Global search failed: ${error.message}`,
                suggestions: {
                  try_specific_resource: "Use list_software_by_resource with a specific resource ID",
                  try_broader_terms: "Try broader terms like 'bio', 'tools', or common package categories",
                  get_resources: "Use the compute-resources server's search_resources tool with include_resource_ids: true",
                },
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
                error: `Resource ID not found: '${resourceId}'`,
                solution: "REQUIRED: Use access-compute-resources:search_resources with include_resource_ids=true to find valid resource IDs",
                example: `access-compute-resources:search_resources({"query": "${resourceId.split('.')[0]}", "include_resource_ids": true})`,
                workflow: {
                  step_1: "Search resources: access-compute-resources:search_resources with include_resource_ids=true",
                  step_2: "Find your target resource from the results",
                  step_3: "Use any ID from the 'resource_ids' array in software discovery tools",
                  note: "Resource IDs are consistent across all ACCESS-CI services"
                },
                quick_reference: {
                  common_resources: ["delta.ncsa.access-ci.org", "anvil.purdue.access-ci.org", "bridges2.psc.access-ci.org"],
                  search_examples: ["delta", "anvil", "bridges", "gpu", "cpu"]
                },
                api_details: {
                  resource_id: resourceId,
                  normalized_resource_id: normalizedResourceId,
                  api_error: `${response.status} ${response.statusText}`
                },
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

  private async searchWithFilters(args: {
    query?: string;
    resource_id?: string;
    filter_research_area?: string;
    filter_tags?: string[];
    filter_software_type?: string;
    limit?: number;
  }) {
    // Get the base results with AI metadata
    let searchResults;
    
    if (args.query) {
      // Use specific search query
      searchResults = await this.searchSoftware({
        query: args.query,
        resource_id: args.resource_id,
        include_ai_metadata: true,
        limit: 500,
      });
    } else {
      // Get all software for filtering
      searchResults = await this.getAllSoftware({
        resource_id: args.resource_id,
        include_ai_metadata: true,
        limit: 500,
      });
    }
    
    // Parse the results
    const data = JSON.parse(searchResults.content[0].text);
    
    if (data.error) {
      return searchResults; // Return the error from the base search
    }
    
    let filteredSoftware = data.software || [];
    
    // Apply client-side filters on AI metadata
    if (args.filter_research_area) {
      const filterLower = args.filter_research_area.toLowerCase();
      filteredSoftware = filteredSoftware.filter((item: any) => 
        item.ai_metadata?.research_area?.toLowerCase().includes(filterLower)
      );
    }
    
    if (args.filter_tags && args.filter_tags.length > 0) {
      const filterTagsLower = args.filter_tags.map(t => t.toLowerCase());
      filteredSoftware = filteredSoftware.filter((item: any) => {
        if (!item.ai_metadata?.tags || item.ai_metadata.tags.length === 0) return false;
        const itemTagsLower = item.ai_metadata.tags.map((t: string) => t.toLowerCase());
        return filterTagsLower.some(tag => itemTagsLower.some((itemTag: string) => itemTag.includes(tag)));
      });
    }
    
    if (args.filter_software_type) {
      const filterLower = args.filter_software_type.toLowerCase();
      filteredSoftware = filteredSoftware.filter((item: any) => 
        item.ai_metadata?.software_type?.toLowerCase().includes(filterLower)
      );
    }
    
    // Apply limit after filtering
    const limit = args.limit || 50;
    if (filteredSoftware.length > limit) {
      filteredSoftware = filteredSoftware.slice(0, limit);
    }
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              query: args.query || "all software",
              filters_applied: {
                research_area: args.filter_research_area,
                tags: args.filter_tags,
                software_type: args.filter_software_type,
                resource_id: args.resource_id,
              },
              total_before_filter: data.software ? data.software.length : 0,
              total_after_filter: filteredSoftware.length,
              software: filteredSoftware,
            },
            null,
            2,
          ),
        },
      ],
    };
  }
  
  private async discoverFilterValues(args: {
    query?: string;
    resource_id?: string;
    sample_size?: number;
  }) {
    const sampleSize = args.sample_size || 200;
    let software: any[] = [];
    
    if (args.resource_id) {
      // Get software from specific resource
      const resourceResults = await this.listSoftwareByResource(
        args.resource_id,
        sampleSize
      );
      const resourceData = JSON.parse(resourceResults.content[0].text);
      if (resourceData.error) {
        return resourceResults;
      }
      software = resourceData.software || [];
    } else if (args.query) {
      // Get software from search query
      const searchResults = await this.searchSoftware({
        query: args.query,
        include_ai_metadata: true,
        limit: sampleSize,
      });
      
      const data = JSON.parse(searchResults.content[0].text);
      if (data.error) {
        return searchResults;
      }
      software = data.software || [];
    } else {
      // Get all software for discovery
      const allResults = await this.getAllSoftware({
        include_ai_metadata: true,
        limit: sampleSize,
      });
      
      const data = JSON.parse(allResults.content[0].text);
      if (data.error) {
        return allResults;
      }
      software = data.software || [];
    }
    
    // Extract unique values from AI metadata
    const researchAreas = new Set<string>();
    const tags = new Map<string, number>(); // Track frequency
    const softwareTypes = new Set<string>();
    const resources = new Set<string>();
    
    software.forEach((item: any) => {
      // Collect research areas (try multiple fields)
      if (item.ai_metadata?.research_area) {
        researchAreas.add(item.ai_metadata.research_area);
      }
      if (item.ai_metadata?.research_discipline) {
        researchAreas.add(item.ai_metadata.research_discipline);
      }
      if (item.ai_metadata?.research_field) {
        researchAreas.add(item.ai_metadata.research_field);
      }
      
      // Collect and count tags
      if (item.ai_metadata?.tags && Array.isArray(item.ai_metadata.tags)) {
        item.ai_metadata.tags.forEach((tag: string) => {
          const trimmedTag = tag.trim();
          if (trimmedTag) {
            tags.set(trimmedTag, (tags.get(trimmedTag) || 0) + 1);
          }
        });
      }
      
      // Collect software types (try multiple fields)
      if (item.ai_metadata?.software_type) {
        softwareTypes.add(item.ai_metadata.software_type);
      }
      if (item.ai_metadata?.software_class) {
        softwareTypes.add(item.ai_metadata.software_class);
      }
      
      // Collect resources
      if (item.available_on_resources && Array.isArray(item.available_on_resources)) {
        item.available_on_resources.forEach((resource: string) => {
          if (resource) resources.add(resource);
        });
      }
    });
    
    // Sort tags by frequency and take top ones
    const sortedTags = Array.from(tags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([tag, count]) => ({ value: tag, count }));
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              sample_info: {
                sample_size: sampleSize,
                actual_sampled: software.length,
                resource_filter: args.resource_id || "all resources",
              },
              discovered_values: {
                research_areas: Array.from(researchAreas).sort(),
                software_types: Array.from(softwareTypes).sort(),
                top_tags: sortedTags,
                resources: Array.from(resources).sort(),
              },
              usage_notes: {
                research_areas: "Use these values with filter_research_area parameter in search_with_filters",
                tags: "Use these values with filter_tags parameter in search_with_filters",
                software_types: "Use these values with filter_software_type parameter in search_with_filters",
                note: "Values are discovered from actual data, not hardcoded categories",
                resource_discovery: "Use the compute-resources server's search_resources tool with include_resource_ids: true",
              },
            },
            null,
            2,
          ),
        },
      ],
    };
  }
}
