import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function startWebServer(port: number = 3000) {
  const app = express();

  // Serve static files from public directory
  const publicDir = path.join(__dirname, "../../../public");
  app.use(express.static(publicDir));

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      service: "access-mcp-affinity-groups",
      version: "0.3.0",
    });
  });

  // API info endpoint
  app.get("/api", (req, res) => {
    res.json({
      name: "ACCESS-CI Affinity Groups MCP Server",
      version: "0.3.0",
      endpoints: {
        documentation: "/",
        health: "/health",
        api_info: "/api",
      },
      mcp_tools: [
        {
          name: "get_affinity_group",
          description: "Get information about a specific ACCESS-CI affinity group",
        },
        {
          name: "get_affinity_group_events",
          description: "Get events and trainings for a specific ACCESS-CI affinity group",
        },
        {
          name: "get_affinity_group_kb",
          description: "Get knowledge base resources for a specific ACCESS-CI affinity group",
        },
      ],
    });
  });

  const server = app.listen(port, "0.0.0.0", () => {
    console.error(`Web server running on port ${port}`);
  });

  return server;
}
