# XDMoD Python MCP Server

A Python-based Model Context Protocol server for accessing XDMoD (XD Metrics on Demand) data using Python's data analytics capabilities for better data manipulation and user-specific queries.

## Features

- **Python Data Analytics**: Uses pandas for data manipulation and analysis
- **User-Specific Queries**: Focused on personal usage data access
- **Clean Data Structures**: Returns structured data instead of complex JSON
- **Enhanced Filtering**: Better name matching and data extraction
- **Framework Integration**: Designed to work with XDMoD's Python data analytics framework

## Installation

```bash
cd /Users/drew/Sites/connectci/access_mcp/packages/xdmod-python
pip install -e .
```

## Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "xdmod-python": {
      "command": "python",
      "args": ["-m", "xdmod_python.server"],
      "env": {
        "XDMOD_API_TOKEN": "your-xdmod-token-here"
      }
    }
  }
}
```

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

- "Debug my Python XDMoD authentication"
- "Get my usage data using the Python server for the last 6 months"
- "Test the XDMoD data analytics framework"

## Comparison with TypeScript Server

This Python server aims to provide:
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