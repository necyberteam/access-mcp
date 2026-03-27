# Getting Started

Connect your AI assistant to ACCESS-CI services and start exploring cyberinfrastructure resources. These servers use the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), an open standard supported by Claude Desktop, VS Code, Cursor, Windsurf, and other AI tools.

## Quick Start (Recommended)

Use our hosted servers — no installation required. Just configure your AI tool to connect.

### Claude Desktop Setup

Download [Claude Desktop](https://claude.ai/download) if you don't have it, then open your config file:

| Platform | Config File Location |
|----------|---------------------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

Copy and paste this configuration:

```json
{
  "mcpServers": {
    "access-compute-resources": {
      "type": "streamable-http",
      "url": "https://mcp.access-ci.org/compute-resources/mcp"
    },
    "access-system-status": {
      "type": "streamable-http",
      "url": "https://mcp.access-ci.org/system-status/mcp"
    },
    "access-software-discovery": {
      "type": "streamable-http",
      "url": "https://mcp.access-ci.org/software-discovery/mcp"
    },
    "access-xdmod": {
      "type": "streamable-http",
      "url": "https://mcp.access-ci.org/xdmod/mcp"
    },
    "access-allocations": {
      "type": "streamable-http",
      "url": "https://mcp.access-ci.org/allocations/mcp"
    },
    "access-nsf-awards": {
      "type": "streamable-http",
      "url": "https://mcp.access-ci.org/nsf-awards/mcp"
    },
    "access-announcements": {
      "type": "streamable-http",
      "url": "https://mcp.access-ci.org/announcements/mcp"
    },
    "access-events": {
      "type": "streamable-http",
      "url": "https://mcp.access-ci.org/events/mcp"
    },
    "access-affinity-groups": {
      "type": "streamable-http",
      "url": "https://mcp.access-ci.org/affinity-groups/mcp"
    }
  }
}
```

No additional software required — Claude Desktop connects directly to the hosted servers.

### 3. Restart and Test

Restart Claude Desktop, then try asking:

> "What GPU resources are available on ACCESS-CI?"

### Other MCP Clients

These servers work with any MCP-compatible client that supports Streamable HTTP. The connection URL pattern is:

```
https://mcp.access-ci.org/<server-name>/mcp
```

## Available Servers

All servers are hosted at `https://mcp.access-ci.org`:

| Server | Endpoint | Description |
|--------|----------|-------------|
| Compute Resources | `/compute-resources/mcp` | Hardware specifications and capabilities |
| System Status | `/system-status/mcp` | Outages and maintenance schedules |
| Software Discovery | `/software-discovery/mcp` | Software packages across resources |
| XDMoD | `/xdmod/mcp` | Usage statistics, visualizations, and metadata discovery |
| Allocations | `/allocations/mcp` | Research projects and allocations |
| NSF Awards | `/nsf-awards/mcp` | NSF funding data |
| XDMoD Data | `/xdmod-data/mcp` | Data analytics for jobs, allocations, cloud usage, and resource metrics (requires API token) |
| Announcements | `/announcements/mcp` | Community news and updates |
| Events | `/events/mcp` | Workshops, webinars, training |
| Affinity Groups | `/affinity-groups/mcp` | Community groups and knowledge base |

All endpoints are at `https://mcp.access-ci.org`.

### Optional: XDMoD Data Analytics

The servers above work without any setup beyond copy-pasting the config. The **XDMoD Data** server is different — it provides deep analytics across jobs, allocations, cloud usage, resource specifications, and more using the XDMoD data analytics framework. It requires a personal API token.

To set it up:

1. Sign in to [xdmod.access-ci.org](https://xdmod.access-ci.org) with your ACCESS credentials
2. Click **My Profile** in the top-right corner
3. Click the **API Token** tab
4. Generate and copy your token

Then add this to your `mcpServers` config, replacing `your-token-here` with your token:

```json
"access-xdmod-data": {
  "type": "streamable-http",
  "url": "https://mcp.access-ci.org/xdmod-data/mcp",
  "headers": {
    "X-XDMoD-Token": "your-token-here"
  }
}
```

---

## For Developers

Want to contribute or extend the MCP servers? Set up a local development environment.

### Clone and Build

```bash
git clone https://github.com/necyberteam/access-mcp.git
cd access-mcp
npm install        # Install all workspace dependencies
npm run build      # Build all packages
```

**Note:** The `xdmod-mcp-data` package requires Python 3.11+. See its [README](https://github.com/necyberteam/access-mcp/tree/main/packages/xdmod-mcp-data) for setup instructions.

### Run Tests

```bash
npm test                  # Unit tests
npm run test:integration  # Integration tests (requires API access)
npm run test:all          # All tests
```

### Project Structure

```
access-mcp/
├── packages/
│   ├── shared/              # Base classes and utilities
│   ├── affinity-groups/     # Affinity Groups API server
│   ├── allocations/         # Allocations API server
│   ├── announcements/       # Announcements API server
│   ├── compute-resources/   # Compute Resources API server
│   ├── events/              # Events API server
│   ├── nsf-awards/          # NSF Awards API server
│   ├── software-discovery/  # Software Discovery API server
│   ├── system-status/       # System Status API server
│   ├── xdmod/               # XDMoD public data server
│   └── xdmod-mcp-data/      # XDMoD Data server (Python)
├── docs/                    # This documentation site
└── scripts/                 # Build and deployment scripts
```

### Test Local Changes

Run a server locally and connect Claude Desktop to it:

```bash
# Start a server in HTTP mode (use production port for consistency)
PORT=3002 node packages/compute-resources/dist/index.js
```

Then configure Claude Desktop to use your local server:

```json
{
  "mcpServers": {
    "access-compute-resources-dev": {
      "type": "streamable-http",
      "url": "http://localhost:3002/mcp"
    }
  }
}
```

---

## Self-Hosting (Docker)

Organizations can run their own instance of the MCP servers using Docker.

### Using Pre-built Images

Images are published to GitHub Container Registry on every push to `main`.

1. **Create deployment directory:**
   ```bash
   mkdir ~/access-mcp && cd ~/access-mcp
   ```

2. **Download compose file:**
   ```bash
   curl -o docker-compose.yml https://raw.githubusercontent.com/necyberteam/access-mcp/main/docker-compose.prod.yml
   ```

3. **Create environment file:**
   ```bash
   cat > .env << 'EOF'
   GITHUB_REPOSITORY=necyberteam/access-mcp
   SDS_API_KEY=your-sds-api-key-here
   XDMOD_API_TOKEN=your-xdmod-api-token-here
   ACCESS_MCP_SERVICES=nsf-awards=http://mcp-nsf-awards:3000
   EOF
   ```

4. **Start services:**
   ```bash
   docker login ghcr.io -u YOUR_GITHUB_USERNAME
   docker compose pull
   docker compose up -d
   ```

### Connect to Your Deployment

Update the Claude Desktop config to point to your server:

```json
{
  "mcpServers": {
    "access-compute-resources": {
      "type": "streamable-http",
      "url": "http://YOUR_SERVER_IP:3002/mcp"
    }
  }
}
```

Replace `YOUR_SERVER_IP` with your server's hostname or IP. Ensure firewall allows ports 3002-3012.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_REPOSITORY` | Yes | Repository path for image pulls |
| `SDS_API_KEY` | For software-discovery | Software Discovery Service API key |
| `XDMOD_API_TOKEN` | Optional | XDMoD API token for enhanced features |
| `ACCESS_MCP_SERVICES` | For NSF integration | Inter-service communication endpoints |

### Automated Deployment

The repository includes GitHub Actions for CI/CD. Configure these secrets for automated deployment:

- `PRODUCTION_HOST` - Server hostname or IP
- `PRODUCTION_SSH_KEY` - SSH private key for deployment

See `.github/workflows/deploy-production.yml` for details.

---

## Troubleshooting

### "Server disconnected" Error

- Verify the hosted servers are accessible: `curl https://mcp.access-ci.org/compute-resources/health`
- Check your internet connection
- Restart Claude Desktop

### npm/npx Not Found

Install [Node.js LTS](https://nodejs.org/) which includes npm and npx.

**macOS (Homebrew):**
```bash
brew install node
```

**Windows:**
```powershell
winget install OpenJS.NodeJS.LTS
```

### Claude Desktop Not Finding Servers

1. Verify config file is valid JSON (use a JSON validator)
2. Check the config file location is correct for your platform
3. Restart Claude Desktop completely (quit and reopen)
4. Check Claude Desktop logs for error messages

## Next Steps

- [Learn about available servers](/servers/)
- [View on GitHub](https://github.com/necyberteam/access-mcp)
