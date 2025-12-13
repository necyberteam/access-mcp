# Getting Started

Connect Claude Desktop to ACCESS-CI MCP servers and start exploring cyberinfrastructure resources.

## Quick Start (Recommended)

Use our hosted servers - no installation required beyond Claude Desktop.

### 1. Install Claude Desktop

Download and install [Claude Desktop](https://claude.ai/download) for macOS or Windows.

### 2. Configure Claude Desktop

Open your Claude Desktop config file:

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
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3002/sse"]
    },
    "access-system-status": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3003/sse"]
    },
    "access-software-discovery": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3004/sse"]
    },
    "access-xdmod-charts": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3005/sse"]
    },
    "access-allocations": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3006/sse"]
    },
    "access-nsf-awards": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3007/sse"]
    },
    "access-xdmod-data": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3008/sse"]
    },
    "access-announcements": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3009/sse"]
    },
    "access-events": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3010/sse"]
    },
    "access-affinity-groups": {
      "command": "npx",
      "args": ["mcp-remote", "http://45.79.215.140:3011/sse"]
    }
  }
}
```

### 3. Restart and Test

Restart Claude Desktop, then try asking:

> "What GPU resources are available on ACCESS-CI?"

Claude will query the MCP servers and provide information about available resources.

## Available Servers

All servers are available through the hosted configuration above:

| Server | Port | Description |
|--------|------|-------------|
| Compute Resources | 3002 | Hardware specifications and capabilities |
| System Status | 3003 | Outages and maintenance schedules |
| Software Discovery | 3004 | Software packages across resources |
| XDMoD Charts | 3005 | Usage statistics and visualizations |
| Allocations | 3006 | Research projects and allocations |
| NSF Awards | 3007 | NSF funding data |
| XDMoD Data | 3008 | Python analytics for XDMoD |
| Announcements | 3009 | Community news and updates |
| Events | 3010 | Workshops, webinars, training |
| Affinity Groups | 3011 | Community groups and knowledge base |

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
│   ├── xdmod-charts/        # XDMoD Charts server
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
      "command": "npx",
      "args": ["mcp-remote", "http://localhost:3002/sse"]
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
      "command": "npx",
      "args": ["mcp-remote", "http://YOUR_SERVER_IP:3002/sse"]
    }
  }
}
```

Replace `YOUR_SERVER_IP` with your server's hostname or IP. Ensure firewall allows ports 3002-3011.

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

- Verify the hosted servers are accessible: `curl http://45.79.215.140:3002/health`
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
