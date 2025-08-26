  We're building an MCP (Model Context Protocol) server that allows users to query their personal XDMoD metrics through natural language. Users want to ask questions like "Show me my CPU usage last month" or "What's my credit balance?" and get their individual data, not system-wide statistics.

  Current Implementation

  We're authenticating using the API token from the XDMoD portal:

```javascript
// Authentication setup in packages/xdmod-metrics/src/index.ts
class XDMoDMetricsServer {
  private apiToken?: string;

  constructor() {
    // Token from user's XDMoD profile -> API Token tab
    this.apiToken = process.env.XDMOD_API_TOKEN;
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/x-www-form-urlencoded",
      "Token": this.apiToken,  // Using "Token" header per XDMoD docs
    };
  }
}
```

  We're trying to access personal usage data by using authenticated requests with person grouping:

```javascript
// Attempting to get user-specific data
const response = await fetch(
  `${this.baseURL}/controllers/user_interface.php`,
  {
    method: "POST",
    headers: {
      "Token": this.apiToken,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      operation: "get_charts",
      public_user: "false",  // Trying authenticated access
      dataset_type: "aggregate",
      format: "hc_jsonstore",
      realm: "Jobs",
      group_by: "person",  // Group by person to get individual users
      statistic: "total_cpu_hours",
      start_date: "2024-01-01",
      end_date: "2024-12-31",
      person_filter: "john.smith",  // Trying to filter to specific user
    }),
  }
);
```

Is there a specific endpoint or parameter combination for accessing personal metrics?
- Should we use a different endpoint than /controllers/user_interface.php?
- Is there a user_id or username parameter we should include?
- Does the API support automatic user context based on the token?
  