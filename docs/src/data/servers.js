export const servers = [
  {
    "id": "affinity-groups",
    "name": "@access-mcp/affinity-groups",
    "version": "0.2.3",
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
    "version": "0.2.3",
    "description": "MCP server for ACCESS-CI Compute Resources API",
    "readme": "# ACCESS-CI Compute Resources MCP Server\n\nMCP server providing access to ACCESS-CI compute resources information.\n\n## Overview\n\nThis server provides comprehensive information about compute resources available through ACCESS-CI, including hardware specifications, resource status, and detailed configurations.\n\n## Tools\n\n### list_compute_resources\nList all available ACCESS-CI compute resources.\n\n**Parameters:** None\n\n### get_compute_resource\nGet detailed information about a specific compute resource.\n\n**Parameters:**\n- `resource_id` (string): The resource ID or info_groupid (e.g., \"expanse.sdsc.xsede.org\")\n\n### get_resource_hardware\nGet hardware specifications for a compute resource.\n\n**Parameters:**\n- `resource_id` (string): The resource ID or info_groupid\n\n## Resources\n\n- `accessci://compute-resources`: Comprehensive information about all compute resources\n\n## Installation\n\n```bash\nnpm install -g @access-mcp/compute-resources\n```\n\n## Usage\n\nAdd to your Claude Desktop configuration:\n\n```json\n{\n  \"mcpServers\": {\n    \"access-compute-resources\": {\n      \"command\": \"access-mcp-compute-resources\"\n    }\n  }\n}\n```\n\n## API Endpoints\n\nThis server connects to the ACCESS-CI Operations API at `https://operations-api.access-ci.org`\n\n## License\n\nMIT",
    "main": "dist/index.js",
    "bin": {
      "access-mcp-compute-resources": "dist/index.js"
    }
  },
  {
    "id": "system-status",
    "name": "@access-mcp/system-status",
    "version": "0.2.3",
    "description": "MCP server for ACCESS-CI System Status and Outages API",
    "readme": "# ACCESS-CI System Status MCP Server\n\nMCP server providing real-time system status information for ACCESS-CI resources.\n\n## Overview\n\nThis server provides critical operational information about ACCESS-CI systems, including current outages, scheduled maintenance, and system-wide announcements.\n\n## Tools\n\n### get_current_outages\nGet current system outages and issues affecting ACCESS-CI resources.\n\n**Parameters:**\n- `resource_filter` (string, optional): Filter by specific resource name or ID\n\n### get_scheduled_maintenance\nGet scheduled maintenance and future outages for ACCESS-CI resources.\n\n**Parameters:**\n- `resource_filter` (string, optional): Filter by specific resource name or ID\n\n### get_system_announcements\nGet all system announcements (current and scheduled).\n\n**Parameters:**\n- `limit` (number, optional): Maximum number of announcements to return (default: 50)\n\n### get_resource_status\nGet the current operational status of a specific resource.\n\n**Parameters:**\n- `resource_id` (string): The resource ID to check status for\n\n## Resources\n\n- `accessci://system-status`: Current operational status of all ACCESS-CI resources\n\n## Installation\n\n```bash\nnpm install -g @access-mcp/system-status\n```\n\n## Usage\n\nAdd to your Claude Desktop configuration:\n\n```json\n{\n  \"mcpServers\": {\n    \"access-system-status\": {\n      \"command\": \"access-mcp-system-status\"\n    }\n  }\n}\n```\n\n## API Endpoints\n\nThis server connects to the ACCESS-CI Operations API at `https://operations-api.access-ci.org`\n\n## License\n\nMIT",
    "main": "dist/index.js",
    "bin": {
      "access-mcp-system-status": "dist/index.js"
    }
  },
  {
    "id": "software-discovery",
    "name": "@access-mcp/software-discovery",
    "version": "0.2.3",
    "description": "ACCESS-CI Software Discovery Service MCP server",
    "readme": "# ACCESS-CI Software Discovery MCP Server\n\nMCP server providing software discovery and search capabilities for ACCESS-CI resources.\n\n## Overview\n\nThis server enables searching and discovering software packages available across ACCESS-CI compute resources using the Software Discovery Service (SDS) API.\n\n## Tools\n\n### search_software\nSearch for software packages across ACCESS-CI resources.\n\n**Parameters:**\n- `query` (string): Search query for software names or descriptions\n- `resource_filter` (string, optional): Filter results by specific resource ID\n\n### list_software_by_resource\nList all available software packages for a specific ACCESS-CI resource.\n\n**Parameters:**\n- `resource_id` (string): The resource ID (e.g., \"expanse.sdsc.xsede.org\")\n- `limit` (number, optional): Maximum number of results (default: 100)\n\n### get_software_details\nGet detailed information about a specific software package on a resource.\n\n**Parameters:**\n- `software_name` (string): Name of the software package\n- `resource_id` (string): The resource ID where the software is installed\n\n### search_software_by_category\nSearch for software packages by category or domain.\n\n**Parameters:**\n- `category` (string): Software category (e.g., \"bioinformatics\", \"chemistry\", \"physics\")\n- `resource_filter` (string, optional): Filter by specific resource\n\n## Resources\n\n- `accessci://software-catalog`: Comprehensive catalog of available software across all resources\n\n## Installation\n\n```bash\nnpm install -g @access-mcp/software-discovery\n```\n\n## Usage\n\nAdd to your Claude Desktop configuration:\n\n```json\n{\n  \"mcpServers\": {\n    \"access-software-discovery\": {\n      \"command\": \"access-mcp-software-discovery\",\n      \"env\": {\n        \"SDS_API_KEY\": \"your-api-key-here\"\n      }\n    }\n  }\n}\n```\n\n## Environment Variables\n\n- `SDS_API_KEY`: API key for the Software Discovery Service (required)\n\n## API Endpoints\n\nThis server connects to the ACCESS-CI Software Discovery Service at `https://ara-db.ccs.uky.edu`\n\n## License\n\nMIT",
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
