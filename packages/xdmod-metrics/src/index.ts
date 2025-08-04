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
    super("xdmod-metrics", "0.2.3", "https://xdmod.access-ci.org");
  }

  protected getTools() {
    return [
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
              description: 'The realm (e.g., "Jobs")',
            },
            group_by: {
              type: "string",
              description: 'The group by field (e.g., "none")',
            },
            statistic: {
              type: "string",
              description: 'The statistic name (e.g., "total_cpu_hours")',
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
              default: "timeseries",
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
              description: 'The realm (e.g., "Jobs")',
            },
            group_by: {
              type: "string",
              description: 'The group by field (e.g., "none")',
            },
            statistic: {
              type: "string",
              description: 'The statistic name (e.g., "total_cpu_hours")',
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
              default: "timeseries",
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
            statistic_id: {
              type: "string",
              description:
                "The statistic ID from the dimensions/statistics API",
            },
          },
          required: ["statistic_id"],
        },
      },
    ];
  }

  protected getResources() {
    return [];
  }

  protected async handleToolCall(request: any) {
    const { name, arguments: args } = request.params;

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
        });

      case "get_chart_link":
        return await this.getChartLink(args.statistic_id);

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
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
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
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
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
  }) {
    try {
      const response = await fetch(
        `${this.baseURL}/controllers/user_interface.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
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
          }),
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
  }) {
    try {
      const response = await fetch(
        `${this.baseURL}/controllers/user_interface.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
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
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const imageData = await response.text();

      return {
        content: [
          {
            type: "text",
            text:
              `Chart Image (${params.format.toUpperCase()}) for ${params.statistic}:\n\n` +
              `**Parameters:** Realm: ${params.realm}, Group By: ${params.group_by}, ` +
              `Date Range: ${params.start_date} to ${params.end_date}\n\n` +
              `**Image Data:**\n\`\`\`${params.format}\n${imageData}\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch chart image: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async getChartLink(statisticId: string) {
    const chartUrl = `https://xdmod.access-ci.org/index.php#tg_usage?node=${statisticId}`;

    return {
      content: [
        {
          type: "text",
          text:
            `Direct link to view chart in XDMoD portal:\n\n${chartUrl}\n\n` +
            `You can use this URL to view the interactive chart directly in the XDMoD web interface.`,
        },
      ],
    };
  }
}

// Start the server
const server = new XDMoDMetricsServer();
server.start().catch(console.error);
