#!/usr/bin/env python3

import json
import os
import sys
import subprocess
import time

def test_access_id_query():
    print("🧪 Testing ACCESS ID query with manual CSV parsing fix...")
    
    # Set up environment variables from Claude Desktop config
    os.environ['XDMOD_API_TOKEN'] = '730.d37cbdbe5018956adeb9a11428ce5022442f6b229f679d407c75c40d8926641e'
    os.environ['ACCESS_MCP_SERVICES'] = 'nsf-awards=http://localhost:3002'
    os.environ['XDMOD_HOST'] = 'https://xdmod.access-ci.org'
    
    # Test data
    test_requests = [
        {
            "jsonrpc": "2.0",
            "id": 0,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "test-client", "version": "1.0.0"}
            }
        },
        {
            "jsonrpc": "2.0", 
            "method": "notifications/initialized",
            "params": {}
        },
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "get_user_data_python",
                "arguments": {
                    "access_id": "apasquale",
                    "start_date": "2025-01-01", 
                    "end_date": "2025-12-31",
                    "realm": "Jobs",
                    "statistic": "total_cpu_hours"
                }
            }
        }
    ]
    
    # Create input for server
    input_data = '\n'.join(json.dumps(req) for req in test_requests) + '\n'
    
    print("Test input:")
    print(input_data)
    print("\n" + "="*50 + "\n")
    
    # Run the server
    server_path = os.path.join(os.path.dirname(__file__), "src", "xdmod_python", "server.py")
    
    try:
        server = subprocess.run(
            [sys.executable, server_path],
            input=input_data,
            text=True,
            capture_output=True,
            timeout=30
        )
        
        print("Server stdout:")
        print(server.stdout)
        
        if server.stderr:
            print("Server stderr:")
            print(server.stderr)
            
        print(f"Return code: {server.returncode}")
        
        # Check if we got the expected result
        if "Found data:" in server.stdout and "23.6156" in server.stdout:
            print("\n✅ SUCCESS: Found expected usage data!")
        elif "No usage data found" in server.stdout:
            print("\n⚠️  INFO: No data found (expected for some time periods)")  
        elif "❌" in server.stdout:
            print("\n❌ ERROR: Server reported an error")
        else:
            print("\n❓ UNCLEAR: Check output above")
            
    except subprocess.TimeoutExpired:
        print("❌ Test timed out")
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    test_access_id_query()