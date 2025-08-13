import express from "express";
import path from "path";
import { ComputeResourcesServer } from "./server.js";

export function startWebServer(port: number = 3000) {
  const app = express();
  const server = new ComputeResourcesServer();

  // Serve static files from public directory
  const publicDir = path.join(__dirname, "../../../public");
  app.use(express.static(publicDir));

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "access-mcp-compute-resources" });
  });

  // API endpoint to list tools (for documentation)
  app.get("/api/tools", (req, res) => {
    res.json({
      server: "ACCESS-CI Compute Resources MCP Server",
      version: "0.3.0",
      tools: [
        {
          name: "list_compute_resources",
          description: "List all ACCESS-CI compute resources",
        },
        {
          name: "get_compute_resource",
          description:
            "Get detailed information about a specific compute resource",
        },
        {
          name: "get_resource_hardware",
          description: "Get hardware specifications for a compute resource",
        },
        {
          name: "get_resource_software",
          description: "Get available software for a compute resource",
        },
      ],
      resources: [
        {
          uri: "accessci://compute-resources",
          name: "ACCESS-CI Compute Resources",
          description:
            "Information about ACCESS-CI compute resources, hardware, and software",
        },
      ],
    });
  });

  // Start server
  app.listen(port, () => {
    console.log(
      `ACCESS-CI Compute Resources web server running on port ${port}`,
    );
  });
}
