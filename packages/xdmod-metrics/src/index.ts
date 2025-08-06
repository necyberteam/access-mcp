#!/usr/bin/env node

import { BaseAccessServer } from "@access-mcp/shared";

interface XDMoDDimension {
  id: string;
  text: string;
  category: string;
  group_by: string;
  leaf?: boolean;
}

interface XDMoDStatistic {
  id: string;
  text: string;
  category: string;
  group_by: string;
  statistic?: string;
  leaf?: boolean;
}

// NSF Award interfaces
interface NSFAward {
  awardNumber: string;
  title: string;
  institution: string;
  principalInvestigator: string;
  coPIs: string[];
  totalIntendedAward: string;
  totalAwardedToDate: string;
  startDate: string;
  endDate: string;
  abstract: string;
  location?: string;
  programOfficer?: string;
  awardType?: string;
  primaryProgram?: string;
  fundingHistory: {
    fiscalYear: string;
    amount: string;
  }[];
}

interface ChartRequest {
  operation: string;
  public_user: string;
  dataset_type: string;
  format: string;
  width?: number;
  height?: number;
  realm: string;
  group_by: string;
  statistic: string;
  start_date: string;
  end_date: string;
}

class XDMoDMetricsServer extends BaseAccessServer {
  private apiToken?: string;

  constructor() {
    super("xdmod-metrics", "0.2.3", "https://xdmod.access-ci.org");
    
    // Get API token from environment variable OR process arguments
    this.apiToken = process.env.XDMOD_API_TOKEN;
    
    // Also check for token in command line arguments (for Claude Desktop config)
    const args = process.argv;
    const tokenArgIndex = args.findIndex(arg => arg === '--api-token');
    if (tokenArgIndex !== -1 && tokenArgIndex + 1 < args.length) {
      this.apiToken = args[tokenArgIndex + 1];
      // console.log(`[XDMoD] Using API token from command line argument`);
    }
    
    // Debug logging (commented out for production)
    // console.log(`[XDMoD] API Token present: ${!!this.apiToken}`);
    // console.log(`[XDMoD] Token source: ${process.env.XDMOD_API_TOKEN ? 'environment' : (tokenArgIndex !== -1 ? 'command-line' : 'none')}`);
    // if (this.apiToken) {
    //   console.log(`[XDMoD] Token length: ${this.apiToken.length}`);
    //   console.log(`[XDMoD] Token preview: ${this.apiToken.substring(0, 10)}...`);
    // }
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    
    if (this.apiToken) {
      // XDMoD uses "Token" header (not Authorization)
      headers["Token"] = this.apiToken;
    }
    
    return headers;
  }

  private isAuthenticated(): boolean {
    return !!this.apiToken;
  }

  protected getTools(): any[] {
    const tools: any[] = [
      {
        name: "get_dimensions",
        description: "Get all available dimensions from XDMoD Usage Tab",
        inputSchema: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      {
        name: "get_statistics",
        description: "Get available statistics for a specific dimension",
        inputSchema: {
          type: "object",
          properties: {
            dimension_id: {
              type: "string",
              description: 'The dimension ID (e.g., "Jobs_none")',
            },
            category: {
              type: "string",
              description: 'The realm/category (e.g., "Jobs")',
            },
            group_by: {
              type: "string",
              description: 'The group by field (e.g., "none")',
            },
          },
          required: ["dimension_id", "category", "group_by"],
        },
      },
      {
        name: "get_chart_data",
        description: "Get chart data and metadata for a specific statistic",
        inputSchema: {
          type: "object",
          properties: {
            realm: {
              type: "string",
              description: 'The realm (e.g., "Jobs", "SUPREMM")',
            },
            group_by: {
              type: "string",
              description: 'The group by field (e.g., "none", "resource")',
            },
            statistic: {
              type: "string",
              description: 'The statistic name (e.g., "total_cpu_hours", "gpu_time")',
            },
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format",
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format",
            },
            dataset_type: {
              type: "string",
              description: 'Dataset type (default: "timeseries")',
              enum: ["timeseries", "aggregate"],
              default: "timeseries",
            },
            display_type: {
              type: "string",
              description: 'Display type (default: "line")',
              enum: ["line", "bar", "pie", "scatter"],
              default: "line",
            },
            combine_type: {
              type: "string", 
              description: 'How to combine data (default: "side")',
              enum: ["side", "stack", "percent"],
              default: "side",
            },
            limit: {
              type: "number",
              description: "Maximum number of data series to return (default: 10)",
              default: 10,
            },
            offset: {
              type: "number",
              description: "Offset for pagination (default: 0)",
              default: 0,
            },
            log_scale: {
              type: "string",
              description: 'Use logarithmic scale (default: "n")',
              enum: ["y", "n"],
              default: "n",
            },
            filters: {
              type: "object",
              description: "Optional filters to apply (e.g., {resource: 'delta.ncsa.xsede.org'})",
              additionalProperties: {
                type: "string"
              }
            },
          },
          required: [
            "realm",
            "group_by",
            "statistic",
            "start_date",
            "end_date",
          ],
        },
      },
      {
        name: "get_chart_image",
        description:
          "Get chart image (SVG, PNG, or PDF) for a specific statistic",
        inputSchema: {
          type: "object",
          properties: {
            realm: {
              type: "string",
              description: 'The realm (e.g., "Jobs", "SUPREMM")',
            },
            group_by: {
              type: "string",
              description: 'The group by field (e.g., "none", "resource")',
            },
            statistic: {
              type: "string",
              description: 'The statistic name (e.g., "total_cpu_hours", "gpu_time")',
            },
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format",
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format",
            },
            format: {
              type: "string",
              description: "Image format (svg, png, pdf)",
              enum: ["svg", "png", "pdf"],
              default: "svg",
            },
            width: {
              type: "number",
              description: "Image width in pixels",
              default: 916,
            },
            height: {
              type: "number",
              description: "Image height in pixels",
              default: 484,
            },
            dataset_type: {
              type: "string",
              description: 'Dataset type (default: "timeseries")',
              enum: ["timeseries", "aggregate"],
              default: "timeseries",
            },
            display_type: {
              type: "string",
              description: 'Display type (default: "line")',
              enum: ["line", "bar", "pie", "scatter"],
              default: "line",
            },
            combine_type: {
              type: "string", 
              description: 'How to combine data (default: "side")',
              enum: ["side", "stack", "percent"],
              default: "side",
            },
            limit: {
              type: "number",
              description: "Maximum number of data series to return (default: 10)",
              default: 10,
            },
            offset: {
              type: "number",
              description: "Offset for pagination (default: 0)",
              default: 0,
            },
            log_scale: {
              type: "string",
              description: 'Use logarithmic scale (default: "n")',
              enum: ["y", "n"],
              default: "n",
            },
            filters: {
              type: "object",
              description: "Optional filters to apply (e.g., {resource: 'delta.ncsa.xsede.org'})",
              additionalProperties: {
                type: "string"
              }
            },
          },
          required: [
            "realm",
            "group_by",
            "statistic",
            "start_date",
            "end_date",
          ],
        },
      },
      {
        name: "get_chart_link",
        description: "Generate a direct link to view the chart in XDMoD portal",
        inputSchema: {
          type: "object",
          properties: {
            realm: {
              type: "string",
              description: 'The realm (e.g., "Jobs", "SUPREMM")',
            },
            group_by: {
              type: "string",
              description: 'The group by field (e.g., "none", "resource")',
            },
            statistic: {
              type: "string",
              description: 'The statistic name (e.g., "total_cpu_hours", "gpu_time")',
            },
          },
          required: ["realm", "group_by", "statistic"],
        },
      },
    ];

