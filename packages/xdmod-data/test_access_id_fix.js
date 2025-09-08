#!/usr/bin/env node

// Test script to verify ACCESS ID query fixes
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAccessIdQuery() {
    console.log('🧪 Testing ACCESS ID query fix...\n');
    
    const serverPath = path.join(__dirname, 'dist/index.js');
    
    // Test the problematic ACCESS ID that was failing
    const testData = {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
            name: "get_user_data_python",
            arguments: {
                access_id: "yuxiongw",
                start_date: "2024-01-01",
                end_date: "2024-12-31",
                realm: "Jobs",
                statistic: "total_cpu_hours"
            }
        }
    };
    
    console.log('Test payload:', JSON.stringify(testData, null, 2));
    console.log('\nStarting server and sending test request...\n');
    
    const server = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let response = '';
    
    server.stdout.on('data', (data) => {
        response += data.toString();
    });
    
    server.stderr.on('data', (data) => {
        console.error('Server error:', data.toString());
    });
    
    // Send the test request
    server.stdin.write(JSON.stringify(testData) + '\n');
    
    // Wait for response
    setTimeout(() => {
        console.log('Server response:', response);
        server.kill();
        
        // Check if the response indicates success
        if (response.includes('✅') && !response.includes('person_filter')) {
            console.log('\n✅ Test PASSED: ACCESS ID query fix appears successful');
        } else if (response.includes('person_filter')) {
            console.log('\n❌ Test FAILED: Still seeing person_filter errors');
        } else {
            console.log('\n⚠️ Test UNCERTAIN: Check the output above');
        }
    }, 5000);
}

testAccessIdQuery().catch(console.error);