# Getting Started

Connect your AI assistant to ACCESS-CI services and start exploring cyberinfrastructure resources. These servers use the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), an open standard supported by Claude and other AI tools.

## What You Get

Once connected, you can ask your AI questions like:

- *"What GPU resources are available on ACCESS-CI?"*
- *"Are there any current outages or upcoming maintenance on Delta?"*
- *"Show me upcoming workshops on parallel computing"*
- *"What machine learning software is available on Anvil?"*
- *"What NSF-funded projects are doing work in quantum computing?"*

Your AI queries the relevant ACCESS services and gives you a synthesized answer — no need to navigate multiple websites or APIs.

## Authentication

**Most tools work without logging in.** Browsing, searching, and reading data are all available anonymously.

Authentication is only needed if you want to **create or manage content** — for example, drafting an announcement or managing your own events. When needed, Claude will prompt you to log in via CILogon using your ACCESS credentials. You can skip this step if you only need read-only access.

## Available Servers

All servers are hosted at `https://mcp.access-ci.org`. You can add as many or as few as you need — start with one and add more later.

| Server | URL | Description |
|--------|-----|-------------|
| Compute Resources | `https://mcp.access-ci.org/compute-resources/sse` | Hardware specs, GPU availability, system capabilities |
| System Status | `https://mcp.access-ci.org/system-status/sse` | Current outages, maintenance schedules, incidents |
| Software Discovery | `https://mcp.access-ci.org/software-discovery/sse` | Software packages available across ACCESS resources |
| XDMoD | `https://mcp.access-ci.org/xdmod/sse` | Usage statistics, visualizations, resource utilization |
| Allocations | `https://mcp.access-ci.org/allocations/sse` | Research projects and allocation trends |
| NSF Awards | `https://mcp.access-ci.org/nsf-awards/sse` | NSF funding data and cross-referencing |
| Events | `https://mcp.access-ci.org/events/sse` | Workshops, webinars, training sessions |
| Announcements | `https://mcp.access-ci.org/announcements/sse` | Community news and updates |
| Affinity Groups | `https://mcp.access-ci.org/affinity-groups/sse` | Community groups, events, and knowledge base |

