#!/usr/bin/env python3
"""
XDMoD Python MCP Server

Uses the XDMoD data analytics framework for better user-specific data access.
"""

import asyncio
import os
import sys
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

import pandas as pd
import requests
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool


class XDMoDPythonServer:
    def __init__(self):
        self.server = Server("xdmod-python")
        self.base_url = "https://xdmod.access-ci.org"
        self.api_token = os.getenv("XDMOD_API_TOKEN")
        
        # Set up tools
        self._register_tools()
    
    def _register_tools(self):
        """Register MCP tools"""
        
        @self.server.list_tools()
        async def handle_list_tools() -> List[Tool]:
            return [
                Tool(
                    name="debug_python_auth",
                    description="Debug authentication and framework availability",
                    inputSchema={
                        "type": "object",
                        "properties": {},
                        "required": [],
                    },
                ),
                Tool(
                    name="get_user_data_python",
                    description="Get user-specific data using Python data analytics approach",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "user_name": {
                                "type": "string",
                                "description": "User name to search for",
                            },
                            "start_date": {
                                "type": "string",
                                "description": "Start date (YYYY-MM-DD)",
                            },
                            "end_date": {
                                "type": "string", 
                                "description": "End date (YYYY-MM-DD)",
                            },
                            "realm": {
                                "type": "string",
                                "description": "XDMoD realm (default: Jobs)",
                                "default": "Jobs",
                            },
                            "statistic": {
                                "type": "string",
                                "description": "Statistic to retrieve (default: total_cpu_hours)",
                                "default": "total_cpu_hours",
                            },
                        },
                        "required": ["user_name", "start_date", "end_date"],
                    },
                ),
                Tool(
                    name="test_data_framework",
                    description="Test XDMoD data analytics framework integration",
                    inputSchema={
                        "type": "object",
                        "properties": {},
                        "required": [],
                    },
                ),
                Tool(
                    name="get_user_data_framework",
                    description="Get user data using official xdmod-data framework",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "user_name": {
                                "type": "string",
                                "description": "User name to search for",
                            },
                            "start_date": {
                                "type": "string",
                                "description": "Start date (YYYY-MM-DD)",
                            },
                            "end_date": {
                                "type": "string", 
                                "description": "End date (YYYY-MM-DD)",
                            },
                            "realm": {
                                "type": "string",
                                "description": "XDMoD realm (default: Jobs)",
                                "default": "Jobs",
                            },
                            "statistic": {
                                "type": "string",
                                "description": "Statistic to retrieve (default: total_cpu_hours)",
                                "default": "total_cpu_hours",
                            },
                        },
                        "required": ["user_name", "start_date", "end_date"],
                    },
                ),
                Tool(
                    name="discover_person_ids",
                    description="Discover available person IDs and names in XDMoD",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "search_term": {
                                "type": "string",
                                "description": "Optional search term to filter person names",
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum number of results to return (default: 20)",
                                "default": 20,
                            },
                        },
                        "required": [],
                    },
                ),
            ]

        @self.server.call_tool()
        async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
            if name == "debug_python_auth":
                return await self._debug_auth()
            elif name == "get_user_data_python":
                return await self._get_user_data_python(arguments)
            elif name == "test_data_framework":
                return await self._test_data_framework()
            elif name == "get_user_data_framework":
                return await self._get_user_data_framework(arguments)
            elif name == "discover_person_ids":
                return await self._discover_person_ids(arguments)
            else:
                raise ValueError(f"Unknown tool: {name}")
    
    async def _debug_auth(self) -> List[TextContent]:
        """Debug authentication and environment"""
        
        # Check environment
        token_present = bool(self.api_token)
        token_length = len(self.api_token) if self.api_token else 0
        token_preview = self.api_token[:10] + "..." if self.api_token else "None"
        
        # Check Python packages
        packages = {}
        try:
            import pandas
            packages["pandas"] = pandas.__version__
        except ImportError:
            packages["pandas"] = "Not installed"
            
        try:
            import requests
            packages["requests"] = requests.__version__
        except ImportError:
            packages["requests"] = "Not installed"
            
        # Check XDMoD data analytics framework
        xdmod_framework_status = "Not found"
        try:
            import xdmod_data
            xdmod_framework_status = f"Found: xdmod-data v{getattr(xdmod_data, '__version__', 'unknown')}"
            
            # Check if we can create a client
            if hasattr(xdmod_data, 'Client'):
                xdmod_framework_status += " (Client class available)"
        except ImportError:
            pass
        
        result = f"""🐍 **XDMoD Python MCP Server Debug**

**Environment:**
- Python version: {sys.version.split()[0]}
- API Token present: {token_present}
- Token length: {token_length}
- Token preview: {token_preview}

**Dependencies:**
- pandas: {packages['pandas']}
- requests: {packages['requests']}

**XDMoD Data Analytics Framework:**
- Status: {xdmod_framework_status}

**Next Steps:**
1. Install XDMoD data analytics framework if not found
2. Test basic REST API access with Python
3. Compare with TypeScript server results
"""

        return [TextContent(type="text", text=result)]
    
    async def _get_user_data_python(self, args: Dict[str, Any]) -> List[TextContent]:
        """Get user data using Python approach"""
        
        user_name = args["user_name"]
        start_date = args["start_date"]
        end_date = args["end_date"]
        realm = args.get("realm", "Jobs")
        statistic = args.get("statistic", "total_cpu_hours")
        
        if not self.api_token:
            return [TextContent(type="text", text="❌ No API token configured")]
        
        try:
            # Use Python requests (similar to TypeScript but cleaner)
            url = f"{self.base_url}/controllers/user_interface.php"
            
            headers = {
                "Token": self.api_token,
                "Content-Type": "application/x-www-form-urlencoded",
            }
            
            # Try the get_data approach that was recommended
            data = {
                "operation": "get_data",
                "format": "jsonstore",
                "realm": realm,
                "group_by": "person",
                "statistic": statistic,
                "start_date": start_date,
                "end_date": end_date,
                "limit": "100",
            }
            
            response = requests.post(url, headers=headers, data=data, timeout=30)
            
            if response.status_code == 200:
                json_data = response.json()
                
                # Use pandas for data analysis
                df = pd.json_normalize(json_data.get("data", []))
                
                if df.empty:
                    return [TextContent(type="text", text=f"✅ API call successful but no data returned\n\nResponse structure: {list(json_data.keys())}")]
                
                # Filter for specific user
                user_matches = df[df['name'].str.contains(user_name, case=False, na=False)]
                
                result = f"""🐍 **Python User Data Results**

**Query:** {user_name} | {realm} | {statistic}
**Period:** {start_date} to {end_date}

**Total users found:** {len(df)}
**Matching users:** {len(user_matches)}

**Data Structure:**
- Columns: {list(df.columns)}
- Sample data shape: {df.shape}

"""
                
                if not user_matches.empty:
                    result += "**Your Data:**\n"
                    for _, row in user_matches.iterrows():
                        result += f"• **{row.get('name', 'Unknown')}**\n"
                        result += f"  - ID: {row.get('id', 'Not found')}\n"
                        result += f"  - Value: {row.get('value', 'Not found')}\n"
                        result += f"  - All fields: {list(row.index)}\n\n"
                else:
                    result += f"**No exact matches found for '{user_name}'**\n\n"
                    if len(df) > 0:
                        result += "**Sample users (first 5):**\n"
                        for _, row in df.head().iterrows():
                            result += f"• {row.get('name', 'Unknown')}\n"

                result += f"\n**Raw data sample:**\n```json\n{json_data}\n```"
                
                return [TextContent(type="text", text=result)]
                
            else:
                error_text = response.text
                return [TextContent(type="text", text=f"❌ API Error: HTTP {response.status_code}\n\n{error_text}")]
                
        except Exception as e:
            return [TextContent(type="text", text=f"❌ Exception: {str(e)}")]
    
    async def _test_data_framework(self) -> List[TextContent]:
        """Test if we can use XDMoD data analytics framework"""
        
        result = "🧪 **XDMoD Data Analytics Framework Test**\n\n"
        
        # Test official xdmod-data package
        try:
            import xdmod_data
            result += f"✅ Found xdmod-data v{getattr(xdmod_data, '__version__', 'unknown')}\n"
            
            # Test basic functionality
            from xdmod_data import warehouse
            if hasattr(warehouse, 'DataWarehouse'):
                result += "✅ DataWarehouse class available\n"
                
                if self.api_token:
                    try:
                        # Set token in environment for the framework
                        os.environ['XDMOD_API_TOKEN'] = self.api_token
                        
                        with warehouse.DataWarehouse(xdmod_host=self.base_url) as dw:
                            result += "✅ DataWarehouse instance created successfully\n"
                            
                            # Test basic API call
                            try:
                                # Check available methods
                                methods = [m for m in dir(dw) if not m.startswith('_')]
                                result += f"✅ Framework ready - Available methods: {', '.join(methods[:5])}\n"
                            except Exception as api_error:
                                result += f"⚠️ API test failed: {str(api_error)}\n"
                            
                    except Exception as client_error:
                        result += f"❌ Client creation failed: {str(client_error)}\n"
                else:
                    result += "⚠️ No API token - cannot test client creation\n"
            else:
                result += "❌ DataWarehouse class not found\n"
            
            return [TextContent(type="text", text=result)]
            
        except ImportError:
            result += "❌ xdmod-data not found\n"
            
        result += "\n**Status:**\n"
        result += "- Official framework should be installed with: pip install xdmod-data\n"
        result += "- This provides the proper Python API for XDMoD data access\n"
        
        return [TextContent(type="text", text=result)]
    
    async def _get_user_data_framework(self, args: Dict[str, Any]) -> List[TextContent]:
        """Get user data using the official xdmod-data framework"""
        
        if not self.api_token:
            return [TextContent(type="text", text="❌ No API token configured")]
            
        try:
            from xdmod_data import warehouse
            
            # Set token in environment for the framework
            os.environ['XDMOD_API_TOKEN'] = self.api_token
            
            user_name = args["user_name"]
            start_date = args["start_date"]
            end_date = args["end_date"]
            realm = args.get("realm", "Jobs")
            statistic = args.get("statistic", "total_cpu_hours")
            
            result = f"🎯 **Official XDMoD Framework Results**\n\n"
            result += f"**Query:** {user_name} | {realm} | {statistic}\n"
            result += f"**Period:** {start_date} to {end_date}\n\n"
            
            # Use context manager for DataWarehouse
            with warehouse.DataWarehouse(xdmod_host=self.base_url) as dw:
                # Check what methods are available first
                methods = [m for m in dir(dw) if not m.startswith('_')]
                result += f"**Available methods:** {', '.join(methods)}\n\n"
                
                # Use the xdmod-data framework to get data
                # First try to understand the correct method signatures
                try:
                    # Try to describe what dimensions are available
                    dimensions_info = dw.describe_dimensions(realm=realm)
                    result += f"**Available dimensions:** {dimensions_info}\n\n"
                except Exception as dim_error:
                    result += f"**Dimensions info error:** {str(dim_error)}\n"
                
                try:
                    # Try to get filter values for person dimension
                    person_filters = dw.get_filter_values(
                        realm=realm,
                        dimension='person'
                    )
                    
                    result += f"**Found {len(person_filters)} users in system**\n\n"
                    
                    # Search for the user
                    user_found = False
                    person_id = None
                    for person in person_filters:
                        if isinstance(person, dict):
                            name = person.get('name', person.get('long_name', ''))
                            pid = person.get('id', person.get('value', ''))
                        else:
                            name = str(person)
                            pid = str(person)
                        
                        if user_name.lower() in name.lower():
                            result += f"**✅ Found matching user:**\n"
                            result += f"  - Name: {name}\n"
                            result += f"  - Person ID: {pid}\n\n"
                            person_id = pid
                            user_found = True
                            break
                    
                    if not user_found:
                        result += f"**User '{user_name}' not found. Sample users:**\n"
                        for i, person in enumerate(person_filters[:5]):
                            if isinstance(person, dict):
                                name = person.get('name', person.get('long_name', 'Unknown'))
                            else:
                                name = str(person)
                            result += f"  • {name}\n"
                    
                    # Try to get data using the framework
                    try:
                        # Try different method signatures to find what works
                        data = dw.get_data(
                            duration=(start_date, end_date),
                            realm=realm,
                            dimension='person',
                            metric=statistic
                        )
                        result += "**Data retrieved successfully using get_data**\n"
                    except Exception as e1:
                        result += f"**get_data attempt 1 failed:** {str(e1)}\n"
                        try:
                            # Try raw data approach
                            data = dw.get_raw_data(
                                duration=(start_date, end_date),
                                realm=realm,
                                filters={'person': person_id} if person_id else None
                            )
                            result += "**Data retrieved using get_raw_data**\n"
                        except Exception as e2:
                            result += f"**get_raw_data failed:** {str(e2)}\n"
                            data = None
                        
                except Exception as api_error:
                    result += f"**Framework Error:** {str(api_error)}\n\n"
                
                if hasattr(data, 'data') and not data.data.empty:
                    df = data.data
                    result += f"**Success!** Retrieved {len(df)} data points\n\n"
                    
                    # Look for user in the data
                    if 'person' in df.columns:
                        user_matches = df[df['person'].str.contains(user_name, case=False, na=False)]
                        
                        if not user_matches.empty:
                            result += f"**Found your data!**\n"
                            for _, row in user_matches.head().iterrows():
                                result += f"• **{row['person']}**\n"
                                result += f"  - Date: {row.get('day', 'N/A')}\n"
                                result += f"  - Value: {row.get(statistic, 'N/A')}\n"
                                if 'person_id' in row:
                                    result += f"  - **Person ID: {row['person_id']}** ⭐\n"
                                result += f"\n"
                        else:
                            result += f"**No exact matches for '{user_name}'**\n\n"
                            result += f"**Available users (sample):**\n"
                            unique_persons = df['person'].unique()[:5]
                            for person in unique_persons:
                                result += f"• {person}\n"
                    
                    result += f"\n**Data Structure:**\n"
                    result += f"- Columns: {list(df.columns)}\n"
                    result += f"- Shape: {df.shape}\n"
                    result += f"- Sample:\n{df.head()}\n"
                    
                else:
                    result += "**No data returned from framework**\n"
                    result += f"Data type: {type(data)}\n"
                    result += f"Data attributes: {dir(data)}\n"
                    
            except Exception as framework_error:
                result += f"**Framework Error:** {str(framework_error)}\n\n"
                result += "**This might mean:**\n"
                result += "- Different API method needed\n"
                result += "- Framework configuration issue\n"
                result += "- XDMoD version compatibility\n"
                
            return [TextContent(type="text", text=result)]
            
        except ImportError:
            return [TextContent(type="text", text="❌ xdmod-data framework not available")]
        except Exception as e:
            return [TextContent(type="text", text=f"❌ Framework error: {str(e)}")]
    
    async def _discover_person_ids(self, args: Dict[str, Any]) -> List[TextContent]:
        """Discover available person IDs and names using xdmod-data framework"""
        
        search_term = args.get("search_term", "")
        limit = args.get("limit", 20)
        
        if not self.api_token:
            return [TextContent(type="text", text="❌ No API token configured")]
        
        result = f"🔍 **Person ID Discovery**\n\n"
        
        try:
            from xdmod_data import warehouse
            os.environ['XDMOD_API_TOKEN'] = self.api_token
            
            # Use context manager as required by the framework
            with warehouse.DataWarehouse(xdmod_host=self.base_url) as dw:
                # Get person filter values
                person_filters = dw.get_filter_values(
                    realm='Jobs',
                    dimension='person'
                )
                
                result += f"**Found {len(person_filters)} total users**\n\n"
                
                matches = []
                for person in person_filters:
                    if isinstance(person, dict):
                        name = person.get('name', person.get('long_name', ''))
                        pid = person.get('id', person.get('value', ''))
                    else:
                        name = str(person)
                        pid = str(person)
                    
                    if not search_term or search_term.lower() in name.lower():
                        matches.append((name, pid))
                        if len(matches) >= limit:
                            break
                
                if matches:
                    result += f"**Matching users ({len(matches)} shown):**\n\n"
                    for name, pid in matches:
                        result += f"• **{name}**\n"
                        result += f"  - Person ID: `{pid}`\n\n"
                else:
                    result += f"**No users matching '{search_term}' found**\n"
                
        except Exception as framework_error:
            result += f"**Framework error:** {str(framework_error)}\n"
        
        return [TextContent(type="text", text=result)]


async def main():
    """Main entry point for the server"""
    server_instance = XDMoDPythonServer()
    
    async with stdio_server() as (read_stream, write_stream):
        await server_instance.server.run(
            read_stream,
            write_stream,
            server_instance.server.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())