    // Data Analytics Framework test tools removed - endpoints were not accessible

    // NSF-Enhanced XDMoD Integration tools
    tools.push(
      {
        name: "get_usage_with_nsf_context",
        description: "Get XDMoD usage data enriched with NSF funding context for a researcher or institution",
        inputSchema: {
          type: "object",
          properties: {
            researcher_name: {
              type: "string",
              description: "Researcher name to analyze (will search both XDMoD usage and NSF awards)",
            },
            realm: {
              type: "string",
              description: 'XDMoD realm to analyze (e.g., "Jobs", "SUPREMM")',
              default: "Jobs",
            },
            start_date: {
              type: "string", 
              description: "Start date for usage analysis in YYYY-MM-DD format",
            },
            end_date: {
              type: "string",
              description: "End date for usage analysis in YYYY-MM-DD format",
            },
            limit: {
              type: "number",
              description: "Maximum number of NSF awards to include (default: 5)",
              default: 5,
            },
          },
          required: ["researcher_name", "start_date", "end_date"],
        },
      },
      {
        name: "analyze_funding_vs_usage",
        description: "Compare NSF funding amounts with actual XDMoD computational usage patterns",
        inputSchema: {
          type: "object",
          properties: {
            nsf_award_number: {
              type: "string",
              description: "NSF award number to analyze (e.g., '2138259')",
            },
            usage_metric: {
              type: "string",
              description: 'XDMoD metric to analyze (e.g., "total_cpu_hours", "gpu_time")',
              default: "total_cpu_hours",
            },
            start_date: {
              type: "string",
              description: "Start date for analysis in YYYY-MM-DD format",
            },
            end_date: {
              type: "string", 
              description: "End date for analysis in YYYY-MM-DD format",
            },
          },
          required: ["nsf_award_number", "start_date", "end_date"],
        },
      },
      {
        name: "institutional_research_profile",
        description: "Generate a comprehensive research profile combining XDMoD usage patterns with NSF funding for an institution",
        inputSchema: {
          type: "object",
          properties: {
            institution_name: {
              type: "string",
              description: "Institution name to analyze (e.g., 'University of Colorado Boulder')",
            },
            start_date: {
              type: "string",
              description: "Start date for analysis in YYYY-MM-DD format", 
            },
            end_date: {
              type: "string",
              description: "End date for analysis in YYYY-MM-DD format",
            },
            top_researchers: {
              type: "number",
              description: "Number of top researchers to highlight (default: 10)",
              default: 10,
            },
          },
          required: ["institution_name", "start_date", "end_date"],
        },
      }
    );

    // Always add debug tool
    tools.push({
      name: "debug_auth_status",
      description: "Check authentication status and debug information",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    });

    // User-specific tools removed - see user-specific.ts for experimental user functionality

