import express from "express";
import path from "path";
import { SystemStatusServer } from "./server.js";

export function startWebServer(port: number = 3000) {
  const app = express();
  new SystemStatusServer();

  // Serve static files from public directory
  const publicDir = path.join(__dirname, "../../../public");
  app.use(express.static(publicDir));

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "access-mcp-system-status" });
  });

  // API endpoint to list tools (for documentation)
  app.get("/api/tools", (req, res) => {
    res.json({
      server: "ACCESS-CI System Status MCP Server",
      version: "0.3.0",
      tools: [
        {
          name: "get_current_outages",
          description: "Get current system outages and issues affecting ACCESS-CI resources",
        },
        {
          name: "get_scheduled_maintenance",
          description: "Get scheduled maintenance and future outages for ACCESS-CI resources",
        },
        {
          name: "get_system_announcements",
          description: "Get all system announcements (current and scheduled)",
        },
        {
          name: "check_resource_status",
          description: "Check the operational status of specific ACCESS-CI resources",
        },
      ],
      resources: [
        {
          uri: "accessci://system-status",
          name: "ACCESS-CI System Status",
          description: "Real-time status of ACCESS-CI infrastructure, outages, and maintenance",
        },
      ],
    });
  });

  // Start server
  app.listen(port, () => {
    console.log(`ACCESS-CI System Status web server running on port ${port}`);
  });
}
