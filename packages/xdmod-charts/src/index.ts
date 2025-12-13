#!/usr/bin/env node

import { BaseAccessServer, Tool, Resource, CallToolResult } from "@access-mcp/shared";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("../package.json");

class XDMoDMetricsServer extends BaseAccessServer {
  constructor() {
    super("xdmod-charts", version, "https://xdmod.access-ci.org");
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/x-www-form-urlencoded",
    };
  }

  protected getTools(): Tool[] {
    const tools: Tool[] = [
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
              description: 'The statistic to chart. Jobs realm: "total_cpu_hours" (CPU usage), "job_count" (number of jobs), "avg_waitduration_hours" (average queue wait time), "total_waitduration_hours" (total wait time), "utilization" (CPU utilization), "avg_cpu_hours" (avg CPU per job), "max_processors" (max processor count), "total_ace" (ACCESS credits). SUPREMM realm: "gpu_time" (GPU hours), "wall_time" (total CPU time), "cpu_time_user" (user CPU time), "avg_percent_gpu_usage" (avg GPU %), "avg_percent_cpu_user" (avg CPU %), "avg_flops_per_core", "avg_memory_per_core", "avg_ib_rx_bytes".',
              examples: ["total_cpu_hours", "job_count", "gpu_time", "wall_time"]
            },
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format",
              format: "date"
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format",
              format: "date"
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
              description: 'The statistic to chart. Jobs realm: "total_cpu_hours" (CPU usage), "job_count" (number of jobs), "avg_waitduration_hours" (average queue wait time), "total_waitduration_hours" (total wait time), "utilization" (CPU utilization), "avg_cpu_hours" (avg CPU per job), "max_processors" (max processor count), "total_ace" (ACCESS credits). SUPREMM realm: "gpu_time" (GPU hours), "wall_time" (total CPU time), "cpu_time_user" (user CPU time), "avg_percent_gpu_usage" (avg GPU %), "avg_percent_cpu_user" (avg CPU %), "avg_flops_per_core", "avg_memory_per_core", "avg_ib_rx_bytes".',
              examples: ["total_cpu_hours", "job_count", "gpu_time", "wall_time"]
            },
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format",
              format: "date"
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format",
              format: "date"
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
        description: "Generate a direct URL to view an interactive chart in the XDMoD web portal. Use this when users want to explore data interactively, apply additional filters, or share charts with collaborators. The web interface provides more filtering options than the API.",
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
              description: 'The statistic to chart. Jobs realm: "total_cpu_hours" (CPU usage), "job_count" (number of jobs), "avg_waitduration_hours" (average queue wait time), "total_waitduration_hours" (total wait time), "utilization" (CPU utilization), "avg_cpu_hours" (avg CPU per job), "max_processors" (max processor count), "total_ace" (ACCESS credits). SUPREMM realm: "gpu_time" (GPU hours), "wall_time" (total CPU time), "cpu_time_user" (user CPU time), "avg_percent_gpu_usage" (avg GPU %), "avg_percent_cpu_user" (avg CPU %), "avg_flops_per_core", "avg_memory_per_core", "avg_ib_rx_bytes".',
              examples: ["total_cpu_hours", "job_count", "gpu_time", "wall_time"]
            },
          },
          required: ["realm", "group_by", "statistic"],
        },
      },
    ];

    return tools;
  }

  protected getResources(): Resource[] {
    return [];
  }

  protected async handleToolCall(request: { method: "tools/call"; params: { name: string; arguments?: Record<string, unknown> } }): Promise<CallToolResult> {
    const { name, arguments: args = {} } = request.params;
    // console.log(`[XDMoD] Tool called: ${name}`, args);

    switch (name) {
      case "get_chart_data":
        return await this.getChartData({
          realm: args.realm as string,
          group_by: args.group_by as string,
          statistic: args.statistic as string,
          start_date: args.start_date as string,
          end_date: args.end_date as string,
          dataset_type: (args.dataset_type as string) || "timeseries",
          display_type: (args.display_type as string) || "line",
          combine_type: (args.combine_type as string) || "side",
          limit: (args.limit as number) || 10,
          offset: (args.offset as number) || 0,
          log_scale: (args.log_scale as string) || "n",
          filters: args.filters as Record<string, string> | undefined,
        });

      case "get_chart_image":
        return await this.getChartImage({
          realm: args.realm as string,
          group_by: args.group_by as string,
          statistic: args.statistic as string,
          start_date: args.start_date as string,
          end_date: args.end_date as string,
          format: (args.format as string) || "svg",
          width: (args.width as number) || 916,
          height: (args.height as number) || 484,
          dataset_type: (args.dataset_type as string) || "timeseries",
          display_type: (args.display_type as string) || "line",
          combine_type: (args.combine_type as string) || "side",
          limit: (args.limit as number) || 10,
          offset: (args.offset as number) || 0,
          log_scale: (args.log_scale as string) || "n",
          filters: args.filters as Record<string, string> | undefined,
        });

      case "get_chart_link":
        return await this.getChartLink(args.realm as string, args.group_by as string, args.statistic as string);







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
            type: "text" as const,
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
              type: "image" as const,
              data: base64Data,
              mimeType: "image/png",
            },
            {
              type: "text" as const,
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
                type: "text" as const,
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
                type: "text" as const,
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
          type: "text" as const,
          text: responseText,
        },
      ],
    };
  }

}

// Start the server
async function main() {
  const server = new XDMoDMetricsServer();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
  await server.start(port ? { httpPort: port } : undefined);
}

main().catch(() => {
  // Log errors to a file instead of stderr to avoid interfering with JSON-RPC
  process.exit(1);
});
