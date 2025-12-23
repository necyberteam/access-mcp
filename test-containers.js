#!/usr/bin/env node

// Test script to validate MCP containers
import { exec } from "child_process";
import { promisify } from "util";
const execAsync = promisify(exec);

async function testContainer(containerName, port) {
  console.log(`\n=== Testing ${containerName} ===`);

  try {
    // Check if container is running
    const { stdout: status } = await execAsync(
      `docker ps --filter "name=${containerName}" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"`
    );
    console.log("Status:", status.trim() || "Container not found");

    // Check if it has a health endpoint
    if (port) {
      try {
        const { stdout: health } = await execAsync(`curl -s http://localhost:${port}/health`);
        console.log("Health:", health.trim());
      } catch (error) {
        console.log("Health check failed:", error.message);
      }
    }

    // Test MCP protocol directly via stdin/stdout
    try {
      const testMessage = '{"jsonrpc": "2.0", "method": "tools/list", "id": 1}\n';
      const { stdout, stderr } = await execAsync(
        `echo '${testMessage.trim()}' | timeout 5s docker exec -i ${containerName} sh -c 'cd /app && echo "${testMessage.trim()}" | node packages/*/dist/index.js'`
      );
      if (stdout) {
        const response = JSON.parse(stdout.split("\n").find((line) => line.startsWith("{")));
        console.log("MCP Tools:", response.result?.tools?.length || 0, "tools available");
      }
    } catch (error) {
      console.log("MCP test failed:", error.message.split("\n")[0]);
    }
  } catch (error) {
    console.log("Error testing container:", error.message);
  }
}

async function main() {
  console.log("ACCESS MCP Container Test Suite");
  console.log("================================");

  const containers = [
    ["access_mcp-mcp-affinity-groups-1", "3011"],
    ["access_mcp-mcp-allocations-1", "3006"],
    ["access_mcp-mcp-compute-resources-1", "3002"],
    ["access_mcp-mcp-system-status-1", "3003"],
    ["access_mcp-mcp-software-discovery-1", "3004"],
    ["access_mcp-mcp-xdmod-charts-1", "3005"],
    ["access_mcp-mcp-nsf-awards-1", "3007"],
    ["access_mcp-mcp-xdmod-data-1", "3008"],
  ];

  for (const [name, port] of containers) {
    await testContainer(name, port);
  }

  console.log("\n=== Summary ===");
  console.log("Test completed. Check individual container logs with:");
  console.log("docker logs <container_name> --tail 20");
}

main().catch(console.error);
