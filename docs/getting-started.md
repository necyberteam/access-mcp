
# Getting Started

Choose your installation method based on your needs:

## 📦 Recommended: npm Installation

**Best for**: Most users - simple one-command installation

### Step 1: Install All Servers
Install all ACCESS-CI MCP servers with one command:

```bash
npm install -g @access-mcp/affinity-groups @access-mcp/compute-resources @access-mcp/system-status @access-mcp/software-discovery
```

*Note: Global installation (`-g`) is recommended for better performance, but the `npx` configuration below will work even without global installation.*

### Step 2: Configure Claude Desktop

Add servers to your Claude Desktop configuration file.

**Config file locations:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

*Note: Create the file if it doesn't exist.*

```json
{
  "mcpServers": {
    "access-affinity-groups": {
      "command": "npx",
      "args": ["@access-mcp/affinity-groups"]
    },
    "access-compute-resources": {
      "command": "npx",
      "args": ["@access-mcp/compute-resources"]
    },
    "access-system-status": {
      "command": "npx",
      "args": ["@access-mcp/system-status"]
    },
    "access-software-discovery": {
      "command": "npx",
      "args": ["@access-mcp/software-discovery"],
      "env": {
        "SDS_API_KEY": "your-sds-api-key"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

That's it! The commands are now available globally and Claude Desktop can use them.

## 📥 Alternative: GitHub Releases

**Best for**: Users who prefer downloading executables

Get the latest release from [GitHub Releases](https://github.com/necyberteam/access-mcp/releases) and configure with full file paths.

## 🔧 Developers (npm packages)

**Best for**: Developers building applications or custom integrations

### Install Individual or All Servers

```bash
# Install all servers at once
npm install -g @access-mcp/affinity-groups @access-mcp/compute-resources @access-mcp/system-status @access-mcp/software-discovery

# Or install individual servers
npm install -g @access-mcp/affinity-groups

# For local project use
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
      "command": "npx",
      "args": ["@access-mcp/affinity-groups"]
    }
  }
}
```

## Next Steps

- [Learn about available servers](/servers/)

## Prerequisites

- Node.js 18+ (runtime only for downloaded executables)
- Claude Desktop or MCP-compatible client
- SDS API key (for software discovery server only)