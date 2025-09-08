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
  constructor() {
    super("xdmod-charts", "0.5.0", "https://xdmod.access-ci.org");
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/x-www-form-urlencoded",
    };
  }

  protected getTools(): any[] {
    const tools: any[] = [
      {
        name: "get_chart_data",
        description: "Get chart data and metadata for a specific statistic from XDMoD. Common examples: Jobs realm with total_cpu_hours by person, SUPREMM realm with gpu_time by resource.",
        inputSchema: {
          type: "object",
          properties: {
            realm: {
              type: "string",
              description: 'The realm: "Jobs" for general job statistics, "SUPREMM" for GPU and performance metrics',
              enum: ["Jobs", "SUPREMM"]
            },
            group_by: {
              type: "string",
              description: 'How to group the data: "none" (system-wide), "resource" (by compute resource), "person" (by user - Jobs realm only)',
              enum: ["none", "resource", "person"]
            },
            statistic: {
              type: "string",
              description: 'The statistic to chart. Jobs realm (most common): "total_cpu_hours" (CPU usage), "job_count" (number of jobs). SUPREMM realm (most common): "gpu_time" (GPU hours), "wall_time" (total CPU time), "cpu_time_user" (user CPU time). Advanced: "total_ace", "avg_cpu_hours", "avg_percent_gpu_usage", "avg_percent_cpu_user", "avg_flops_per_core", "avg_memory_per_core", "avg_ib_rx_bytes".',
              examples: ["total_cpu_hours", "job_count", "gpu_time", "wall_time"]
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
          "Get chart image (SVG, PNG, or PDF) for a specific statistic. Use PNG format for direct display in Claude Desktop.",
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
              description: 'The statistic to chart. Jobs realm (most common): "total_cpu_hours" (CPU usage), "job_count" (number of jobs). SUPREMM realm (most common): "gpu_time" (GPU hours), "wall_time" (total CPU time), "cpu_time_user" (user CPU time). Advanced: "total_ace", "avg_cpu_hours", "avg_percent_gpu_usage", "avg_percent_cpu_user", "avg_flops_per_core", "avg_memory_per_core", "avg_ib_rx_bytes".',
              examples: ["total_cpu_hours", "job_count", "gpu_time", "wall_time"]
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
              description: 'The statistic to chart. Jobs realm (most common): "total_cpu_hours" (CPU usage), "job_count" (number of jobs). SUPREMM realm (most common): "gpu_time" (GPU hours), "wall_time" (total CPU time), "cpu_time_user" (user CPU time). Advanced: "total_ace", "avg_cpu_hours", "avg_percent_gpu_usage", "avg_percent_cpu_user", "avg_flops_per_core", "avg_memory_per_core", "avg_ib_rx_bytes".',
              examples: ["total_cpu_hours", "job_count", "gpu_time", "wall_time"]
            },
          },
          required: ["realm", "group_by", "statistic"],
        },
      },
    ];

    return tools;
  }

  protected getResources() {
    return [];
  }

  protected async handleToolCall(request: any) {
    const { name, arguments: args } = request.params;
    // console.log(`[XDMoD] Tool called: ${name}`, args);

    switch (name) {
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







      default:
        throw new Error(`Unknown tool: ${name}`);
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
          headers: this.getHeaders(),
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
          headers: this.getHeaders(),
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


}

// Start the server
async function main() {
  // Check if we should run as HTTP server (for deployment)
  const port = process.env.PORT;

  const server = new XDMoDMetricsServer();
  
  if (port) {
    // Running in HTTP mode (deployment)
    await server.start({ httpPort: parseInt(port) });
  } else {
    // Running in MCP mode (stdio)
    await server.start();
  }
}

main().catch((error) => {
  // Log errors to a file instead of stderr to avoid interfering with JSON-RPC
  process.exit(1);
});
