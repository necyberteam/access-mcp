# AI Assistant Guide for XDMoD MCP Servers

This guide helps AI assistants effectively use the XDMoD MCP servers to provide accurate and helpful responses to users.

## Quick Server Selection Guide

### Use **TypeScript Server** (`xdmod-metrics`) for:
- ✅ Chart generation (SVG, PNG, PDF) 
- ✅ NSF awards and funding analysis
- ✅ Portal link generation
- ✅ Public metrics and dashboards
- ✅ System-wide usage statistics

### Use **Python Server** (`xdmod-python`) for:
- ✅ Finding specific users by name
- ✅ Personal usage data extraction
- ✅ Data manipulation and analysis  
- ✅ Clean structured data output
- ✅ User discovery and enumeration

## Essential Workflow Patterns

### 1. Always Start with Discovery
Before requesting specific data, help users discover what's available:

```
User: "Show me CPU usage data"
AI: Let me first check what metrics are available.

Step 1: get_dimensions() 
Step 2: get_statistics() for chosen dimension
Step 3: get_chart_data() with proper parameters
```

### 2. User-Specific Data Pattern
When users ask for "my data" or specific person data:

```
User: "Show me John Smith's usage"
AI: I'll help you find John Smith's data using the Python server for better user matching.

Step 1: discover_person_ids(search_term: "Smith") 
Step 2: get_user_data_python() with exact name match
Step 3: Optionally get_chart_data() for visualization
```

### 3. Research Analysis Pattern  
For academic/research questions involving funding:

```
User: "Analyze Dr. Johnson's computational usage with funding context"
AI: I'll combine XDMoD usage data with NSF funding information.

Step 1: get_usage_with_nsf_context()
Step 2: analyze_funding_vs_usage() if specific award mentioned
Step 3: get_chart_data() for visual confirmation
```

## Common User Intent Patterns

### 🔍 **Exploration Queries**
- "What metrics are available in XDMoD?"
- "What can I track?"
- "Show me available dimensions"

**Response Pattern:**
1. Use `get_dimensions()` 
2. Explain the key realms (Jobs, SUPREMM)
3. Provide specific examples

### 📊 **Data Queries**  
- "Show me CPU hours for January 2024"
- "What was the job count last month?"
- "Get GPU usage data"

**Response Pattern:**
1. Choose appropriate realm (Jobs vs SUPREMM)
2. Use `get_chart_data()` with correct parameters
3. Explain the data returned

### 👤 **Personal Data Queries**
- "Show me my usage"
- "Find John Smith's data"
- "Get my computational credits"

**Response Pattern:**
1. Use Python server for user discovery
2. Switch to TypeScript server for rich visualization
3. Provide both data and charts when possible

### 📈 **Visualization Queries**
- "Create a chart of CPU usage"
- "Generate a PNG report"  
- "Show me trends"

**Response Pattern:**
1. Get data first with `get_chart_data()`
2. Generate visualization with `get_chart_image()`
3. Provide portal link with `get_chart_link()`

### 🔬 **Research Analysis Queries**
- "Analyze funding vs usage"
- "Research profile for University X"
- "Compare awards and usage"

**Response Pattern:**
1. Use NSF integration tools
2. Combine with XDMoD usage data
3. Provide comprehensive analysis

## Critical Parameter Guidelines

### Date Formats
- ✅ Always use YYYY-MM-DD format
- ✅ "2024-01-01" to "2024-01-31"
- ❌ Never use MM/DD/YYYY or other formats

### Realm Selection
- **Jobs**: Basic accounting (cpu_hours, job_count, wait_times)
- **SUPREMM**: Performance data (GPU, memory, network)
- **For GPU metrics**: ALWAYS use SUPREMM realm

### Common Mistakes to Avoid
- ❌ Using Jobs realm for GPU metrics
- ❌ Forgetting required date parameters
- ❌ Not checking dimensions before requesting statistics
- ❌ Assuming personal data is available without authentication

## Error Handling Patterns

