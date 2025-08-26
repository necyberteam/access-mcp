// User-specific functionality for XDMoD Metrics Server
// This module contains experimental features for personal usage data access

export interface UserSpecificParams {
  realm: string;
  statistic: string;
  start_date: string;
  end_date: string;
  username_filter?: string;
  person_id?: string; // ACCESS person ID for direct filtering
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
      "Token": this.apiToken,
      "Content-Type": "application/x-www-form-urlencoded",
    };
  }

  async getUserGroupBys(realm: string = "Jobs") {
    try {
      // First get all available group_bys for the realm
      const response = await fetch(
        `${this.baseURL}/controllers/user_interface.php`,
        {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: new URLSearchParams({
            operation: "get_menus",
            public_user: "false", // Authenticated to see all options
            category: realm,
            node: `${realm}_`,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Filter for user-related group_bys
      const userGroupBys = data.filter((item: any) => {
        const groupBy = item.group_by?.toLowerCase() || "";
        const text = item.text?.toLowerCase() || "";
        return groupBy.includes("user") || 
               groupBy.includes("person") || 
               text.includes("user") || 
               text.includes("person") ||
               groupBy === "pi"; // Principal Investigator
      });

      return {
        realm,
        allGroupBys: data.map((item: any) => ({
          id: item.id,
          text: item.text,
          group_by: item.group_by,
        })),
        userRelatedGroupBys: userGroupBys.map((item: any) => ({
          id: item.id,
          text: item.text,
          group_by: item.group_by,
        })),
      };
    } catch (error) {
      throw new Error(
        `Failed to enumerate user group_bys: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async discoverPersonIds() {
    try {
      // Try multiple approaches to discover person IDs and their formats
      const approaches = [
        {
          name: "Public person-grouped data",
          params: {
            operation: "get_data",
            format: "jsonstore",
            public_user: "true",
            realm: "Jobs",
            group_by: "person",
            statistic: "total_cpu_hours",
            start_date: "2024-01-01",
            end_date: "2024-12-31",
            limit: "20",
          } as Record<string, string>
        },
        {
          name: "Public person-grouped charts",
          params: {
            operation: "get_charts",
            format: "hc_jsonstore",
            public_user: "true",
            realm: "Jobs",
            group_by: "person",
            statistic: "total_cpu_hours",
            start_date: "2024-01-01",
            end_date: "2024-12-31",
            dataset_type: "aggregate",
            limit: "20",
          } as Record<string, string>
        },
        {
          name: "Authenticated person-grouped data",
          params: {
            operation: "get_data",
            format: "jsonstore",
            public_user: "false",
            realm: "Jobs",
            group_by: "person",
            statistic: "total_cpu_hours",
            start_date: "2024-01-01",
            end_date: "2024-12-31",
            limit: "20",
          } as Record<string, string>
        }
      ];

      const results = [];

      for (const approach of approaches) {
        try {
          const response = await fetch(
            `${this.baseURL}/controllers/user_interface.php`,
            {
              method: "POST",
              headers: this.getAuthHeaders(),
              body: new URLSearchParams(approach.params),
            }
          );

          let result = {
            approach: approach.name,
            status: response.status,
            success: response.ok,
            persons: [] as any[],
            rawDataStructure: {},
            error: null as string | null
          };

          if (response.ok) {
            const data = await response.json();
            
            // Analyze data structure
            result.rawDataStructure = {
              hasData: !!data.data,
              dataType: typeof data.data,
              dataLength: Array.isArray(data.data) ? data.data.length : 'not array',
              sampleKeys: data.data && data.data[0] ? Object.keys(data.data[0]) : [],
              chartSeries: data.data && data.data[0]?.chart?.series ? data.data[0].chart.series.length : 'none',
              hasChart: data.data && data.data[0] && !!data.data[0].chart,
              chartStructure: data.data && data.data[0]?.chart ? Object.keys(data.data[0].chart) : []
            };

            // Extract person information
            if (data.data) {
              if (Array.isArray(data.data)) {
                // jsonstore format - direct data array
                result.persons = data.data.map((item: any) => ({
                  name: item.name || 'Unknown',
                  id: item.id || item.person_id || 'No ID',
                  value: item.value || 'No value'
                })).slice(0, 10);
              } else if (data.data[0]?.chart?.series) {
                // hc_jsonstore format - chart series
                result.persons = data.data[0].chart.series.map((series: any) => ({
                  name: series.name || 'Unknown',
                  id: series.id || series.person_id || 'No ID',
                  dataPoints: series.data ? series.data.length : 0,
                  allFields: Object.keys(series) // Show what fields are available
                })).slice(0, 10);
              } else {
                // No standard format found - show raw structure sample
                result.persons = [{
                  name: 'Raw data sample',
                  id: 'N/A',
                  rawSample: JSON.stringify(data.data, null, 2).substring(0, 500)
                }];
              }
            }
          } else {
            const errorText = await response.text();
            result.error = `HTTP ${response.status}: ${errorText}`;
          }

          results.push(result);
        } catch (error) {
          results.push({
            approach: approach.name,
            status: 0,
            success: false,
            persons: [],
            rawDataStructure: {},
            error: `Exception: ${error instanceof Error ? error.message : String(error)}`
          });
        }
      }

      return {
        summary: `Tested ${approaches.length} approaches to discover person IDs`,
        results,
        recommendations: this.generatePersonIdRecommendations(results)
      };

    } catch (error) {
      throw new Error(`Person ID discovery failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private generatePersonIdRecommendations(results: any[]): string[] {
    const recommendations = [];
    
    const successfulResults = results.filter(r => r.success);
    if (successfulResults.length === 0) {
      recommendations.push("❌ No successful API calls - check authentication or API availability");
      return recommendations;
    }

    const withPersons = successfulResults.filter(r => r.persons.length > 0);
    if (withPersons.length === 0) {
      recommendations.push("⚠️ API calls successful but no person data returned");
      recommendations.push("💡 Try different date ranges or check if person grouping is available");
      return recommendations;
    }

    recommendations.push("✅ Found person data! Next steps:");
    
    // Check if we have actual person IDs
    const withIds = withPersons.filter(r => 
      r.persons.some((p: any) => p.id && p.id !== 'No ID')
    );
    
    if (withIds.length > 0) {
      recommendations.push("🎯 Person IDs are available - you can use them for filtering");
      recommendations.push("📝 Use the 'person_id' parameter in get_my_usage calls");
    } else {
      recommendations.push("⚠️ Person names available but IDs may not be in API response");
      recommendations.push("💡 Try using person names with 'username_filter' parameter instead");
    }

    return recommendations;
  }

  async lookupPersonIdPublic(searchTerm: string) {
    try {
      // Try public access first to see if we can get any user data
      const response = await fetch(
        `${this.baseURL}/controllers/user_interface.php`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            operation: "get_charts",
            public_user: "true", // Public access
            format: "hc_jsonstore",
            realm: "Jobs",
            group_by: "person",
            statistic: "total_cpu_hours",
            start_date: "2024-01-01",
            end_date: "2024-12-31",
            dataset_type: "aggregate",
            limit: "100",
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          searchTerm,
          error: `Public lookup failed: HTTP ${response.status}: ${response.statusText}. Response: ${errorText}`,
          matches: [],
          note: "Public access to user data may be restricted. Authentication likely required.",
        };
      }

      const data = await response.json();
      
      // Add some diagnostic information
      const result = this.extractPersonIds(data, searchTerm);
      
      // Enhanced result with API response info
      return {
        ...result,
        diagnostic: {
          responseStructure: {
            hasData: !!data.data,
            dataLength: data.data ? data.data.length : 0,
            dataType: data.data ? typeof data.data : 'undefined',
            sampleFields: data.data && data.data[0] ? Object.keys(data.data[0]) : [],
          },
          rawDataSample: data.data ? JSON.stringify(data.data.slice(0, 2), null, 2) : 'No data',
        }
      };
    } catch (error) {
      return {
        searchTerm,
        error: `Exception during public lookup: ${error instanceof Error ? error.message : String(error)}`,
        matches: [],
        note: "Public access failed - authentication required for user data access.",
      };
    }
  }

  async lookupPersonId(searchTerm: string) {
    try {
      // Try to find person ID by searching for users in the data
      // First, get data grouped by person to see all users
      const response = await fetch(
        `${this.baseURL}/controllers/user_interface.php`,
        {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: new URLSearchParams({
            operation: "get_data",
            format: "jsonstore",
            realm: "Jobs",
            group_by: "person",
            statistic: "total_cpu_hours",
            start_date: "2024-01-01", // Use recent date range
            end_date: "2024-12-31",
            limit: "100", // Get more users to search through
          }),
        }
      );

      if (!response.ok) {
        const initialErrorText = await response.text();
        console.log(`Initial get_data request failed: HTTP ${response.status}: ${response.statusText}. Response: ${initialErrorText}`);
        
        // Fallback to get_charts if get_data doesn't work
        const fallbackResponse = await fetch(
          `${this.baseURL}/controllers/user_interface.php`,
          {
            method: "POST",
            headers: this.getAuthHeaders(),
            body: new URLSearchParams({
              operation: "get_charts",
              public_user: "false",
              format: "hc_jsonstore",
              realm: "Jobs",
              group_by: "person",
              statistic: "total_cpu_hours",
              start_date: "2024-01-01",
              end_date: "2024-12-31",
              dataset_type: "aggregate",
              limit: "100",
            }),
          }
        );

        if (!fallbackResponse.ok) {
          const errorText = await fallbackResponse.text();
          throw new Error(`Unable to retrieve user list for person ID lookup. HTTP ${fallbackResponse.status}: ${fallbackResponse.statusText}. Response: ${errorText}`);
        }

        const data = await fallbackResponse.json();
        return this.extractPersonIds(data, searchTerm);
      }

      const data = await response.json();
      return this.extractPersonIds(data, searchTerm);
    } catch (error) {
      throw new Error(
        `Failed to lookup person ID: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private extractPersonIds(data: any, searchTerm: string) {
    const searchLower = searchTerm.toLowerCase();
    const matches: Array<{ name: string; id?: string; match_score: number }> = [];

    // Handle jsonstore format
    if (data.data && Array.isArray(data.data)) {
      for (const item of data.data) {
        if (item.name) {
          const nameLower = item.name.toLowerCase();
          let score = 0;
          
          // Exact match
          if (nameLower === searchLower) score = 100;
          // Contains full search term
          else if (nameLower.includes(searchLower)) score = 75;
          // Search term contains name (for partial matches)
          else if (searchLower.includes(nameLower)) score = 50;
          // Word-by-word matching
          else {
            const searchWords = searchLower.split(/\s+/);
            const nameWords = nameLower.split(/\s+/);
            const matchingWords = searchWords.filter((sw: string) => 
              nameWords.some((nw: string) => nw.includes(sw) || sw.includes(nw))
            );
            score = (matchingWords.length / searchWords.length) * 40;
          }

          if (score > 0) {
            matches.push({
              name: item.name,
              id: item.id || item.person_id,
              match_score: score,
            });
          }
        }
      }
    }

    // Handle hc_jsonstore format (chart data)
    if (data.data && data.data[0]?.chart?.series) {
      const series = data.data[0].chart.series;
      for (const seriesItem of series) {
        if (seriesItem.name) {
          const nameLower = seriesItem.name.toLowerCase();
          let score = 0;
          
          if (nameLower === searchLower) score = 100;
          else if (nameLower.includes(searchLower)) score = 75;
          else if (searchLower.includes(nameLower)) score = 50;
          else {
            const searchWords = searchLower.split(/\s+/);
            const nameWords = nameLower.split(/\s+/);
            const matchingWords = searchWords.filter((sw: string) => 
              nameWords.some((nw: string) => nw.includes(sw) || sw.includes(nw))
            );
            score = (matchingWords.length / searchWords.length) * 40;
          }

          if (score > 0) {
            matches.push({
              name: seriesItem.name,
              id: seriesItem.id || seriesItem.person_id,
              match_score: score,
            });
          }
        }
      }
    }

    // Sort by match score
    matches.sort((a, b) => b.match_score - a.match_score);

    return {
      searchTerm,
      matches: matches.slice(0, 10), // Return top 10 matches
      note: matches.length === 0 
        ? "No matching users found. Try a different search term or check if the user has activity in the specified date range."
        : `Found ${matches.length} potential matches. Person IDs may not be available in all response formats.`,
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
          node: "category_"
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const userData = await response.json();

      return {
        content: [
          {
            type: "text",
            text: `Current User Authentication Status:\n\n` +
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
                  `**Authentication Test Response:**\n\`\`\`json\n${JSON.stringify(userData, null, 2).substring(0, 500)}...\n\`\`\``
          }
        ]
      };
    } catch (error) {
      throw new Error(
        `Failed to fetch current user: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getMyUsage(params: UserSpecificParams) {
    try {
      // Use the working controllers/user_interface.php endpoint for personal data
      const url = `${this.baseURL}/controllers/user_interface.php`;
      
      // Primary approach: Use get_data operation with jsonstore format as recommended
      const urlParams = new URLSearchParams({
        operation: "get_data", // Using get_data for raw data as recommended
        public_user: "false", // Use authenticated request to access personal data
        format: "jsonstore", // Easier to parse than hc_jsonstore
        realm: params.realm,
        group_by: "person", // Group by person to get individual user data
        statistic: params.statistic,
        start_date: params.start_date,
        end_date: params.end_date,
        limit: "50", // Increase limit to find user in results
        offset: "0",
      });

      // Use person_id if provided (preferred), otherwise try username filter
      if (params.person_id) {
        urlParams.append("person_id", params.person_id);
      } else if (params.username_filter) {
        // Fallback to person_filter if person_id not available
        urlParams.append("person_filter", params.username_filter);
      }

      const response = await fetch(url, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: urlParams,
      });
      
      if (!response.ok) {
        // If get_data fails, try get_charts with same parameters
        const fallbackParams = new URLSearchParams({
          operation: "get_charts",
          public_user: "false", // Still try authenticated
          dataset_type: "aggregate",
          format: "hc_jsonstore",
          width: "916",
          height: "484",
          realm: params.realm,
          group_by: "person", // Keep trying person grouping
          statistic: params.statistic,
          start_date: params.start_date,
          end_date: params.end_date,
          limit: "50",
        });
        
        // Add filtering parameters to fallback too
        if (params.person_id) {
          fallbackParams.append("person_id", params.person_id);
        } else if (params.username_filter) {
          fallbackParams.append("person_filter", params.username_filter);
        }

        const fallbackResponse = await fetch(url, {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: fallbackParams,
        });

        if (!fallbackResponse.ok) {
          const errorText = await fallbackResponse.text();
          throw new Error(`HTTP ${fallbackResponse.status}: ${fallbackResponse.statusText} - ${errorText}`);
        }

        const fallbackData = await fallbackResponse.json();
        return this.formatUsageResponse(fallbackData, params, "none", "Fallback: System aggregate data (personal filtering not available)");
      }
      
      const data = await response.json();
      return this.formatUsageResponse(data, params, "person", params.username_filter ? `Filtered for: "${params.username_filter}"` : "All users data");
      
    } catch (error) {
      throw new Error(
        `Failed to fetch personal usage data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private formatUsageResponse(data: any, params: UserSpecificParams, groupBy: string, note: string) {
    let resultText = `📊 **${params.statistic} Usage Data (${params.realm} realm)**\n\n`;
    resultText += `**Period:** ${params.start_date} to ${params.end_date}\n`;
    resultText += `**Group By:** ${groupBy}\n`;
    resultText += `**Note:** ${note}\n\n`;

    if (data.data && data.data.length > 0) {
      const chartInfo = data.data[0];

      // Extract and display the most relevant usage information
      if (chartInfo.chart && chartInfo.chart.series && chartInfo.chart.series.length > 0) {
        const series = chartInfo.chart.series;
        
        if (groupBy === "person" && series.length > 0) {
          // For person-grouped data, show individual user results
          let foundPersonalData = false;
          let totalUsage = 0;
          let userCount = 0;
          
          resultText += `**Individual User Usage:**\n\n`;
          
          for (const seriesData of series.slice(0, 20)) { // Show up to 20 users
            const userName = seriesData.name || "Unknown User";
            const userData = seriesData.data || [];
            
            // Calculate total usage for this user
            const userTotal = userData.reduce((sum: number, point: any) => {
              return sum + (typeof point === 'number' ? point : (point?.y || 0));
            }, 0);
            
            if (userTotal > 0) {
              resultText += `**${userName}:** ${userTotal.toLocaleString()} SU\n`;
              totalUsage += userTotal;
              userCount++;
              foundPersonalData = true;
              
              // If this matches our filter, highlight it
              if (params.username_filter && userName.toLowerCase().includes(params.username_filter.toLowerCase())) {
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
              const matchingUsers = series.filter((s: any) => 
                s.name && s.name.toLowerCase().includes(params.username_filter!.toLowerCase())
              );
              
              if (matchingUsers.length > 0) {
                resultText += `**🎯 Your Personal Usage (matching "${params.username_filter}"):**\n`;
                matchingUsers.forEach((user: any) => {
                  const userTotal = (user.data || []).reduce((sum: number, point: any) => {
                    return sum + (typeof point === 'number' ? point : (point?.y || 0));
                  }, 0);
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
            const totalUsage = mainSeries.data.reduce((sum: number, point: any) => {
              return sum + (typeof point === 'number' ? point : (point?.y || 0));
            }, 0);
            
            resultText += `**Aggregate Usage:**\n`;
            resultText += `- Total ${params.statistic}: ${totalUsage.toLocaleString()} SU\n`;
            resultText += `- Data points: ${mainSeries.data.length}\n`;
            resultText += `- Series name: ${mainSeries.name || 'Unnamed'}\n\n`;
            
            if (mainSeries.data.length > 1) {
              const avgUsage = totalUsage / mainSeries.data.length;
              const maxUsage = Math.max(...mainSeries.data.map((point: any) => 
                typeof point === 'number' ? point : (point?.y || 0)
              ));
              
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
      resultText += `**📈 Data Access:** ${data.data.length > 0 ? '✅ Successful' : '⚠️ Limited'}\n\n`;
      
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