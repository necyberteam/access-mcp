# XDMoD MCP Data Server

A Python-based Model Context Protocol server for accessing XDMoD (XD Metrics on Demand) data using Python's data analytics capabilities for better data manipulation and user-specific queries. Features pandas integration, clean data structures, enhanced filtering, and framework integration with XDMoD's Python data analytics framework.

## Usage Examples

### **Authentication & Debug**

```
"Debug my XDMoD data authentication and check what frameworks are available"
"Test if the official XDMoD data framework is working"
```

### **Personal Usage Data**

```
"Get usage data for my ACCESS ID using the data server"
"Show me CPU hours for my ACCESS ID from January to June 2025"
"What's my computational usage for my ACCESS ID?"
```

### **Data Analytics**

```
"Get my usage data using the official data framework instead of REST API"
"Analyze the team's computational patterns using ACCESS IDs"
"Show me my usage trends for my ACCESS ID over the past 6 months"
```

### **Framework Integration**

```
"Test the XDMoD data analytics framework integration"
"Use pandas to analyze my computational usage patterns"
"Get clean structured data for my research usage"
```

## Installation

**For Claude Desktop (Recommended):**
```bash
# Install pipx if you don't have it
brew install pipx

# Install from local development copy
cd /path/to/access_mcp/packages/xdmod-data
pipx install .

# Or install from GitHub (when published)
pipx install git+https://github.com/necyberteam/access-mcp.git#subdirectory=packages/xdmod-data
```

**For Development:**
```bash
cd /path/to/access_mcp/packages/xdmod-data
python3 -m venv venv
source venv/bin/activate
pip install -e .
pip install xdmod-data  # Install official XDMoD Python framework
```

**Note:** This MCP server requires the official `xdmod-data` package for full functionality. The pipx installation method will automatically install it in an isolated environment.

## Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "xdmod-mcp-data": {
      "command": "xdmod-mcp-data"
    }
  }
}
```

**Note:** After installing with pipx, restart Claude Desktop to detect the new command.

## Tools

### `debug_python_auth`
Debug authentication status and check for XDMoD data analytics framework availability.

### `get_user_data_python`
Get user-specific usage data using Python's data manipulation capabilities.

**Parameters:**
- `user_name`: Name to search for (e.g., "Pasquale")
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `realm`: XDMoD realm (default: "Jobs")
- `statistic`: Statistic to retrieve (default: "total_cpu_hours")

### `test_data_framework`
Test integration with XDMoD's data analytics framework and check availability.

## Usage Examples

Once configured, you can ask Claude:

- "Debug my XDMoD data authentication"
- "Get my usage data using the data server for the last 6 months"
- "Test the XDMoD data analytics framework"

## Comparison with XDMoD Charts Server

This data server aims to provide:
- **Better data manipulation** with pandas
- **Cleaner user data extraction** 
- **More intuitive API** for complex queries
- **Framework integration** when available

## Development

```bash
# Install in development mode
pip install -e ".[dev]"

# Run tests
pytest

# Format code
black src/
```