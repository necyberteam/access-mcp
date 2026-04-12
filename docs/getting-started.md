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

## Logging In

**Most tools work without logging in.** Browsing, searching, and reading data are all available anonymously. You only need to authenticate if you want to **create or manage content** — for example, drafting an announcement or viewing your own draft events.

### Which servers require login?

| Server | Anonymous use | Requires login |
|--------|---------------|----------------|
| Compute Resources | All tools | — |
| System Status | All tools | — |
| Software Discovery | All tools | — |
| XDMoD | All tools | — |
| Allocations | All tools | — |
| NSF Awards | All tools | — |
| Events | All tools | — |
| Announcements | `search_announcements`, `suggest_tags`, `suggest_summary`, `get_announcement_context` | `create_announcement`, `update_announcement`, `delete_announcement`, `get_my_announcements` |
| Affinity Groups | All tools | — |

### How to log in

When you connect a server that supports authentication (currently **Announcements**), Claude will prompt you to authorize via CILogon — the same single sign-on system used by other ACCESS services.

1. After adding the connector, Claude will show a CILogon authorization page in your browser
2. Choose your home institution from the list and sign in with your institutional credentials
3. Approve the authorization
4. Return to Claude — the connector is now authenticated

You can skip this step if you only need read-only access. The server will still work for anonymous tools; you just won't be able to use the management tools.

### Logging out / revoking access

To revoke access for a connector, remove it in **Customize > Connectors** in Claude. The next time you add it, you'll be prompted to log in again.

## Available Servers

All servers are hosted at `https://mcp.access-ci.org`. You can add as many or as few as you need — start with one and add more later.

| Server | Description |
|--------|-------------|
| Compute Resources | Hardware specs, GPU availability, system capabilities |
| System Status | Current outages, maintenance schedules, incidents |
| Software Discovery | Software packages available across ACCESS resources |
| XDMoD | Usage statistics, visualizations, resource utilization |
| Allocations | Research projects and allocation trends |
| NSF Awards | NSF funding data and cross-referencing |
| Events | Workshops, webinars, training sessions |
| Announcements | Community news and updates |
| Affinity Groups | Community groups, events, and knowledge base |

Each server is available at two URLs under `https://mcp.access-ci.org`:

- **Streamable HTTP** (recommended): `/<server-name>/mcp` — for Claude Code and other Streamable HTTP clients
- **SSE** (legacy): `/<server-name>/sse` — for Claude Desktop connectors and older clients

For [XDMoD Data Analytics](#optional-xdmod-data-analytics), see the separate setup section below — it requires a personal API token and works only via Claude Code, not as a Claude.ai connector.

## Quick Start

### Claude Desktop or claude.ai

Add ACCESS servers as connectors. Setup takes about a minute per server.

1. In Claude, open **Customize** (palette/settings icon) > **Connectors**
2. Click **"Add custom connector"**
3. Paste `https://mcp.access-ci.org/compute-resources/sse` into the Server URL box
4. Save and authorize when prompted
5. Repeat for any other servers from the table above

::: tip
You don't need to add all servers at once. Start with one or two that match your needs, then add more later.
:::

**Try it:** Open a chat and ask *"What GPU resources are available on ACCESS-CI?"*

### Claude Code (CLI)

Add all servers with:

```bash
claude mcp add access-compute-resources -t http -s user https://mcp.access-ci.org/compute-resources/mcp
claude mcp add access-system-status -t http -s user https://mcp.access-ci.org/system-status/mcp
claude mcp add access-software-discovery -t http -s user https://mcp.access-ci.org/software-discovery/mcp
claude mcp add access-xdmod -t http -s user https://mcp.access-ci.org/xdmod/mcp
claude mcp add access-allocations -t http -s user https://mcp.access-ci.org/allocations/mcp
claude mcp add access-nsf-awards -t http -s user https://mcp.access-ci.org/nsf-awards/mcp
claude mcp add access-events -t http -s user https://mcp.access-ci.org/events/mcp
claude mcp add access-announcements -t http -s user https://mcp.access-ci.org/announcements/mcp
claude mcp add access-affinity-groups -t http -s user https://mcp.access-ci.org/affinity-groups/mcp
```

Restart Claude Code after adding.

### Other MCP Clients

The Model Context Protocol is supported by a growing number of AI tools beyond Claude. The ACCESS MCP servers should work with any client that supports remote MCP servers.

**Streamable HTTP** (recommended):
```
https://mcp.access-ci.org/<server-name>/mcp
```

**Legacy SSE** (for clients that only support SSE transport):
```
https://mcp.access-ci.org/<server-name>/sse
```

Setup instructions vary by client — refer to each tool's documentation for adding custom MCP servers. Some clients only support local (stdio) MCP servers; for those, you can use `npx mcp-remote <url>` as a stdio-to-SSE bridge.

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
The XDMoD Data server requires a personal API token passed via HTTP header. It works with **Claude Code** and other clients that support Streamable HTTP with custom headers. It is **not compatible with Claude.ai connectors**, because connectors cannot pass per-request authentication headers.
:::

**Get your API token:**

1. Sign in to [xdmod.access-ci.org](https://xdmod.access-ci.org) with your ACCESS credentials
2. Click **My Profile** in the top-right corner
3. Click the **API Token** tab
4. Generate and copy your token

**Add to Claude Code:**
```bash
claude mcp add access-xdmod-data -t http -s user -H "X-XDMoD-Token: your-token-here" https://mcp.access-ci.org/xdmod-data/mcp
```

**Add to other clients with header support** — example stdio config using `mcp-remote`:
```json
"access-xdmod-data": {
  "command": "npx",
  "args": ["mcp-remote", "https://mcp.access-ci.org/xdmod-data/mcp", "--header", "X-XDMoD-Token:your-token-here"]
}
```

---

## Troubleshooting

### "Server disconnected" Error

- Verify the hosted servers are accessible: `curl https://mcp.access-ci.org/compute-resources/health`
- Check your internet connection
- Restart Claude Desktop (fully quit with Cmd+Q, then reopen)

### npm/npx Not Found

If using `npx mcp-remote` (for clients that require a stdio bridge), install [Node.js LTS](https://nodejs.org/) which includes npm and npx. Claude Code connects directly and does not need Node.js.

### Tool Schemas Look Outdated

MCP clients cache tool definitions when they connect. After a server update, you may need to reconnect:

- **Claude Desktop:** Fully quit (Cmd+Q on macOS) and reopen
- **Claude Code:** Restart the CLI

### Connectors Not Showing Up

1. Verify the URL is exactly right (`/mcp` for Streamable HTTP, `/sse` for Claude Desktop connectors)
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

Then connect Claude Code to your local server:

```bash
claude mcp add compute-dev -t http -s user http://localhost:3002/mcp
```

Or for Claude Desktop (requires `npx mcp-remote`):

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

Connect Claude Code using Streamable HTTP:

```bash
claude mcp add access-compute-resources -t http -s user http://YOUR_SERVER_IP:3002/mcp
```

Or configure Claude Desktop (requires `npx mcp-remote`):

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
