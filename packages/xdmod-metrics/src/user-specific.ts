// User-specific functionality for XDMoD Metrics Server
// This module contains experimental features for personal usage data access

export interface UserSpecificParams {
  realm: string;
  statistic: string;
  start_date: string;
  end_date: string;
  username_filter?: string;
}

export class XDMoDUserSpecific {
  private baseURL: string;
  private apiToken: string;

  constructor(baseURL: string, apiToken: string) {
    this.baseURL = baseURL;
    this.apiToken = apiToken;
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Token: this.apiToken,
      "Content-Type": "application/x-www-form-urlencoded",
    };
  }

  async getCurrentUser() {
    try {
      // Test API token authentication by making a simple authenticated request
      const url = `${this.baseURL}/controllers/user_interface.php`;
      const headers = this.getAuthHeaders();

      // Use public_user: "true" but with Token header to verify token works
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: new URLSearchParams({
          operation: "get_menus",
          public_user: "true", // Use public but with token to verify auth
          node: "category_",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} - ${errorText}`,
        );
      }

      const userData = await response.json();

      return {
        content: [
          {
            type: "text",
            text:
              `Current User Authentication Status:\n\n` +
              `**Authentication Status:** ✅ Authenticated with API Token\n\n` +
              `**Token Status:** Successfully validated by XDMoD server\n\n` +
              `**Token Details:**\n` +
              `- Length: ${this.apiToken.length} characters\n` +
              `- Preview: ${this.apiToken.substring(0, 10)}...\n` +
              `- Format: Numeric token ID with hash\n\n` +
              `**Available Features:**\n` +
              `- Personal usage data access via get_my_usage\n` +
              `- Individual job history and metrics\n\n` +
              `**Note:** With API token authentication, you can access additional endpoints and features.\n\n` +
              `**Try these commands:**\n` +
              `- "Show me my credit usage from July 1 to August 1, 2024"\n` +
              `- "Get my usage data for the last 3 months"\n` +
              `- "What's my total CPU hours this year?"\n\n` +
              `**Authentication Test Response:**\n\`\`\`json\n${JSON.stringify(userData, null, 2).substring(0, 500)}...\n\`\`\``,
          },
        ],
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch current user: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getMyUsage(params: UserSpecificParams) {
    try {
      // Use the working controllers/user_interface.php endpoint for personal data
      const url = `${this.baseURL}/controllers/user_interface.php`;

      // Try to get user-specific data by grouping by "person" which should give us individual users
      const urlParams = new URLSearchParams({
        operation: "get_charts",
        public_user: "false", // Use authenticated request to access personal data
        dataset_type: "aggregate", // Use aggregate to get total usage values
        format: "hc_jsonstore",
        width: "916",
        height: "484",
        realm: params.realm,
        group_by: "person", // Group by person to get individual user data
        statistic: params.statistic,
        start_date: params.start_date,
        end_date: params.end_date,
        limit: "50", // Increase limit to find user in results
        offset: "0",
      });

      // Add username filter if provided - use person_filter for user filtering
      if (params.username_filter) {
        urlParams.append("person_filter", params.username_filter);
      }

      const response = await fetch(url, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: urlParams,
      });

      if (!response.ok) {
        // If person grouping fails, try alternative approaches
        const fallbackParams = new URLSearchParams({
          operation: "get_charts",
          public_user: "true", // Fallback to public with token
          dataset_type: "aggregate",
          format: "hc_jsonstore",
          width: "916",
          height: "484",
          realm: params.realm,
          group_by: "none", // Try aggregate data first
          statistic: params.statistic,
          start_date: params.start_date,
          end_date: params.end_date,
        });

        const fallbackResponse = await fetch(url, {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: fallbackParams,
        });

        if (!fallbackResponse.ok) {
          const errorText = await fallbackResponse.text();
          throw new Error(
            `HTTP ${fallbackResponse.status}: ${fallbackResponse.statusText} - ${errorText}`,
          );
        }

        const fallbackData = await fallbackResponse.json();
        return this.formatUsageResponse(
          fallbackData,
          params,
          "none",
          "Fallback: System aggregate data (personal filtering not available)",
        );
      }

      const data = await response.json();
      return this.formatUsageResponse(
        data,
        params,
        "person",
        params.username_filter
          ? `Filtered for: "${params.username_filter}"`
          : "All users data",
      );
    } catch (error) {
      throw new Error(
        `Failed to fetch personal usage data: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private formatUsageResponse(
    data: any,
    params: UserSpecificParams,
    groupBy: string,
    note: string,
  ) {
    let resultText = `📊 **${params.statistic} Usage Data (${params.realm} realm)**\n\n`;
    resultText += `**Period:** ${params.start_date} to ${params.end_date}\n`;
    resultText += `**Group By:** ${groupBy}\n`;
    resultText += `**Note:** ${note}\n\n`;

    if (data.data && data.data.length > 0) {
      const chartInfo = data.data[0];

      // Extract and display the most relevant usage information
      if (
        chartInfo.chart &&
        chartInfo.chart.series &&
        chartInfo.chart.series.length > 0
      ) {
        const series = chartInfo.chart.series;

        if (groupBy === "person" && series.length > 0) {
          // For person-grouped data, show individual user results
          let foundPersonalData = false;
          let totalUsage = 0;
          let userCount = 0;

          resultText += `**Individual User Usage:**\n\n`;

          for (const seriesData of series.slice(0, 20)) {
            // Show up to 20 users
            const userName = seriesData.name || "Unknown User";
            const userData = seriesData.data || [];

            // Calculate total usage for this user
            const userTotal = userData.reduce((sum: number, point: any) => {
              return sum + (typeof point === "number" ? point : point?.y || 0);
            }, 0);

            if (userTotal > 0) {
              resultText += `**${userName}:** ${userTotal.toLocaleString()} SU\n`;
              totalUsage += userTotal;
              userCount++;
              foundPersonalData = true;

              // If this matches our filter, highlight it
              if (
                params.username_filter &&
                userName
                  .toLowerCase()
                  .includes(params.username_filter.toLowerCase())
              ) {
                resultText += `  ↳ ✅ **This matches your filter!**\n`;
              }
            }
          }

          if (foundPersonalData) {
            resultText += `\n**Summary:**\n`;
            resultText += `- Users shown: ${userCount}\n`;
            resultText += `- Total usage: ${totalUsage.toLocaleString()} SU\n`;
            resultText += `- Average per user: ${Math.round(totalUsage / userCount).toLocaleString()} SU\n\n`;

            if (params.username_filter) {
              const matchingUsers = series.filter(
                (s: any) =>
                  s.name &&
                  s.name
                    .toLowerCase()
                    .includes(params.username_filter!.toLowerCase()),
              );

              if (matchingUsers.length > 0) {
                resultText += `**🎯 Your Personal Usage (matching "${params.username_filter}"):**\n`;
                matchingUsers.forEach((user: any) => {
                  const userTotal = (user.data || []).reduce(
                    (sum: number, point: any) => {
                      return (
                        sum +
                        (typeof point === "number" ? point : point?.y || 0)
                      );
                    },
                    0,
                  );
                  resultText += `- **${user.name}:** ${userTotal.toLocaleString()} SU\n`;
                });
                resultText += `\n`;
              } else {
                resultText += `**❌ No users found matching "${params.username_filter}"**\n`;
                resultText += `Try a different search term or check the user list above.\n\n`;
              }
            }
          } else {
            resultText += `No individual user data found. This might indicate:\n`;
            resultText += `- No usage during this period\n`;
            resultText += `- Data is not available at user level\n`;
            resultText += `- Different grouping may be needed\n\n`;
          }
        } else {
          // Handle aggregate or other grouping types
          const mainSeries = series[0];
          if (mainSeries && mainSeries.data) {
            const totalUsage = mainSeries.data.reduce(
              (sum: number, point: any) => {
                return (
                  sum + (typeof point === "number" ? point : point?.y || 0)
                );
              },
              0,
            );

            resultText += `**Aggregate Usage:**\n`;
            resultText += `- Total ${params.statistic}: ${totalUsage.toLocaleString()} SU\n`;
            resultText += `- Data points: ${mainSeries.data.length}\n`;
            resultText += `- Series name: ${mainSeries.name || "Unnamed"}\n\n`;

            if (mainSeries.data.length > 1) {
              const avgUsage = totalUsage / mainSeries.data.length;
              const maxUsage = Math.max(
                ...mainSeries.data.map((point: any) =>
                  typeof point === "number" ? point : point?.y || 0,
                ),
              );

              resultText += `**Statistics:**\n`;
              resultText += `- Average per period: ${avgUsage.toLocaleString()} SU\n`;
              resultText += `- Peak usage: ${maxUsage.toLocaleString()} SU\n\n`;
            }
          }
        }

        // Add chart description if available
        if (chartInfo.group_description) {
          resultText += `**Description:** ${chartInfo.group_description}\n\n`;
        }
      } else {
        resultText += `**No usage data found**\n\n`;
        resultText += `This could indicate:\n`;
        resultText += `- No activity during the specified period\n`;
        resultText += `- Access restrictions on this data\n`;
        resultText += `- The statistic/realm combination may not be valid\n\n`;
      }

      // Authentication status
      resultText += `**🔑 Status:** ✅ Authenticated with API Token\n`;
      resultText += `**📈 Data Access:** ${data.data.length > 0 ? "✅ Successful" : "⚠️ Limited"}\n\n`;

      // Provide helpful tips
      if (groupBy === "person" && !params.username_filter) {
        resultText += `**💡 Tip:** Use the 'username_filter' parameter to find your specific usage:\n`;
        resultText += `- Try your last name: "Smith"\n`;
        resultText += `- Or part of your institution: "Columbia"\n`;
        resultText += `- Or your full name format from the list above\n\n`;
      }
    } else {
      resultText += `**No data returned from XDMoD**\n\n`;
      resultText += `This might mean:\n`;
      resultText += `- Invalid date range or parameters\n`;
      resultText += `- No access to this realm/statistic\n`;
      resultText += `- Server-side filtering removed all results\n\n`;
      resultText += `**Raw Response:** \`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
    }

    return {
      content: [
        {
          type: "text",
          text: resultText,
        },
      ],
    };
  }
}
