#!/usr/bin/env python3

"""Test script to verify ACCESS ID query fixes"""

import json
import sys
import os
import subprocess

def test_access_id_query():
    print("🧪 Testing ACCESS ID query fix...\n")
    
    # First initialize the server
    init_data = {
        "jsonrpc": "2.0",
        "id": 0,
        "method": "initialize",
        "params": {
            "protocolVersion": "2024-11-05",
            "capabilities": {},
            "clientInfo": {"name": "test-client", "version": "1.0.0"}
        }
    }
    
    # Send initialized notification
    initialized_data = {
        "jsonrpc": "2.0",
        "method": "notifications/initialized",
        "params": {}
    }
    
    # Test the problematic ACCESS ID that was failing
    test_data = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "tools/call",
        "params": {
            "name": "get_user_data_python",
            "arguments": {
                "access_id": "yuxiongw",
                "start_date": "2024-01-01",
                "end_date": "2024-12-31",
                "realm": "Jobs",
                "statistic": "total_cpu_hours"
            }
        }
    }
    
    print("Initialization payload:", json.dumps(init_data, indent=2))
    print("Test payload:", json.dumps(test_data, indent=2))
    print("\nStarting Python server and sending test request...\n")
    
    # Run the Python server
    server_path = os.path.join(os.path.dirname(__file__), "src", "xdmod_python", "server.py")
    
    try:
        # Start server process
        server = subprocess.Popen(
            [sys.executable, server_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Send initialization, initialized notification, and test request
        input_data = (json.dumps(init_data) + '\n' + 
                     json.dumps(initialized_data) + '\n' + 
                     json.dumps(test_data) + '\n')
        stdout, stderr = server.communicate(input=input_data, timeout=30)
        
        print("Server stdout:", stdout)
        if stderr:
            print("Server stderr:", stderr)
        
        # Check if the response indicates success
        if '✅' in stdout and 'person_filter' not in stdout:
            print('\n✅ Test PASSED: ACCESS ID query fix appears successful')
        elif 'person_filter' in stdout:
            print('\n❌ Test FAILED: Still seeing person_filter errors')
        elif 'Available dimensions' in stdout:
            print('\n✅ Test IMPROVED: Now properly investigating dimensions')
        else:
            print('\n⚠️ Test UNCERTAIN: Check the output above')
            
    except subprocess.TimeoutExpired:
        print("⚠️ Test timed out after 30 seconds")
        server.kill()
    except Exception as e:
        print(f"❌ Test error: {e}")

if __name__ == "__main__":
    test_access_id_query()