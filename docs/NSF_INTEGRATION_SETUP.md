# NSF Awards Integration Setup

The allocations server can integrate with the NSF Awards server to cross-reference ACCESS projects with NSF funding data. This enables features like:

- Analyzing funding vs. computational usage patterns
- Finding NSF awards for project PIs
- Institutional research profiles with NSF context
- Funding efficiency analysis

## Setup for Local Development

### 1. Start the NSF Awards HTTP Server

The NSF Awards server needs to run in HTTP mode (not MCP stdio mode) for inter-server communication:

```bash
cd packages/nsf-awards
./start-http-server.sh
```

Or manually:
```bash
cd packages/nsf-awards
PORT=3007 node dist/index.js
```

The server will start on port 3007 by default.

### 2. Configure Environment Variable

When running the allocations server locally, set the environment variable:

```bash
export ACCESS_MCP_SERVICES=nsf-awards=http://localhost:3007
```

Then run the allocations server:
```bash
cd packages/allocations
node dist/index.js
```

### 3. Docker/n8n Setup

For the n8n Docker container to access the NSF server running on your host machine:

**docker-compose.n8n.yml:**
```yaml
services:
  n8n:
    environment:
      - ACCESS_MCP_SERVICES=nsf-awards=http://host.docker.internal:3007
```

**Then:**
1. Start NSF server: `cd packages/nsf-awards && ./start-http-server.sh`
2. Restart n8n container: `docker-compose -f docker-compose.n8n.yml restart`

## Testing NSF Integration

Test that the integration works:

```bash
# With NSF integration enabled
cd packages/allocations
ACCESS_MCP_SERVICES=nsf-awards=http://localhost:3007 node dist/index.js <<EOF
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0"}}}
{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "analyze_funding", "arguments": {"project_id": 59718}}}
EOF
```

Look for **"Total NSF Responses: 7"** (or similar) instead of **"Total NSF Responses: 0"**.

## How It Works

1. **Allocations server** calls `callRemoteServer("nsf-awards", "search_nsf_awards", {personnel: "..."})`
2. **HTTP request** goes to `http://localhost:3007/tools/search_nsf_awards`
3. **NSF server** processes the request and queries `api.nsf.gov`
4. **Response** is returned to allocations server for analysis

## Graceful Degradation

The allocations server works **with or without** NSF integration:

- **With NSF**: Full funding analysis with cross-referenced awards
- **Without NSF**: Basic allocations data only (no errors, just missing NSF context)

## Production Deployment

For production, deploy both servers as HTTP services and configure:

```bash
ACCESS_MCP_SERVICES=nsf-awards=http://nsf-awards-service:3007
```

See docker-compose example for containerized deployment.
