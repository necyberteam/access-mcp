export const servers = [
  {
    "id": "affinity-groups",
    "name": "@access-mcp/affinity-groups",
    "version": "0.1.0",
    "description": "MCP server for ACCESS-CI Affinity Groups API",
    "readme": "# ACCESS-CI Affinity Groups MCP Server\n\nMCP server providing access to ACCESS-CI Affinity Groups API endpoints.\n\n## API Endpoints Covered\n\n- **Affinity Groups**: `/api/1.0/affinity_groups/{group_id}`\n- **Events & Trainings**: `/api/1.1/events/ag/{group_id}`\n- **Knowledge Base**: `/api/1.0/kb/{group_id}`\n\n## Tools\n\n### get_affinity_group\nGet basic information about a specific affinity group.\n\n**Parameters:**\n- `group_id` (string): The affinity group identifier (e.g., \"bridges2.psc.access-ci.org\")\n\n### get_affinity_group_events\nGet events and trainings for a specific affinity group.\n\n**Parameters:**\n- `group_id` (string): The affinity group identifier\n\n### get_affinity_group_kb\nGet knowledge base resources for a specific affinity group.\n\n**Parameters:**\n- `group_id` (string): The affinity group identifier\n\n## Usage\n\n```bash\n# Install and build\nnpm install\nnpm run build\n\n# Start the server\nnpm start\n```\n\nThe server runs on stdio transport and can be integrated with MCP-compatible clients.",
    "main": "dist/index.js",
    "bin": {
      "access-mcp-affinity-groups": "dist/index.js"
    }
  },
  {
    "id": "compute-resources",
    "name": "@access-mcp/compute-resources",
    "version": "0.1.0",
    "description": "MCP server for ACCESS-CI Compute Resources API",
    "readme": "",
    "main": "dist/index.js",
    "bin": {
      "access-mcp-compute-resources": "dist/index.js"
    }
  },
  {
    "id": "system-status",
    "name": "@access-mcp/system-status",
    "version": "0.1.0",
    "description": "MCP server for ACCESS-CI System Status and Outages API",
    "readme": "",
    "main": "dist/index.js",
    "bin": {
      "access-mcp-system-status": "dist/index.js"
    }
  },
  {
    "id": "software-discovery",
    "name": "@access-mcp/software-discovery",
    "version": "0.1.0",
    "description": "ACCESS-CI Software Discovery Service MCP server",
    "readme": "",
    "main": "dist/index.js",
    "bin": {
      "access-mcp-software-discovery": "dist/index.js"
    }
  }
];

export function getServerById(id) {
  return servers.find(server => server.id === id);
}

export function getActiveServers() {
  return servers.filter(server => server.status !== 'planned');
}
