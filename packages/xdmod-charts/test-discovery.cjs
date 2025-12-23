#!/usr/bin/env node

// Test script for person ID discovery
const { spawn } = require("child_process");

const mcpServer = spawn("node", ["dist/index.js"], {
  stdio: ["pipe", "pipe", "pipe"],
});

// Initialize the MCP server
const initMessage = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {
      roots: {
        listChanged: true,
      },
    },
    clientInfo: {
      name: "test-client",
      version: "1.0.0",
    },
  },
};

// Test discovery call
const discoveryMessage = {
  jsonrpc: "2.0",
  id: 2,
  method: "tools/call",
  params: {
    name: "discover_person_ids",
    arguments: {},
  },
};

// Helper function to send JSON message
function sendMessage(message) {
  const jsonString = JSON.stringify(message);
  mcpServer.stdin.write(jsonString + "\n");
}

let responseCount = 0;
mcpServer.stdout.on("data", (data) => {
  const response = data.toString().trim();
  console.log("Server Response:", response);

  responseCount++;

  if (responseCount === 1) {
    // After initialization, send the discovery call
    console.log("\n--- Sending person ID discovery call ---");
    sendMessage(discoveryMessage);
  } else if (responseCount === 2) {
    // After discovery response, exit
    mcpServer.kill();
    process.exit(0);
  }
});

mcpServer.stderr.on("data", (data) => {
  console.error("Server Error:", data.toString());
});

mcpServer.on("close", (code) => {
  console.log(`\nMCP server process exited with code ${code}`);
  process.exit(code);
});

// Start the test
console.log("--- Initializing MCP server ---");
sendMessage(initMessage);

// Timeout after 45 seconds (discovery might take longer)
setTimeout(() => {
  console.log("Test timeout - killing server");
  mcpServer.kill();
  process.exit(1);
}, 45000);
