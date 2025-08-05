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
}

// Start the server
const server = new XDMoDMetricsServer();
server.start().catch(console.error);
