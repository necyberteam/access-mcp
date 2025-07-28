# Getting Started

Choose your installation method based on your needs:

## 📥 End Users (Download & Run)

**Best for**: Claude Desktop users who want to quickly add ACCESS-CI capabilities

### Step 1: Download
Get the latest release from [GitHub Releases](https://github.com/your-repo/releases)

### Step 2: Extract
Unzip `access-mcp-servers-vX.X.X.zip` to your preferred location

### Step 3: Configure Claude Desktop

Add servers to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

### Step 4: Restart Claude Desktop

That's it! No Node.js knowledge required - everything is pre-built and ready to run.

## 🔧 Developers (npm packages)

**Best for**: Developers building applications or custom integrations

### Install Individual Servers

```bash
# Install globally for command-line use
npm install -g @access-mcp/affinity-groups
npm install -g @access-mcp/compute-resources
npm install -g @access-mcp/system-status
npm install -g @access-mcp/software-discovery

# Or install locally for projects
npm install @access-mcp/affinity-groups
```

### Install from Source

```bash
git clone <repository-url>
cd access_mcp
npm install
npm run build
```

### Configuration

```json
{
  "mcpServers": {
    "access-affinity-groups": {
      "command": "access-mcp-affinity-groups"
    }
  }
}
```

## Next Steps

- [Learn about available servers](/servers/)
- [Configure specific servers](/reference/configuration)
- [Try example queries](/reference/examples)

## Prerequisites

- Node.js 18+ (runtime only for downloaded executables)
- Claude Desktop or MCP-compatible client
- SDS API key (for software discovery server only)