For [XDMoD Data Analytics](#optional-xdmod-data-analytics), see the separate setup section below — it requires a personal API token and works only via Claude Code, not as a Claude.ai connector.

## Quick Start

### Claude Desktop or claude.ai

Add ACCESS servers as connectors. Setup takes about a minute per server.

1. In Claude, open **Customize** (palette/settings icon) > **Connectors**
2. Click **"Add custom connector"**
3. Paste a server URL from the table above (start with `https://mcp.access-ci.org/compute-resources/sse`)
4. Save and authorize when prompted
5. Repeat for any other servers you want

::: tip
You don't need to add all servers at once. Start with one or two that match your needs, then add more later.
:::

**Try it:** Open a chat and ask *"What GPU resources are available on ACCESS-CI?"*

### Claude Code (CLI)

Requires [Node.js](https://nodejs.org/) 20+. Add all servers with:

```bash
claude mcp add access-compute-resources -s user -- npx mcp-remote https://mcp.access-ci.org/compute-resources/sse
claude mcp add access-system-status -s user -- npx mcp-remote https://mcp.access-ci.org/system-status/sse
claude mcp add access-software-discovery -s user -- npx mcp-remote https://mcp.access-ci.org/software-discovery/sse
claude mcp add access-xdmod -s user -- npx mcp-remote https://mcp.access-ci.org/xdmod/sse
claude mcp add access-allocations -s user -- npx mcp-remote https://mcp.access-ci.org/allocations/sse
claude mcp add access-nsf-awards -s user -- npx mcp-remote https://mcp.access-ci.org/nsf-awards/sse
claude mcp add access-events -s user -- npx mcp-remote https://mcp.access-ci.org/events/sse
claude mcp add access-announcements -s user -- npx mcp-remote https://mcp.access-ci.org/announcements/sse
claude mcp add access-affinity-groups -s user -- npx mcp-remote https://mcp.access-ci.org/affinity-groups/sse
```

Restart Claude Code after adding.

### Other MCP Clients

The Model Context Protocol is supported by a growing number of AI tools beyond Claude. The ACCESS MCP servers should work with any client that supports remote MCP servers over SSE or Streamable HTTP transport.

The connection URL pattern is the same for all clients:

```
https://mcp.access-ci.org/<server-name>/sse
```

Setup instructions vary by client — refer to each tool's documentation for adding custom MCP servers. Some clients only support local (stdio) MCP servers; for those, you can use `npx mcp-remote <url>` as a stdio-to-SSE bridge (the same approach used by [Claude Code](#claude-code-cli) above).

We've focused our testing on Claude. If you successfully connect another client — or run into trouble — we'd love to hear about it. [Open a support ticket](https://support.access-ci.org/help-ticket) so we can improve the docs or address compatibility gaps.

## Try These Queries

Once connected, ask your AI questions like:

**Resources & hardware:**
- *"What GPU resources are available on ACCESS-CI?"*
- *"Show me the hardware specs for Delta"*
- *"Which systems support NVIDIA A100 GPUs?"*

**System status:**
- *"Are there any current outages?"*
- *"What maintenance is scheduled this week?"*

**Software:**
- *"Is TensorFlow available on Anvil?"*
- *"What Python ML libraries are installed on DeltaAI?"*

**Events & training:**
- *"Show me upcoming workshops on parallel computing"*
- *"What training events are happening this month?"*

**Allocations & research:**
- *"What research projects use GPU resources?"*
- *"Find allocations related to climate modeling"*

**NSF funding:**
- *"What NSF-funded projects are doing work in quantum computing?"*
- *"Show NSF awards for the University of Michigan"*

## Optional: XDMoD Data Analytics

The **XDMoD Data** server provides deep analytics across jobs, allocations, cloud usage, resource specifications, and more using the XDMoD data analytics framework. It requires a personal API token.

::: warning Compatibility note
The XDMoD Data server **only works with Claude Code or other clients that can pass HTTP headers** (via the `mcp-remote --header` flag or stdio). It is **not compatible with Claude.ai connectors**, because the SSE transport used by connectors cannot pass per-request authentication headers.
:::

**Get your API token:**

1. Sign in to [xdmod.access-ci.org](https://xdmod.access-ci.org) with your ACCESS credentials
2. Click **My Profile** in the top-right corner
3. Click the **API Token** tab
4. Generate and copy your token

**Add to Claude Code:**
```bash
claude mcp add access-xdmod-data -s user -- npx mcp-remote https://mcp.access-ci.org/xdmod-data/sse --header "X-XDMoD-Token:your-token-here"
```

**Add to other clients with header support** — example config:
```json
"access-xdmod-data": {
  "command": "npx",
  "args": ["mcp-remote", "https://mcp.access-ci.org/xdmod-data/sse", "--header", "X-XDMoD-Token:your-token-here"]
}
```

---

## Troubleshooting

### "Server disconnected" Error

- Verify the hosted servers are accessible: `curl https://mcp.access-ci.org/compute-resources/health`
- Check your internet connection
- Restart Claude Desktop (fully quit with Cmd+Q, then reopen)

### npm/npx Not Found (for Claude Code)

Install [Node.js LTS](https://nodejs.org/) which includes npm and npx.

**macOS (Homebrew):**
```bash
brew install node
```

**Windows:**
```powershell
winget install OpenJS.NodeJS.LTS
```

### Tool Schemas Look Outdated

MCP clients cache tool definitions when they connect. After a server update, you may need to reconnect:

- **Claude Desktop:** Fully quit (Cmd+Q on macOS) and reopen
- **Claude Code:** Restart the CLI

### Connectors Not Showing Up

1. Verify the URL is exactly right (including the `/sse` suffix)
2. Check that the connector was authorized after adding
3. Restart Claude completely

## Next Steps

- [Browse all servers and tools](/servers/)
- [View on GitHub](https://github.com/necyberteam/access-mcp)
- [Self-hosting guide](#self-hosting-docker) (Docker deployment for organizations)

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

### Test Local Changes

Run a server locally and connect Claude Desktop to it:

```bash
# Start a server in HTTP mode
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

Replace `YOUR_SERVER_IP` with your server's hostname or IP. Each MCP server runs on its own port (3002–3012); see `docker-compose.prod.yml` for the full mapping.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_REPOSITORY` | Yes | Repository path for image pulls |
| `SDS_API_KEY` | For software-discovery | Software Discovery Service API key |
| `XDMOD_API_TOKEN` | For xdmod-data | XDMoD API token (see [XDMoD Data server docs](/servers/xdmod-mcp-data) for setup and per-user token plans) |
| `ACCESS_MCP_SERVICES` | For NSF integration | Inter-service communication endpoints |

### Automated Deployment

The repository includes GitHub Actions for CI/CD. Configure these secrets for automated deployment:

- `PRODUCTION_HOST` - Server hostname or IP
- `PRODUCTION_SSH_KEY` - SSH private key for deployment

See `.github/workflows/deploy-production.yml` for details.
