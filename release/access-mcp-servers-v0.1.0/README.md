# ACCESS-CI MCP Servers v0.1.0

This package contains standalone MCP servers for ACCESS-CI APIs.

## Servers Included

- **affinity-groups**: ACCESS-CI Affinity Groups API
- **compute-resources**: ACCESS-CI Compute Resources API  
- **system-status**: ACCESS-CI System Status and Outages API
- **software-discovery**: ACCESS-CI Software Discovery Service API

## Installation

1. Extract this archive to your desired location
2. Each server is in its own directory with a standalone `index.js` file
3. Add servers to your Claude Desktop configuration

## Claude Desktop Configuration

Add entries like this to your Claude Desktop config:

```json
{
  "mcpServers": {
    "access-affinity-groups": {
      "command": "/path/to/affinity-groups/index.js"
    },
    "access-compute-resources": {
      "command": "/path/to/compute-resources/index.js"
    },
    "access-system-status": {
      "command": "/path/to/system-status/index.js"
    },
    "access-software-discovery": {
      "command": "/path/to/software-discovery/index.js",
      "env": {
        "SDS_API_KEY": "your-sds-api-key"
      }
    }
  }
}
```

## Requirements

- Node.js 18 or higher
- For software-discovery server: SDS_API_KEY environment variable

## Documentation

See individual server README files for detailed usage information.
