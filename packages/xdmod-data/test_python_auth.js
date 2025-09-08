#!/usr/bin/env node

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// Use the API token provided by the user
const token = '730.d37cbdbe5018956adeb9a11428ce5022442f6b229f679d407c75c40d8926641e';

console.log('Testing XDMoD Python server fixes...\n');
console.log(`Token length: ${token.length} characters`);
console.log(`Token preview: ${token.substring(0, 8)}...${token.substring(token.length - 4)}\n`);

// Start the Python server with the token and proper Python path
const server = spawn('/Users/drew/Sites/connectci/access_mcp/packages/xdmod-python/venv/bin/python', ['-m', 'xdmod_python.server'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { 
    ...process.env, 
    XDMOD_API_TOKEN: token,
    PYTHONPATH: '/Users/drew/Sites/connectci/access_mcp/packages/xdmod-python/src'
  }
});

const rl = createInterface({
  input: server.stdout,
  output: process.stdout,
  terminal: false
});

let testIndex = 0;
let initialized = false;
const tests = [
  {
    name: 'discover_person_ids (no search)',
    request: {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'discover_person_ids',
        arguments: { limit: 5 }
      },
      id: 1
    }
  },
  {
    name: 'discover_person_ids (search)',
    request: {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'discover_person_ids',
        arguments: { search_term: 'smith', limit: 3 }
      },
      id: 2
    }
  },
  {
    name: 'get_user_data_python',
    request: {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'get_user_data_python',
        arguments: {
          user_name: 'smith',
          start_date: '2024-01-01',
          end_date: '2024-01-31'
        }
      },
      id: 3
    }
  }
];

// Initialize the MCP server first
function initializeServer() {
  const initRequest = {
    jsonrpc: '2.0',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    },
    id: 'init'
  };
  
  server.stdin.write(JSON.stringify(initRequest) + '\n');
}

function runNextTest() {
  if (!initialized) {
    console.log('Initializing MCP server...');
    initializeServer();
    return;
  }
  
  if (testIndex >= tests.length) {
    console.log('\n✅ All tests completed!');
    server.kill();
    process.exit(0);
  }
  
  const test = tests[testIndex++];
  console.log(`\nTesting: ${test.name}`);
  server.stdin.write(JSON.stringify(test.request) + '\n');
}

rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    
    // Handle initialization response
    if (response.id === 'init' && !response.error) {
      console.log('✅ MCP server initialized');
      // Send initialized notification
      const notifiedRequest = {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {}
      };
      server.stdin.write(JSON.stringify(notifiedRequest) + '\n');
      initialized = true;
      setTimeout(runNextTest, 1000);
      return;
    }
    
    if (response.result) {
      console.log('✓ Success');
      if (response.result.content && response.result.content[0]) {
        const text = response.result.content[0].text;
        const testName = tests[testIndex - 1].name;
        
        if (testName.includes('discover_person_ids')) {
          // Check if we're getting real usernames instead of just "label"
          if (text.includes('**Matching users') || text.includes('**Sample users')) {
            console.log('  ✓ Person discovery appears to be working');
            if (text.includes('label')) {
              console.log('  ⚠️  Still contains "label" - may need further debugging');
            }
            // Extract first few usernames for verification
            const lines = text.split('\n');
            const userLines = lines.filter(line => line.includes('• **') || line.includes('• '));
            if (userLines.length > 0) {
              console.log(`  Found users: ${userLines.slice(0, 3).join(', ').replace(/[•*]/g, '').trim()}`);
            }
          }
        } else if (testName === 'get_user_data_python') {
          if (text.includes('Authentication failed') || text.includes('❌')) {
            console.log('  ❌ Authentication still failing');
            if (text.includes('HTTP')) {
              const httpMatch = text.match(/HTTP (\d+)/);
              if (httpMatch) {
                console.log(`  Status: ${httpMatch[1]}`);
              }
            }
          } else if (text.includes('✅') || text.includes('Success')) {
            console.log('  ✓ Authentication appears successful');
            if (text.includes('Total users found:')) {
              const userMatch = text.match(/Total users found: (\d+)/);
              if (userMatch) {
                console.log(`  Total users: ${userMatch[1]}`);
              }
            }
          }
        }
        
        // Always show the first few lines of actual output for debugging
        const firstLines = text.split('\n').slice(0, 5).join('\n');
        console.log(`  Output preview:\n${firstLines}...`);
      }
    } else if (response.error) {
      console.log('✗ Error:', response.error.message);
    }
    
    // Run next test
    setTimeout(runNextTest, 1000);
  } catch (e) {
    // Ignore non-JSON lines
  }
});

server.on('error', (error) => {
  console.error('Server error:', error);
  process.exit(1);
});

server.stderr.on('data', (data) => {
  console.error('Server stderr:', data.toString());
});

// Start tests
console.log('Starting tests...');
runNextTest();