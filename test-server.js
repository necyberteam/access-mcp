#!/usr/bin/env node

// Simple test script to interact with the MCP server
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function testMCPServer() {
  console.log('Testing ACCESS-CI Affinity Groups MCP Server\n');
  
  // Start the server
  const server = spawn('node', ['packages/affinity-groups/dist/index.js'], {
    stdio: ['pipe', 'pipe', 'inherit']
  });

  // Send initialization request
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        resources: {},
        tools: {}
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  console.log('1. Initializing server...');
  server.stdin.write(JSON.stringify(initRequest) + '\n');

  // Wait a moment for initialization
  await setTimeout(1000);

  // List available tools
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list'
  };

  console.log('2. Listing available tools...');
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  await setTimeout(500);

  // Test getting affinity group info
  const testGroupRequest = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'get_affinity_group',
      arguments: {
        group_id: 'bridges2.psc.access-ci.org'
      }
    }
  };

  console.log('3. Testing get_affinity_group tool...');
  server.stdin.write(JSON.stringify(testGroupRequest) + '\n');

  await setTimeout(2000);

  // Test getting events
  const eventsRequest = {
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'get_affinity_group_events',
      arguments: {
        group_id: 'bridges2.psc.access-ci.org'
      }
    }
  };

  console.log('4. Testing get_affinity_group_events tool...');
  server.stdin.write(JSON.stringify(eventsRequest) + '\n');

  // Listen for responses
  server.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach(line => {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          console.log('Server response:', JSON.stringify(response, null, 2));
        } catch (e) {
          console.log('Raw output:', line);
        }
      }
    });
  });

  // Clean up after 10 seconds
  setTimeout(10000).then(() => {
    console.log('\nTest completed. Shutting down server...');
    server.kill();
  });
}

testMCPServer().catch(console.error);