### Authentication Errors
```
User gets: "Authentication failed" or "No API token"
AI Response: 
1. Explain authentication is optional for public data
2. Guide through token setup if they want personal data  
3. Offer public data alternatives
4. Use debug_auth_status for troubleshooting
```

### User Not Found Errors
```
User gets: "No users found matching 'John Smith'"
AI Response:
1. Try shorter search terms (just "Smith")
2. Use discover_person_ids to show available names
3. Explain XDMoD name formatting differences
4. Suggest alternative search approaches
```

### No Data Errors
```
User gets: "No data available for specified parameters"
AI Response:
1. Check date ranges are reasonable
2. Verify realm/statistic combination is valid
3. Suggest broader time ranges
4. Offer to check what data is available
```

## Best Practice Examples

### Example 1: Comprehensive CPU Usage Query
```
User: "Show me total CPU usage for March 2024"

AI Response:
1. get_chart_data(realm="Jobs", statistic="total_cpu_hours", start_date="2024-03-01", end_date="2024-03-31")
2. get_chart_image(format="png") for visualization
3. get_chart_link() for portal access
4. Explain the results in context
```

### Example 2: User Discovery and Analysis
```
User: "Find Dr. Smith's computational usage"

AI Response:
1. discover_person_ids(search_term="Smith") - Python server
2. get_user_data_python(user_name="exact_match_found") - Python server  
3. get_chart_data() - TypeScript server for visualization
4. Combine results with funding context if relevant
```

### Example 3: GPU Usage Analysis
```
User: "Show me GPU usage trends"

AI Response:
1. Explain GPU data is in SUPREMM realm
2. get_chart_data(realm="SUPREMM", statistic="gpu_time")
3. get_chart_image() for trend visualization
4. Provide context about GPU vs CPU usage
```

## Authentication Guidance for Users

### When Authentication is NOT Needed
- General usage statistics
- System-wide metrics
- Public data exploration
- Chart generation
- NSF award research

### When Authentication IS Needed  
- Personal usage data ("my usage")
- Individual user lookups
- Account-specific metrics
- Credit/allocation tracking

### Setup Instructions to Provide
```json
{
  "mcpServers": {
    "xdmod-metrics": {
      "command": "node",
      "args": [
        "/path/to/dist/index.js",
        "--api-token",
        "YOUR_TOKEN_HERE"
      ]
    }
  }
}
```

## Troubleshooting Commands

Always suggest these for debugging:

```
"Debug my XDMoD authentication status" - Check auth setup
"What dimensions are available in XDMoD?" - Explore options  
"Discover users in the system" - Find available user data
"Test the XDMoD data framework" - Check Python integration
```

## Response Templates

### For New Users
```
"I can help you access XDMoD computational usage data. Let me first check what metrics are available, then we can explore specific data you're interested in."

[Run get_dimensions()]

"Here are the available metrics categories. What type of usage data are you most interested in?"
```

### For Data Requests
```
"I'll get that usage data for you. Let me pull the information and create a visualization."

[Get data, then create chart]  

"Here's your usage data with a visual chart. I can also provide a direct link to view this interactively in the XDMoD portal."
```

### For Research Queries
```
"I'll analyze the computational usage and combine it with NSF funding context for a comprehensive view."

[Use NSF integration tools]

"This analysis shows both the usage patterns and funding landscape. Would you like me to dive deeper into any specific aspect?"
```

## Quality Indicators

### Good Responses Include:
- ✅ Appropriate server selection
- ✅ Correct parameter formatting  
- ✅ Context and explanation of results
- ✅ Multiple output formats when helpful
- ✅ Portal links for further exploration
- ✅ Clear next steps or related queries

### Avoid:
- ❌ Guessing at parameter values
- ❌ Using wrong realm for metric type
- ❌ Promising personal data without authentication
- ❌ Raw JSON dumps without explanation
- ❌ Ignoring error messages

This guide should be referenced for all XDMoD-related queries to ensure consistent, helpful, and accurate responses.