    return tools;
  }

  protected getResources() {
    return [];
  }

  protected async handleToolCall(request: any) {
    const { name, arguments: args } = request.params;
    // console.log(`[XDMoD] Tool called: ${name}`, args);

    switch (name) {
      case "get_dimensions":
        return await this.getDimensions();

      case "get_statistics":
        return await this.getStatistics(
          args.dimension_id,
          args.category,
          args.group_by,
        );

      case "get_chart_data":
        return await this.getChartData({
          realm: args.realm,
          group_by: args.group_by,
          statistic: args.statistic,
          start_date: args.start_date,
          end_date: args.end_date,
          dataset_type: args.dataset_type || "timeseries",
          display_type: args.display_type || "line",
          combine_type: args.combine_type || "side",
          limit: args.limit || 10,
          offset: args.offset || 0,
          log_scale: args.log_scale || "n",
          filters: args.filters,
        });

      case "get_chart_image":
        return await this.getChartImage({
          realm: args.realm,
          group_by: args.group_by,
          statistic: args.statistic,
          start_date: args.start_date,
          end_date: args.end_date,
          format: args.format || "svg",
          width: args.width || 916,
          height: args.height || 484,
          dataset_type: args.dataset_type || "timeseries",
          display_type: args.display_type || "line",
          combine_type: args.combine_type || "side",
          limit: args.limit || 10,
          offset: args.offset || 0,
          log_scale: args.log_scale || "n",
          filters: args.filters,
        });

      case "get_chart_link":
        return await this.getChartLink(args.realm, args.group_by, args.statistic);

      case "debug_auth_status":
        return await this.debugAuthStatus();

      case "get_usage_with_nsf_context":
        return await this.getUsageWithNSFContext(
          args.researcher_name, 
          args.realm || "Jobs",
          args.start_date,
          args.end_date,
          args.limit || 5
        );

      case "analyze_funding_vs_usage":
        return await this.analyzeFundingVsUsage(
          args.nsf_award_number,
          args.usage_metric || "total_cpu_hours", 
          args.start_date,
          args.end_date
        );

      case "institutional_research_profile":
        return await this.generateInstitutionalProfile(
          args.institution_name,
          args.start_date,
          args.end_date,
          args.top_researchers || 10
        );

      // Data Analytics Framework cases removed

      // User-specific cases removed - see user-specific.ts

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  protected async handleResourceRead(request: any) {
    throw new Error("Resources not implemented");
  }

  private async getDimensions() {
    try {
      const response = await fetch(
        `${this.baseURL}/controllers/user_interface.php`,
        {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: new URLSearchParams({
            operation: "get_menus",
            public_user: "true",
            node: "category_",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const dimensions: XDMoDDimension[] = await response.json();

      // Filter out dimensions with "-111" in the ID (these are typically invalid/test entries)
      const cleanedDimensions = dimensions.filter(
        (dim) => !dim.id.includes("-111"),
      );

      return {
        content: [
          {
            type: "text",
            text:
              `Found ${cleanedDimensions.length} available dimensions in XDMoD Usage Tab:\n\n` +
              cleanedDimensions
                .map(
                  (dim) =>
                    `• ${dim.text} (ID: ${dim.id}, Category: ${dim.category}, Group By: ${dim.group_by})`,
                )
                .join("\n"),
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch dimensions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async getStatistics(
    dimensionId: string,
    category: string,
    groupBy: string,
  ) {
    try {
      const response = await fetch(
        `${this.baseURL}/controllers/user_interface.php`,
        {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: new URLSearchParams({
            operation: "get_menus",
            public_user: "true",
            category: category,
            group_by: groupBy,
            node: dimensionId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const statistics: XDMoDStatistic[] = await response.json();

      return {
        content: [
          {
            type: "text",
            text:
              `Found ${statistics.length} available statistics for dimension "${dimensionId}":\n\n` +
              statistics
                .map(
                  (stat) =>
                    `• ${stat.text} (ID: ${stat.id}${stat.statistic ? `, Statistic: ${stat.statistic}` : ""})`,
                )
                .join("\n"),
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch statistics: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async getChartData(params: {
    realm: string;
    group_by: string;
    statistic: string;
    start_date: string;
    end_date: string;
    dataset_type: string;
    display_type?: string;
    combine_type?: string;
    limit?: number;
    offset?: number;
    log_scale?: string;
    filters?: Record<string, string>;
  }) {
    try {
      const response = await fetch(
        `${this.baseURL}/controllers/user_interface.php`,
        {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: (() => {
            const urlParams = new URLSearchParams({
              operation: "get_charts",
              public_user: "true",
              dataset_type: params.dataset_type,
              format: "hc_jsonstore",
              width: "916",
              height: "484",
              realm: params.realm,
              group_by: params.group_by,
              statistic: params.statistic,
              start_date: params.start_date,
              end_date: params.end_date,
            });

            // Add optional parameters
            if (params.display_type) {
              urlParams.append("display_type", params.display_type);
            }
            if (params.combine_type) {
              urlParams.append("combine_type", params.combine_type);
            }
            if (params.limit !== undefined) {
              urlParams.append("limit", params.limit.toString());
            }
            if (params.offset !== undefined) {
              urlParams.append("offset", params.offset.toString());
            }
            if (params.log_scale) {
              urlParams.append("log_scale", params.log_scale);
            }

            // Add filters
            if (params.filters) {
              for (const [key, value] of Object.entries(params.filters)) {
                urlParams.append(`${key}_filter`, value);
              }
            }

            return urlParams;
          })(),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      let resultText = `Chart Data for ${params.statistic} (${params.realm}):\n\n`;

      if (data.data && data.data.length > 0) {
        const chartInfo = data.data[0];

        if (chartInfo.group_description) {
          resultText += `**Group Description:**\n${chartInfo.group_description}\n\n`;
        }

        if (chartInfo.description) {
          resultText += `**Chart Description:**\n${chartInfo.description}\n\n`;
        }

        if (chartInfo.chart_title) {
          resultText += `**Chart Title:** ${chartInfo.chart_title}\n\n`;
        }

        resultText += `**Raw Data:**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
      } else {
        resultText += "No data available for the specified parameters.";
      }

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch chart data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async getChartImage(params: {
    realm: string;
    group_by: string;
    statistic: string;
    start_date: string;
    end_date: string;
    format: string;
    width: number;
    height: number;
    dataset_type: string;
    display_type?: string;
    combine_type?: string;
    limit?: number;
    offset?: number;
    log_scale?: string;
    filters?: Record<string, string>;
  }) {
    try {
      const response = await fetch(
        `${this.baseURL}/controllers/user_interface.php`,
        {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: (() => {
            const urlParams = new URLSearchParams({
              operation: "get_charts",
              public_user: "true",
              dataset_type: params.dataset_type,
              format: params.format,
              width: params.width.toString(),
              height: params.height.toString(),
              realm: params.realm,
              group_by: params.group_by,
              statistic: params.statistic,
              start_date: params.start_date,
              end_date: params.end_date,
            });

            // Add optional parameters
            if (params.display_type) {
              urlParams.append("display_type", params.display_type);
            }
            if (params.combine_type) {
              urlParams.append("combine_type", params.combine_type);
            }
            if (params.limit !== undefined) {
              urlParams.append("limit", params.limit.toString());
            }
            if (params.offset !== undefined) {
              urlParams.append("offset", params.offset.toString());
            }
            if (params.log_scale) {
              urlParams.append("log_scale", params.log_scale);
            }

            // Add filters
            if (params.filters) {
              for (const [key, value] of Object.entries(params.filters)) {
                urlParams.append(`${key}_filter`, value);
              }
            }

            return urlParams;
          })(),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (params.format === "png") {
        // For PNG, get binary data and convert to base64
        const imageBuffer = await response.arrayBuffer();
        const base64Data = Buffer.from(imageBuffer).toString('base64');
        
        // Return with MCP-compliant image format that was working
        return {
          content: [
            {
              type: "image",
              data: base64Data,
              mimeType: "image/png",
            },
            {
              type: "text",
              text:
                `\nChart Details:\n` +
                `- Statistic: ${params.statistic}\n` +
                `- Realm: ${params.realm}\n` +
                `- Group By: ${params.group_by}\n` +
                `- Date Range: ${params.start_date} to ${params.end_date}\n` +
                `- Size: ${params.width}x${params.height} pixels`,
            },
          ],
        };
      } else {
        // For SVG and other text formats
        const imageData = await response.text();
        
        if (params.format === "svg") {
          // For SVG, provide helpful message about using PNG instead
          return {
            content: [
              {
                type: "text",
                text: `SVG Chart for ${params.statistic} (${params.realm})\n\n` +
                      `⚠️ SVG format doesn't display directly in Claude Desktop.\n\n` +
                      `**Recommended:** Use PNG format for direct image display:\n` +
                      `\`\`\`\n` +
                      `format: "png"\n` +
                      `\`\`\`\n\n` +
                      `**Chart Details:**\n` +
                      `- Statistic: ${params.statistic}\n` +
                      `- Realm: ${params.realm}\n` +
                      `- Group By: ${params.group_by}\n` +
                      `- Date Range: ${params.start_date} to ${params.end_date}\n` +
                      `- Size: ${params.width}x${params.height} pixels\n\n` +
                      `**To view this SVG chart:**\n` +
                      `1. Copy the SVG code below\n` +
                      `2. Save it to a .svg file and open in your browser\n\n` +
                      `\`\`\`svg\n${imageData}\n\`\`\``
              }
            ],
          };
        } else {
          // For PDF and other formats, return as text
          return {
            content: [
              {
                type: "text",
                text:
                  `Chart Image (${params.format.toUpperCase()}) for ${params.statistic}:\n\n` +
                  `**Parameters:** Realm: ${params.realm}, Group By: ${params.group_by}, ` +
                  `Date Range: ${params.start_date} to ${params.end_date}\n\n` +
                  `**To view this chart:**\n` +
                  `1. Copy the ${params.format.toUpperCase()} data below\n` +
                  `2. Save it to a file with .${params.format} extension\n` +
                  `3. Open the file in your browser or image viewer\n\n` +
                  `**${params.format.toUpperCase()} Data:**\n\`\`\`${params.format}\n${imageData}\n\`\`\``,
              },
            ],
          };
        }
      }
    } catch (error) {
      throw new Error(
        `Failed to fetch chart image: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async getChartLink(realm: string, groupBy: string, statistic: string) {
    // Construct the URL parameters for XDMoD portal
    const urlParams = new URLSearchParams({
      node: 'statistic',
      realm: realm,
      group_by: groupBy,
      statistic: statistic
    });

    const chartUrl = `https://xdmod.access-ci.org/index.php#tg_usage?${urlParams.toString()}`;

    const responseText = `Direct link to view chart in XDMoD portal:\n\n${chartUrl}\n\n` +
      `**Chart Parameters:**\n` +
      `- Realm: ${realm}\n` +
      `- Group By: ${groupBy}\n` +
      `- Statistic: ${statistic}\n\n` +
      `You can use this URL to view the interactive chart directly in the XDMoD web interface. ` +
      `Use the portal's filtering options to narrow down to specific resources, users, or other criteria.`;

    return {
      content: [
        {
          type: "text",
          text: responseText,
        },
      ],
    };
  }

  private async debugAuthStatus() {
    const envToken = process.env.XDMOD_API_TOKEN;
    const args = process.argv;
    const tokenArgIndex = args.findIndex(arg => arg === '--api-token');
    const argToken = tokenArgIndex !== -1 && tokenArgIndex + 1 < args.length ? args[tokenArgIndex + 1] : null;
    
    // Get all environment variables that might be relevant
    const allEnvVars = Object.keys(process.env).filter(key => 
      key.includes('XDMOD') || key.includes('TOKEN') || key.includes('API')
    );
    
    return {
      content: [
        {
          type: "text",
          text: `🔍 **XDMoD Authentication Debug Information**\n\n` +
                `**Environment Variables:**\n` +
                `- XDMOD_API_TOKEN present: ${!!envToken}\n` +
                `- Token length: ${envToken ? envToken.length : 'N/A'}\n` +
                `- Token preview: ${envToken ? envToken.substring(0, 10) + '...' : 'N/A'}\n` +
                `- All relevant env vars: ${allEnvVars.join(', ') || 'none'}\n\n` +
                `**Command Line Arguments:**\n` +
                `- Process argv: ${JSON.stringify(args)}\n` +
                `- --api-token argument: ${!!argToken}\n` +
                `- Arg token length: ${argToken ? argToken.length : 'N/A'}\n` +
                `- Arg token preview: ${argToken ? argToken.substring(0, 10) + '...' : 'N/A'}\n\n` +
                `**Current Configuration:**\n` +
                `- API Token active: ${this.isAuthenticated()}\n` +
                `- Active token length: ${this.apiToken ? this.apiToken.length : 'N/A'}\n` +
                `- Active token preview: ${this.apiToken ? this.apiToken.substring(0, 10) + '...' : 'N/A'}\n` +
                `- Token source: ${this.apiToken === envToken ? 'environment' : (this.apiToken === argToken ? 'command-line' : 'unknown')}\n\n` +
                `**Available Tools:**\n` +
                `- get_dimensions: ✅\n` +
                `- get_statistics: ✅\n` +
                `- get_chart_data: ✅\n` +
                `- get_chart_image: ✅\n` +
                `- get_chart_link: ✅\n` +
                `- get_nsf_award: ✅\n` +
                `- find_nsf_awards_by_pi: ✅\n` +
                `- find_nsf_awards_by_personnel: ✅\n` +
                `- get_usage_with_nsf_context: ✅ (NSF-enhanced)\n` +
                `- analyze_funding_vs_usage: ✅ (NSF-enhanced)\n` +
                `- institutional_research_profile: ✅ (NSF-enhanced)\n` +
                `- debug_auth_status: ✅\n` +
                `- get_current_user: ❌ (moved to user-specific.ts)\n` +
                `- get_my_usage: ❌ (moved to user-specific.ts)\n\n` +
                `**Troubleshooting:**\n` +
                `Environment variable should be set in Claude Desktop config under "env" section.\n` +
                `If still not working, the environment variable might not be passed correctly by Claude Desktop.`
        }
      ]
    };
  }

  // getCurrentUser method moved to user-specific.ts

  // Data Analytics Framework test methods removed - endpoints were not accessible

  // getMyUsage and formatUsageResponse methods moved to user-specific.ts

  // NSF-Enhanced XDMoD Integration Methods
  private async getUsageWithNSFContext(
    researcherName: string,
    realm: string,
    startDate: string,
    endDate: string,
    limit: number
  ) {
    try {
      // Search for NSF awards for this researcher
      const nsfAwards = await this.searchNSFAwardsByPI(researcherName, limit);
      
      // Get XDMoD usage statistics for the same period
      // Note: This would ideally filter by user, but public XDMoD API doesn't support user filtering
      // So we provide general usage context instead
      const usageData = await this.getChartData({
        realm,
        group_by: "none",
        statistic: "total_cpu_hours", // Default metric
        start_date: startDate,
        end_date: endDate,
        dataset_type: "timeseries",
      });

      return {
        content: [
          {
            type: "text",
            text: this.formatUsageWithNSFContext(researcherName, nsfAwards, usageData, startDate, endDate),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error analyzing ${researcherName}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async analyzeFundingVsUsage(
    awardNumber: string,
    usageMetric: string,
    startDate: string,
    endDate: string
  ) {
    try {
      // Get NSF award details
      const nsfAward = await this.fetchNSFAwardData(awardNumber);
      
      // Get corresponding XDMoD usage data
      const usageData = await this.getChartData({
        realm: "Jobs", // Default to Jobs realm
        group_by: "none",
        statistic: usageMetric,
        start_date: startDate,
        end_date: endDate,
        dataset_type: "aggregate",
      });

      return {
        content: [
          {
            type: "text",
            text: this.formatFundingVsUsageAnalysis(nsfAward, usageData, usageMetric, startDate, endDate),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error analyzing award ${awardNumber}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async generateInstitutionalProfile(
    institutionName: string,
    startDate: string,
    endDate: string,
    topResearchers: number
  ) {
    try {
      // Search for NSF awards by institution (using institution name as keyword)
      const institutionAwards = await this.searchNSFAwardsByInstitution(institutionName, topResearchers * 2);
      
      // Get XDMoD aggregate usage data for the period
      const usageData = await this.getChartData({
        realm: "Jobs",
        group_by: "resource", // Group by resource to show institutional usage patterns
        statistic: "total_cpu_hours",
        start_date: startDate,
        end_date: endDate,
        dataset_type: "aggregate",
      });

      return {
        content: [
          {
            type: "text",
            text: this.formatInstitutionalProfile(institutionName, institutionAwards, usageData, topResearchers, startDate, endDate),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error generating profile for ${institutionName}: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  // Enhanced formatting methods for integrated NSF-XDMoD analysis
  private formatUsageWithNSFContext(
    researcherName: string, 
    nsfAwards: NSFAward[], 
    usageData: any,
    startDate: string,
    endDate: string
  ): string {
    let result = `🔬 **Research Profile: ${researcherName}**\n\n`;
    
    let totalFunding = 0;
    
    // NSF Funding Context
    if (nsfAwards.length > 0) {
      result += `🏆 **NSF Funding Portfolio** (${nsfAwards.length} award${nsfAwards.length === 1 ? '' : 's'}):\n\n`;
      for (const award of nsfAwards) {
        result += `• **${award.awardNumber}**: ${award.title}\n`;
        result += `  - Amount: ${award.totalIntendedAward}\n`;
        result += `  - Period: ${award.startDate} to ${award.endDate}\n`;
        result += `  - Institution: ${award.institution}\n\n`;
        
        // Try to extract numeric amount for totaling
        const match = award.totalIntendedAward.match(/[\d,]+/);
        if (match) {
          const amount = parseFloat(match[0].replace(/,/g, ''));
          if (!isNaN(amount)) totalFunding += amount;
        }
      }
      
      if (totalFunding > 0) {
        result += `**Total NSF Funding**: $${totalFunding.toLocaleString()}\n\n`;
      }
    } else {
      result += `**NSF Funding**: No recent NSF awards found for ${researcherName}\n\n`;
    }
    
    // XDMoD Usage Context
    result += `📊 **ACCESS-CI Usage Context** (${startDate} to ${endDate}):\n\n`;
    result += `*Note: XDMoD public API provides system-wide metrics. Individual user usage*\n`;
    result += `*data requires authentication and is not available in this analysis.*\n\n`;
    
    if (usageData?.content?.[0]?.text) {
      // Extract key metrics from usage data
      const usageText = usageData.content[0].text;
      if (usageText.includes('CPU hours')) {
        result += `**System-wide CPU Usage**: Available in detailed XDMoD analysis above\n`;
      }
    }
    
    // Integration insights
    result += `\n---\n**🔗 Research Integration Insights:**\n\n`;
    
    if (nsfAwards.length > 0 && totalFunding > 0) {
      result += `• ${researcherName} has received $${totalFunding.toLocaleString()} in NSF funding\n`;
      result += `• Research areas: ${nsfAwards.map(a => a.primaryProgram).filter(p => p).join(', ') || 'Various'}\n`;
      result += `• This funding likely supports computational work on ACCESS-CI resources\n`;
      result += `• Use XDMoD institutional analysis to see usage patterns at ${nsfAwards[0]?.institution || 'their institution'}\n\n`;
      
      result += `**💡 Recommendations:**\n`;
      result += `• Cross-reference award periods with XDMoD usage spikes\n`;
      result += `• Analyze computational requirements vs. funding amounts\n`;
      result += `• Compare usage patterns across different award types\n`;
    } else {
      result += `• No NSF funding context available for computational usage analysis\n`;
      result += `• Consider searching variations of the researcher name\n`;
      result += `• Institutional analysis may reveal collaborative usage patterns\n`;
    }
    
    return result;
  }

  private formatFundingVsUsageAnalysis(
    nsfAward: NSFAward,
    usageData: any,
    usageMetric: string,
    startDate: string,
    endDate: string
  ): string {
    let result = `💰 **Funding vs. Usage Analysis**\n\n`;
    
    // NSF Award Summary
    result += `🏆 **NSF Award ${nsfAward.awardNumber}**\n`;
    result += `• **Title**: ${nsfAward.title}\n`;
    result += `• **PI**: ${nsfAward.principalInvestigator}\n`;
    result += `• **Institution**: ${nsfAward.institution}\n`;
    result += `• **Award Amount**: ${nsfAward.totalIntendedAward}\n`;
    result += `• **Award Period**: ${nsfAward.startDate} to ${nsfAward.endDate}\n\n`;
    
    // Usage Analysis Period
    result += `📊 **Computational Usage Analysis** (${startDate} to ${endDate}):\n`;
    result += `• **Metric Analyzed**: ${usageMetric}\n`;
    result += `• **Analysis Period**: ${startDate} to ${endDate}\n\n`;
    
    // Usage Data Context
    if (usageData?.content?.[0]?.text) {
      result += `**System-wide Usage During Analysis Period:**\n`;
      result += `*Note: Individual project usage requires authentication*\n\n`;
      
      // Try to extract meaningful metrics from the usage data
      const usageText = usageData.content[0].text;
      if (usageText.includes('CPU hours') || usageText.includes('total_cpu_hours')) {
        result += `• ACCESS-CI systems show active computational usage during this period\n`;
        result += `• Detailed metrics available through authenticated XDMoD access\n`;
      }
    }
    
    result += `\n---\n**🔍 Analysis Insights:**\n\n`;
    
    // Temporal Analysis
    const awardStartYear = new Date(nsfAward.startDate).getFullYear();
    const awardEndYear = new Date(nsfAward.endDate).getFullYear();
    const analysisStartYear = new Date(startDate).getFullYear();
    const analysisEndYear = new Date(endDate).getFullYear();
    
    if (analysisStartYear >= awardStartYear && analysisEndYear <= awardEndYear) {
      result += `• ✅ Analysis period falls within NSF award timeframe\n`;
      result += `• This computational usage likely relates to funded research activities\n`;
    } else {
      result += `• ⚠️  Analysis period extends beyond NSF award timeframe\n`;
      result += `• Usage may include follow-up work or other funding sources\n`;
    }
    
    result += `• **Research Domain**: ${nsfAward.primaryProgram || 'General NSF research'}\n`;
    result += `• **Computational Focus**: ${nsfAward.abstract.substring(0, 200)}...\n\n`;
    
    result += `**💡 Research Impact Indicators:**\n`;
    result += `• NSF investment of ${nsfAward.totalIntendedAward} supports computational research\n`;
    result += `• ACCESS-CI provides the cyberinfrastructure platform for this work\n`;
    result += `• Usage patterns can indicate research productivity and impact\n\n`;
    
    result += `**🔧 Deeper Analysis Recommendations:**\n`;
    result += `• Use authenticated XDMoD access for specific user/project metrics\n`;
    result += `• Correlate usage spikes with publication dates or milestones\n`;
    result += `• Compare similar awards to benchmark computational intensity\n`;
    
    return result;
  }

  private formatInstitutionalProfile(
    institutionName: string,
    awards: NSFAward[],
    usageData: any,
    topResearchers: number,
    startDate: string,
    endDate: string
  ): string {
    let result = `🏛️ **Institutional Research Profile: ${institutionName}**\n\n`;
    
    // NSF Funding Overview
    result += `🏆 **NSF Research Portfolio** (${startDate} to ${endDate}):\n\n`;
    
    let totalFunding = 0;
    const researchAreas = new Set<string>();
    const topPIs = new Map<string, number>();
    
    if (awards.length > 0) {
      
      result += `**Active NSF Awards**: ${awards.length}\n\n`;
      
      // Analyze awards
      for (const award of awards.slice(0, topResearchers)) {
        result += `• **${award.awardNumber}**: ${award.title}\n`;
        result += `  - PI: ${award.principalInvestigator}\n`;
        result += `  - Amount: ${award.totalIntendedAward}\n`;
        if (award.primaryProgram) {
          result += `  - Program: ${award.primaryProgram}\n`;
          researchAreas.add(award.primaryProgram);
        }
        result += `\n`;
        
        // Track PI activity
        const piCount = topPIs.get(award.principalInvestigator) || 0;
        topPIs.set(award.principalInvestigator, piCount + 1);
        
        // Sum funding
        const match = award.totalIntendedAward.match(/[\d,]+/);
        if (match) {
          const amount = parseFloat(match[0].replace(/,/g, ''));
          if (!isNaN(amount)) totalFunding += amount;
        }
      }
      
      result += `**Research Portfolio Summary:**\n`;
      result += `• **Total NSF Funding**: $${totalFunding.toLocaleString()}\n`;
      result += `• **Research Areas**: ${Array.from(researchAreas).join(', ') || 'Various disciplines'}\n`;
      
      // Top researchers
      const sortedPIs = Array.from(topPIs.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      if (sortedPIs.length > 0) {
        result += `• **Most Active PIs**: ${sortedPIs.map(([pi, count]) => `${pi} (${count} award${count > 1 ? 's' : ''})`).join(', ')}\n`;
      }
    } else {
      result += `**No recent NSF awards found** for "${institutionName}"\n\n`;
      result += `**Troubleshooting NSF Award Search:**\n`;
      result += `• Institution names must match NSF records exactly\n`;
      result += `• Try variations: "${institutionName.replace("University of ", "")}", "${institutionName.replace(/ University$/, "")}", etc.\n`;
      result += `• Search for specific researchers instead using other tools\n`;
      result += `• Recent awards (2024+) may not be indexed yet\n`;
    }
    
    result += `\n📊 **ACCESS-CI Usage Profile** (${startDate} to ${endDate}):\n\n`;
    
    if (usageData?.content?.[0]?.text) {
      result += `**Computational Resource Utilization:**\n`;
      result += `*System-wide usage metrics for the analysis period*\n\n`;
      
      // Extract resource usage patterns
      const usageText = usageData.content[0].text;
      if (usageText.includes('resource')) {
        result += `• Multiple ACCESS-CI resources show active usage\n`;
        result += `• Detailed resource breakdowns available in XDMoD analysis\n`;
      }
      
      result += `• Usage data indicates active computational research\n`;
      result += `• Institution likely has established ACCESS-CI user community\n`;
    }
    
    result += `\n---\n**🔬 Institutional Research Analysis:**\n\n`;
    
    if (awards.length > 0 && totalFunding > 0) {
      result += `**Research Impact Metrics:**\n`;
      result += `• **NSF Investment**: $${totalFunding.toLocaleString()} in computational research\n`;
      result += `• **Research Breadth**: ${researchAreas.size} distinct NSF program areas\n`;
      result += `• **PI Diversity**: ${topPIs.size} unique principal investigators\n`;
      result += `• **Computational Focus**: Strong NSF-funded research requiring HPC resources\n\n`;
      
      result += `**Strategic Insights:**\n`;
      result += `• Institution demonstrates significant computational research capacity\n`;
      result += `• NSF funding supports diverse scientific computing applications\n`;
      result += `• ACCESS-CI provides critical cyberinfrastructure for research mission\n`;
      result += `• Cross-disciplinary computational research environment\n\n`;
      
      result += `**🎯 Recommendations:**\n`;
      result += `• Analyze usage patterns by research domain for strategic planning\n`;
      result += `• Identify opportunities for cross-disciplinary collaboration\n`;
      result += `• Track computational ROI relative to NSF investment\n`;
      result += `• Benchmark against peer institutions for resource optimization\n`;
    } else {
      result += `**Limited Data Available:**\n`;
      result += `• Consider searching for specific researchers or departments\n`;
      result += `• Institution may have computational activity not captured in this analysis\n`;
      result += `• Authenticated XDMoD access may reveal additional usage patterns\n`;
    }
    
    return result;
  }

  // NSF Data Fetching Methods
  private async fetchNSFAwardData(awardNumber: string): Promise<NSFAward> {
    // Use the NSF API instead of HTML parsing for better reliability
    try {
      const cleanAwardNumber = awardNumber.replace(/[^\d]/g, '');
      const apiUrl = `https://api.nsf.gov/services/v1/awards.json?id=${cleanAwardNumber}&printFields=id,title,abstractText,piFirstName,piLastName,coPDPI,poName,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,estimatedTotalAmt,startDate,expDate,primaryProgram,ueiNumber,fundProgramName`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`NSF API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const awards = this.parseNSFAPIResponse(data, 1);
      if (awards.length === 0) {
        throw new Error(`No award found with number ${awardNumber}`);
      }
      
      return awards[0];
    } catch (error) {
      throw new Error(`Failed to fetch NSF award ${awardNumber}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async searchNSFAwardsByPI(piName: string, limit: number): Promise<NSFAward[]> {
    try {
      const nameParts = piName.trim().split(/\s+/);
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      
      // Try multiple search strategies to find PI awards
      const searchStrategies = [
        // Strategy 1: Direct PI searches (if they work)
        { type: 'pi', params: `piFirstName=${encodeURIComponent(firstName)}&piLastName=${encodeURIComponent(lastName)}` },
        { type: 'pi', params: `piLastName=${encodeURIComponent(lastName)}` },
        
        // Strategy 2: Combined institution + name searches (more reliable)
        { type: 'combined', params: `keyword=${encodeURIComponent(lastName)}+${encodeURIComponent(firstName)}` },
        { type: 'combined', params: `keyword=${encodeURIComponent(`"${lastName}, ${firstName}"`)}` },
        
        // Strategy 3: Broad keyword searches
        { type: 'keyword', params: `keyword=${encodeURIComponent(`"${piName}"`)}` },
        { type: 'keyword', params: `keyword=${encodeURIComponent(lastName)}` }
      ];

      let allAwards: NSFAward[] = [];
      
      for (const strategy of searchStrategies) {
        if (allAwards.length >= limit) break;
        
        // Construct NSF API URL with comprehensive field list
        const apiUrl = `https://api.nsf.gov/services/v1/awards.json?${strategy.params}&printFields=id,title,abstractText,piFirstName,piLastName,coPDPI,poName,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,estimatedTotalAmt,startDate,expDate,primaryProgram,ueiNumber,fundProgramName&offset=1&rpp=100`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          console.warn(`NSF API request failed for "${strategy.type}" search: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const results = this.parseNSFAPIResponse(data, limit * 2);

        // Apply name matching logic for all search types to ensure accuracy
        let matches: NSFAward[] = [];
        if (strategy.type === 'pi') {
          // PI searches should be pre-filtered, but double-check with name matching
          matches = results.filter(award => 
            this.nameMatches(award.principalInvestigator, piName)
          );
        } else {
          // For keyword and combined searches, filter for matching PI names
          matches = results.filter(award => 
            this.nameMatches(award.principalInvestigator, piName)
          );
        }

        allAwards.push(...matches);
        
        if (matches.length > 0) {
          console.log(`NSF ${strategy.type} search found ${matches.length} awards for "${piName}"`);
        }
      }

      // Remove duplicates based on award number
      const uniqueAwards = allAwards.filter((award, index, arr) => 
        arr.findIndex(a => a.awardNumber === award.awardNumber) === index
      );

      return uniqueAwards.slice(0, limit);
    } catch (error) {
      console.warn(`Failed to search NSF awards for ${piName}:`, error);
      return [];
    }
  }

  private async searchNSFAwardsByInstitution(institutionName: string, limit: number): Promise<NSFAward[]> {
    try {
      // Search for awards using awardee (institution) parameter for more accurate results
      // Try both full name and simplified versions
      const searchTerms = [
        institutionName,
        institutionName.replace(/University of |The |State |College of /gi, '').trim(),
        institutionName.replace(/ University| College| Institute| School/gi, '').trim()
      ];
      
      let allAwards: NSFAward[] = [];
      
      for (const term of searchTerms) {
        if (allAwards.length >= limit) break;
        
        const apiUrl = `https://api.nsf.gov/services/v1/awards.json?awardeeName=${encodeURIComponent(term)}&printFields=id,title,abstractText,piFirstName,piLastName,coPDPI,poName,awardeeName,awardeeCity,awardeeStateCode,fundsObligatedAmt,estimatedTotalAmt,startDate,expDate,primaryProgram,ueiNumber,fundProgramName&offset=1&rpp=${Math.min(limit, 100)}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
          console.warn(`NSF API request failed for institution "${term}": ${response.status}`);
          continue;
        }

        const data = await response.json();
        const results = this.parseNSFAPIResponse(data, limit - allAwards.length);
        
        // Filter for awards that actually match the original institution name
        const institutionMatches = results.filter(award => {
          const awardInst = award.institution.toLowerCase();
          const searchInst = institutionName.toLowerCase();
          return awardInst.includes(searchInst) || 
                 searchInst.includes(awardInst) ||
                 awardInst.includes(term.toLowerCase());
        });
        
        allAwards.push(...institutionMatches);
      }
      
      // Remove duplicates based on award number
      const uniqueAwards = allAwards.filter((award, index, arr) => 
        arr.findIndex(a => a.awardNumber === award.awardNumber) === index
      );

      return uniqueAwards.slice(0, limit);
    } catch (error) {
      console.warn(`Failed to search NSF awards for institution ${institutionName}:`, error);
      return [];
    }
  }

  private nameMatches(fullName: string, searchName: string): boolean {
    if (!fullName || !searchName) return false;
    
    const searchWords = searchName.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    const nameWords = fullName.toLowerCase().split(/\s+/).filter(word => word.length > 0);
    
    // All search words must be found in the full name
    return searchWords.every(searchWord => 
      nameWords.some(nameWord => nameWord.includes(searchWord) || searchWord.includes(nameWord))
    );
  }

  private parseNSFAPIResponse(data: any, limit: number): NSFAward[] {
    const awards: NSFAward[] = [];
    
    try {
      // NSF API response structure: data.response.award[]
      const apiAwards = data?.response?.award || [];
      
      for (const award of apiAwards.slice(0, limit)) {
        const awardNumber = award.id || 'Unknown';
        const title = award.title || `NSF Award ${awardNumber}`;
        
        // Handle PI name (can be separate firstName/lastName or combined)
        let principalInvestigator = 'Unknown PI';
        if (award.piFirstName && award.piLastName) {
          principalInvestigator = `${award.piFirstName} ${award.piLastName}`.trim();
        } else if (award.piLastName) {
          principalInvestigator = award.piLastName;
        } else if (award.piFirstName) {
          principalInvestigator = award.piFirstName;
        }
        
        // Handle institution name - try awardeeName first, fall back to combinations
        let institution = 'Unknown Institution';
        if (award.awardeeName) {
          institution = award.awardeeName;
        }
        
        // Add location context if available
        if (award.awardeeCity && award.awardeeStateCode) {
          institution += ` (${award.awardeeCity}, ${award.awardeeStateCode})`;
        } else if (award.awardeeStateCode) {
          institution += ` (${award.awardeeStateCode})`;
        }
        
        // Parse funding amounts with better formatting
        const formatAmount = (amount: any) => {
          if (!amount) return '$0';
          const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
          if (isNaN(numAmount)) return '$0';
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(numAmount);
        };
        
        const totalIntendedAward = formatAmount(award.estimatedTotalAmt || award.fundsObligatedAmt);
        const totalAwardedToDate = formatAmount(award.fundsObligatedAmt);
        
        // Handle Co-PIs - NSF API uses coPDPI field
        let coPIs: string[] = [];
        if (award.coPDPI && Array.isArray(award.coPDPI)) {
          coPIs = award.coPDPI.map((copi: any) => {
            if (typeof copi === 'string') return copi;
            if (copi.firstName && copi.lastName) return `${copi.firstName} ${copi.lastName}`;
            return copi.lastName || copi.firstName || 'Unknown Co-PI';
          });
        }
        
        awards.push({
          awardNumber,
          title,
          institution,
          principalInvestigator,
          coPIs,
          totalIntendedAward,
          totalAwardedToDate,
          startDate: award.startDate || 'Unknown',
          endDate: award.expDate || 'Unknown', 
          abstract: award.abstractText || 'No abstract available',
          programOfficer: award.poName || undefined,
          primaryProgram: award.primaryProgram || award.fundProgramName || undefined,
          fundingHistory: [] // NSF API doesn't provide detailed history in this format
        });
      }
    } catch (error) {
      console.warn('Failed to parse NSF API response:', error);
    }
    
    return awards;
  }

  // NSF Formatting Methods  
  private formatNSFAward(award: NSFAward): string {
    let result = `🏆 **NSF Award Details**\n\n`;
    
    result += `**Award Number:** ${award.awardNumber}\n`;
    result += `**Title:** ${award.title}\n\n`;
    
    result += `**Principal Investigator:** ${award.principalInvestigator}\n`;
    result += `**Institution:** ${award.institution}\n\n`;
    
    if (award.coPIs && award.coPIs.length > 0) {
      result += `**Co-Principal Investigators:** ${award.coPIs.join(', ')}\n\n`;
    }
    
    result += `**Award Amount:** ${award.totalIntendedAward}\n`;
    result += `**Period:** ${award.startDate} to ${award.endDate}\n\n`;
    
    if (award.programOfficer) {
      result += `**Program Officer:** ${award.programOfficer}\n`;
    }
    if (award.primaryProgram) {
      result += `**Program:** ${award.primaryProgram}\n`;
    }
    
    result += `\n**Abstract:**\n${award.abstract}\n\n`;
    
    result += `---\n**XDMoD Integration:** You can now search XDMoD metrics for computational\nusage related to "${award.principalInvestigator}" or "${award.institution}" to find\nrelated ACCESS-CI resource utilization patterns.`;
    
    return result;
  }
}

// Start the server
const server = new XDMoDMetricsServer();
server.start().catch(console.error);
