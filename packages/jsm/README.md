# ACCESS JSM MCP Server

MCP server for creating support tickets in ACCESS Jira Service Management.

## Overview

This server enables AI agents to create support tickets on behalf of users. It connects to the existing ACCESS JSM proxy which handles authentication and field mapping.

## Tools

### `create_support_ticket`

Create a general support ticket for issues with allocations, accounts, software, etc.

### `create_login_ticket`

Create a ticket for login issues - either ACCESS portal or resource provider login problems.

### `report_security_incident`

Report security vulnerabilities or incidents to the ACCESS cybersecurity team.

### `get_ticket_types`

Get information about available ticket types and their categories.

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `JSM_PROXY_URL` | No | Netlify proxy URL (default: `https://access-jsm-api.netlify.app`) |
| `MCP_API_KEY` | Yes | API key for authenticating requests from the agent |
| `PORT` | No | HTTP port for the server |

## Security

This server requires API key authentication. Requests must include:

```
X-Api-Key: <your-api-key>
```

The API key must match the `MCP_API_KEY` environment variable.

## Usage

### With HTTP (Docker/Production)

```bash
PORT=3012 MCP_API_KEY=your-secret npm start
```

### Agent Request Example

```bash
curl -X POST http://localhost:3012/tools/create_support_ticket \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: your-secret" \
  -H "X-Acting-User: jsmith@access-ci.org" \
  -d '{
    "arguments": {
      "summary": "Cannot allocate GPUs on Delta",
      "description": "User is unable to submit GPU jobs. Getting error about quota exceeded.",
      "user_email": "john.smith@university.edu",
      "user_name": "John Smith",
      "access_id": "jsmith",
      "category": "Allocation Question",
      "resource": "Delta"
    }
  }'
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```
