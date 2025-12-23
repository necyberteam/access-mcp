#!/usr/bin/env node

import { spawn } from "child_process";
import { createInterface } from "readline";

// Simulate Claude Desktop calling with API token as argument
const args = process.argv.slice(2);
const tokenIndex = args.indexOf("--api-token");
const token =
  tokenIndex !== -1 && args[tokenIndex + 1] ? args[tokenIndex + 1] : process.env.XDMOD_API_TOKEN;

if (!token) {
  console.log(
    "No API token provided. Use --api-token <token> or set XDMOD_API_TOKEN environment variable"
  );
  process.exit(1);
}

console.log("Testing XDMoD authenticated features...\n");
console.log(`Token length: ${token.length} characters`);
console.log(`Token preview: ${token.substring(0, 8)}...${token.substring(token.length - 4)}\n`);

// Start the server with the token
const server = spawn("node", ["dist/index.js", "--api-token", token], {
  stdio: ["pipe", "pipe", "pipe"],
});

const rl = createInterface({
  input: server.stdout,
  output: process.stdout,
  terminal: false,
});

let testIndex = 0;
const tests = [
  {
    name: "debug_auth_status",
    request: {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "debug_auth_status",
        arguments: {},
      },
      id: 1,
    },
  },
  {
    name: "get_user_group_bys",
    request: {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "get_user_group_bys",
        arguments: {
          realm: "Jobs",
        },
      },
      id: 2,
    },
  },
  {
    name: "get_my_usage",
    request: {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "get_my_usage",
        arguments: {},
      },
      id: 3,
    },
  },
  {
    name: "lookup_person_id",
    request: {
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "lookup_person_id",
        arguments: {
          search_term: "Smith",
        },
      },
      id: 4,
    },
  },
];

function runNextTest() {
  if (testIndex >= tests.length) {
    console.log("\n✅ All tests completed!");
    server.kill();
    process.exit(0);
  }

  const test = tests[testIndex++];
  console.log(`\nTesting: ${test.name}`);
  server.stdin.write(JSON.stringify(test.request) + "\n");
}

rl.on("line", (line) => {
  try {
    const response = JSON.parse(line);
    if (response.result) {
      console.log("✓ Success");
      if (response.result.content && response.result.content[0]) {
        const data = JSON.parse(response.result.content[0].text);

        // Show relevant info based on test
        const testName = tests[testIndex - 1].name;
        if (testName === "debug_auth_status") {
          console.log(`  Authenticated: ${data.isAuthenticated}`);
          console.log(`  Token present: ${data.tokenPresent}`);
          console.log(`  Token length: ${data.tokenLength || "N/A"}`);
        } else if (testName === "get_user_group_bys") {
          console.log(`  Found ${data.userRelatedGroupBys?.length || 0} user-related group_bys`);
          if (data.userRelatedGroupBys?.length > 0) {
            console.log(
              `  Examples: ${data.userRelatedGroupBys
                .slice(0, 3)
                .map((g) => g.text)
                .join(", ")}`
            );
          }
        } else if (testName === "get_my_usage") {
          console.log(`  Status: ${data.status || "Unknown"}`);
          if (data.message) console.log(`  Message: ${data.message}`);
          if (data.usage_summary) {
            console.log(`  Usage data available: Yes`);
            console.log(`  Total CPU hours: ${data.usage_summary.total_cpu_hours || "N/A"}`);
          }
        } else if (testName === "lookup_person_id") {
          console.log(`  Found ${data.results?.length || 0} matching persons`);
        }
      }
    } else if (response.error) {
      console.log("✗ Error:", response.error.message);
    }

    // Run next test
    setTimeout(runNextTest, 500);
  } catch (e) {
    // Ignore non-JSON lines
  }
});

server.on("error", (error) => {
  console.error("Server error:", error);
  process.exit(1);
});

server.stderr.on("data", (data) => {
  console.error("Server stderr:", data.toString());
});

// Start tests
console.log("Starting tests...");
runNextTest();
