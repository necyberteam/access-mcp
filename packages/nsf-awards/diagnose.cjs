#!/usr/bin/env node

/**
 * Diagnostic script for NSF Awards MCP Server
 * Run this to test if the server is working correctly
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

console.log("🔍 NSF Awards MCP Server Diagnostic\n");

// Test 1: Check if server file exists
const serverPath = path.join(__dirname, "dist", "index.js");

console.log("1. Checking server files...");
if (!fs.existsSync(serverPath)) {
  console.error("❌ Server not built! Run: npm run build");
  process.exit(1);
}
console.log("✅ Server files exist\n");

// Test 2: Test server startup
console.log("2. Testing server startup...");
const server = spawn("node", [serverPath], {
  stdio: ["pipe", "pipe", "pipe"],
});

let outputBuffer = "";
let errorBuffer = "";

server.stdout.on("data", (data) => {
  outputBuffer += data.toString();
});

server.stderr.on("data", (data) => {
  errorBuffer += data.toString();
});

// Test 3: Send MCP initialization
setTimeout(() => {
  console.log("3. Sending MCP initialization...");
  const initRequest =
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "1.0.0",
        capabilities: {},
        clientInfo: { name: "diagnostic", version: "1.0.0" },
      },
    }) + "\n";

  server.stdin.write(initRequest);
}, 100);

// Test 4: List tools
setTimeout(() => {
  console.log("4. Listing available tools...");
  const listRequest =
    JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    }) + "\n";

  server.stdin.write(listRequest);
}, 500);

// Test 5: Call a tool
setTimeout(() => {
  console.log("5. Testing tool call (get_nsf_award)...");
  const toolRequest =
    JSON.stringify({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "get_nsf_award",
        arguments: { award_number: "2138259" },
      },
    }) + "\n";

  server.stdin.write(toolRequest);
}, 1000);

// Analyze results
setTimeout(() => {
  console.log("\n=== RESULTS ===\n");

  // Parse responses
  const lines = outputBuffer.split("\n").filter((line) => line.trim());
  let initResponse, toolsResponse, callResponse;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.id === 1) initResponse = parsed;
      if (parsed.id === 2) toolsResponse = parsed;
      if (parsed.id === 3) callResponse = parsed;
    } catch (e) {
      // Ignore non-JSON lines
    }
  }

  // Check initialization
  if (initResponse && initResponse.result) {
    console.log("✅ Server initialization: SUCCESS");
    console.log(
      `   Server: ${initResponse.result.serverInfo.name} v${initResponse.result.serverInfo.version}`
    );
  } else {
    console.log("❌ Server initialization: FAILED");
  }

  // Check tools listing
  if (toolsResponse && toolsResponse.result && toolsResponse.result.tools) {
    console.log(`✅ Tools listing: SUCCESS (${toolsResponse.result.tools.length} tools available)`);
    toolsResponse.result.tools.forEach((tool) => {
      console.log(`   - ${tool.name}`);
    });
  } else {
    console.log("❌ Tools listing: FAILED");
  }

  // Check tool call
  if (callResponse && callResponse.result) {
    console.log("✅ Tool call: SUCCESS");
    const text = callResponse.result.content[0].text;
    console.log(`   Response preview: ${text.substring(0, 100)}...`);
  } else if (callResponse && callResponse.error) {
    console.log("❌ Tool call: FAILED");
    console.log(`   Error: ${callResponse.error.message}`);
  } else {
    console.log("❌ Tool call: NO RESPONSE");
  }

  // Check for errors
  if (errorBuffer) {
    console.log("\n⚠️  Server errors detected:");
    console.log(errorBuffer);
  }

  console.log("\n=== CLAUDE DESKTOP CONFIG ===\n");
  console.log("Add this to your claude_desktop_config.json:\n");
  console.log(
    JSON.stringify(
      {
        "nsf-awards": {
          command: "node",
          args: [path.resolve(serverPath)],
        },
      },
      null,
      2
    )
  );

  console.log("\n=== TROUBLESHOOTING ===\n");
  if (!callResponse || !callResponse.result) {
    console.log("The server is not responding correctly. Try:");
    console.log("1. Rebuild the server: npm run build");
    console.log("2. Check Node.js version: node --version (should be v18+)");
    console.log("3. Check for port conflicts");
    console.log("4. Restart Claude Desktop after config changes");
  } else {
    console.log("✅ Server is working correctly locally!");
    console.log('\nIf Claude Desktop still shows "Tool execution failed":');
    console.log("1. Make sure the path in config is absolute and correct");
    console.log("2. Restart Claude Desktop completely (quit and reopen)");
    console.log("3. Check for duplicate server names in config");
    console.log("4. Remove conflicting NSF tools from other servers (like allocations)");
    console.log("5. Try using the full path to node: which node");
  }

  server.kill();
  process.exit(0);
}, 3000);

// Timeout safety
setTimeout(() => {
  console.error("\n❌ Diagnostic timed out");
  server.kill();
  process.exit(1);
}, 5000);
