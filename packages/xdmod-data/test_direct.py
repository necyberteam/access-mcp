#!/usr/bin/env python3

import os
import sys
import asyncio
sys.path.insert(0, 'src')

# Set API token
os.environ['XDMOD_API_TOKEN'] = '730.d37cbdbe5018956adeb9a11428ce5022442f6b229f679d407c75c40d8926641e'

from xdmod_python.server import XDMoDPythonServer

async def test_fixes():
    print("🔧 Testing XDMoD Python Server Fixes\n")
    
    server = XDMoDPythonServer()
    
    print("=" * 50)
    print("TEST 1: Person Discovery Fix")
    print("=" * 50)
    try:
        result = await server._discover_person_ids({"limit": 5})
        text = result[0].text
        print(text)
        
        # Check if we're getting real usernames
        if 'Found' in text and 'active users' in text:
            print("\n✅ DISCOVERY FIX STATUS: Appears to be working")
            if 'label' in text.lower():
                print("⚠️  Warning: Still contains 'label' text")
            else:
                print("✅ No 'label' issues detected")
        else:
            print("\n❌ DISCOVERY FIX STATUS: May have issues")
        
    except Exception as e:
        print(f"❌ Discovery test failed: {e}")
    
    print("\n" + "=" * 50)
    print("TEST 2: Authentication Fix") 
    print("=" * 50)
    try:
        result = await server._get_user_data_python({
            "user_name": "smith",
            "start_date": "2024-01-01", 
            "end_date": "2024-01-31"
        })
        text = result[0].text
        print(text)
        
        # Check authentication status
        if 'Authentication failed' in text or 'HTTP 401' in text:
            print("\n❌ AUTH FIX STATUS: Still failing")
        elif '✅' in text and ('API call successful' in text or 'Success' in text):
            print("\n✅ AUTH FIX STATUS: Working!")
        else:
            print("\n⚠️  AUTH FIX STATUS: Unclear - needs manual review")
            
    except Exception as e:
        print(f"❌ Authentication test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_fixes())