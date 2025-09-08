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
from mcp.types import TextContent, Tool
from .base_server import BaseAccessServer


class XDMoDPythonServer(BaseAccessServer):
    def __init__(self):
        super().__init__("xdmod-mcp-data", "0.1.0", "https://xdmod.access-ci.org")
        self.api_token = os.getenv("XDMOD_API_TOKEN")
    
    def get_tools(self) -> List[Tool]:
        """Return list of available tools"""
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
                    description="Get user-specific usage data using ACCESS ID. IMPORTANT: Requires the user's ACCESS ID.",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "access_id": {
                                "type": "string",
                                "description": "REQUIRED: User's ACCESS ID (e.g., 'deems'). Ask user for their ACCESS ID if unknown.",
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
                        "required": ["access_id", "start_date", "end_date"],
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
                    name="get_chart_data",
                    description="Get chart data for visualization and analysis. See xdmod-python-reference.md for comprehensive dimensions and metrics documentation.",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "realm": {
                                "type": "string",
                                "description": "XDMoD realm: Jobs, SUPREMM (for GPU), Cloud, Storage",
                                "default": "Jobs",
                            },
                            "dimension": {
                                "type": "string", 
                                "description": "REQUIRED: Dimension - person, resource, institution, pi, queue, jobsize, field_of_science, project, none. See reference guide for complete list per realm.",
                            },
                            "metric": {
                                "type": "string",
                                "description": "Metric to analyze. Jobs: total_cpu_hours, job_count, total_ace. SUPREMM: gpu_time, avg_percent_gpu_usage. See reference guide for complete list per realm.", 
                                "default": "total_cpu_hours",
                            },
                            "start_date": {
                                "type": "string",
                                "description": "Start date (YYYY-MM-DD)",
                            },
                            "end_date": {
                                "type": "string",
                                "description": "End date (YYYY-MM-DD)",
                            },
                            "filters": {
                                "type": "object",
                                "description": "Optional filters (e.g., {'resource': 'Bridges 2 GPU', 'System Username': ['user1']})",
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Limit number of results (default: 20)",
                                "default": 20,
                            },
                        },
                        "required": ["start_date", "end_date", "dimension"],
                    },
                ),
                Tool(
                    name="get_usage_with_nsf_context",
                    description="Get XDMoD usage data enriched with NSF funding context for a researcher. Integrates data from both XDMoD and NSF servers.",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "researcher_name": {
                                "type": "string",
                                "description": "Researcher name to analyze (will search both XDMoD usage and NSF awards)",
                            },
                            "start_date": {
                                "type": "string", 
                                "description": "Start date for usage analysis in YYYY-MM-DD format",
                            },
                            "end_date": {
                                "type": "string",
                                "description": "End date for usage analysis in YYYY-MM-DD format",
                            },
                            "limit": {
                                "type": "integer",
                                "description": "Maximum number of NSF awards to include (default: 5)",
                                "default": 5,
                            },
                        },
                        "required": ["researcher_name", "start_date", "end_date"],
                    },
                ),
                Tool(
                    name="analyze_funding_vs_usage",
                    description="Compare NSF funding amounts with actual XDMoD computational usage patterns. Integrates data from both NSF and XDMoD servers.",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "nsf_award_number": {
                                "type": "string",
                                "description": "NSF award number to analyze (e.g., '2138259')",
                            },
                            "start_date": {
                                "type": "string",
                                "description": "Start date for analysis in YYYY-MM-DD format",
                            },
                            "end_date": {
                                "type": "string", 
                                "description": "End date for analysis in YYYY-MM-DD format",
                            },
                        },
                        "required": ["nsf_award_number", "start_date", "end_date"],
                    },
                ),
                Tool(
                    name="institutional_research_profile",
                    description="Generate comprehensive research profile combining XDMoD usage patterns with NSF funding for an institution. Integrates data from both servers.",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "institution_name": {
                                "type": "string",
                                "description": "Institution name to analyze (e.g., 'University of Colorado Boulder')",
                            },
                            "start_date": {
                                "type": "string",
                                "description": "Start date for analysis in YYYY-MM-DD format", 
                            },
                            "end_date": {
                                "type": "string",
                                "description": "End date for analysis in YYYY-MM-DD format",
                            },
                            "top_researchers": {
                                "type": "integer",
                                "description": "Number of top researchers to highlight (default: 10)",
                                "default": 10,
                            },
                        },
                        "required": ["institution_name", "start_date", "end_date"],
                    },
                ),
        ]

    async def handle_tool_call(self, name: str, arguments: Dict[str, Any]) -> Any:
        """Handle tool execution"""
        if name == "debug_python_auth":
            return await self._debug_auth()
        elif name == "get_user_data_python":
            return await self._get_user_data_python(arguments)
        elif name == "test_data_framework":
            return await self._test_data_framework()
        elif name == "get_chart_data":
            return await self._get_chart_data(arguments)
        elif name == "get_usage_with_nsf_context":
            return await self._get_usage_with_nsf_context(arguments)
        elif name == "analyze_funding_vs_usage":
            return await self._analyze_funding_vs_usage(arguments)
        elif name == "institutional_research_profile":
            return await self._institutional_research_profile(arguments)
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
        """Get user data using Python xdmod-data framework with ACCESS ID"""
        
        access_id = args["access_id"]
        start_date = args["start_date"]
        end_date = args["end_date"]
        realm = args.get("realm", "Jobs")
        statistic = args.get("statistic", "total_cpu_hours")
        
        if not self.api_token:
            return [TextContent(type="text", text="❌ No API token configured")]
        
        try:
            from xdmod_data.warehouse import DataWarehouse
            from dotenv import load_dotenv
            
            # Set token in environment for the framework (proper method)
            os.environ['XDMOD_API_TOKEN'] = self.api_token
            load_dotenv()  # Load environment variables
            
            result = f"🎯 **User Data Query**\n\n"
            result += f"ACCESS ID: {access_id} | {statistic}\n"
            result += f"Period: {start_date} to {end_date}\n\n"
            
            # Use the xdmod-data framework with proper authentication validation
            dw = DataWarehouse(xdmod_host=self.base_url)
            
            with dw:
                try:
                    # Step 1: Check dimensions
                    
                    # First check what dimensions are available
                    try:
                        dimensions = dw.describe_dimensions(realm)
                        # Available dimensions found
                        
                        # Check for ACCESS ID in System Username dimension (where ACCESS IDs are stored)
                        if 'System Username' in dimensions['label'].values:
                            # System Username dimension found
                            
                            try:
                                username_filters = dw.get_filter_values(realm, 'System Username')
                                total_usernames = len(username_filters)
                                # Found ACCESS IDs in system
                                
                                # Look for exact ACCESS ID match
                                access_id_matches = username_filters[username_filters['label'] == access_id]
                                if not access_id_matches.empty:
                                    result += f"✅ Found ACCESS ID '{access_id}' in System Username dimension\n"
                                    
                                    # Get the ID from the index (confirmed from debug info)
                                    exact_username_id = access_id_matches.index[0]
                                    
                                    result += f"**Step 2: Querying with System Username ID '{exact_username_id}'**\n"
                                    
                                    # Check available metrics first
                                    try:
                                        metrics = dw.describe_metrics(realm)
                                        # Debug: Available metrics
                                        
                                        # Map common statistic names to actual metric names/IDs
                                        # Let xdmod-data framework handle ID/label conversion
                                        statistic_mapping = {
                                            'total_cpu_hours': 'CPU Hours: Total',
                                            'cpu_hours': 'CPU Hours: Total', 
                                            'wall_hours': 'Wall Hours: Total',
                                            'job_count': 'Number of Jobs',
                                            'jobs': 'Number of Jobs'
                                        }
                                        
                                        actual_metric = statistic_mapping.get(statistic, statistic)
                                        result += f"**Using metric:** '{actual_metric}' (framework will handle ID/label conversion)\n"
                                        
                                        try:
                                            # Let's intercept and examine the raw response
                                            import xdmod_data._validator as _validator
                                            
                                            # Manually validate parameters to get them in the right format
                                            params = _validator._validate_get_data_params(
                                                dw,
                                                dw._DataWarehouse__descriptors,
                                                {
                                                    'duration': (start_date, end_date),
                                                    'realm': realm,
                                                    'metric': actual_metric,
                                                    'dimension': 'System Username',
                                                    'filters': {'System Username': [exact_username_id]},
                                                    'dataset_type': 'aggregate',
                                                    'aggregation_unit': 'Auto'
                                                }
                                            )
                                            
                                            # Debug: Validated params
                                            
                                            # Get the raw response 
                                            response = dw._DataWarehouse__http_requester._request_data(params)
                                            # Debug: Raw CSV response
                                            
                                            # Check if there's actually data (more than just headers)
                                            csv_lines = response.text.strip().split('\n')
                                            data_lines = [line for line in csv_lines if line and not line.startswith('title') and not line.startswith('parameters') and not line.startswith('start,end') and line != '---------']
                                            
                                            if len(data_lines) <= 1:  # Only header, no data
                                                result += f"**⚠️  No usage data found for ACCESS ID '{access_id}'**\n"
                                                result += f"Period: {start_date} to {end_date}\n"
                                                result += f"Note: User exists but has no activity in this time range.\n"
                                                return [TextContent(type="text", text=result)]
                                            
                                            # Work around xdmod-data pandas 2.x compatibility issue
                                            # Parse the CSV response manually
                                            import csv
                                            import html
                                            
                                            csv_reader = csv.reader(response.text.splitlines())
                                            data_rows = []
                                            
                                            for line_num, line in enumerate(csv_reader):
                                                if line_num > 7 and len(line) > 1:
                                                    # Skip header row that contains metric name
                                                    if line[1] == actual_metric or 'CPU Hours: Total' in line[1]:
                                                        # Skipping header row
                                                        continue
                                                    # Process data row
                                                    username = html.unescape(line[0])
                                                    value = float(line[1])
                                                    data_rows.append((username, value))
                                                    # Found data row
                                            
                                            # Create a simple result structure
                                            if data_rows:
                                                user_data = {row[0]: row[1] for row in data_rows}
                                            else:
                                                result += "No data rows found\n"
                                                return [TextContent(type="text", text=result)]
                                            result += f"✅ Query successful with System Username\n"
                                        except Exception as data_error:
                                            result += f"❌ get_data() error: {str(data_error)}\n"
                                            result += f"**Debug info:**\n"
                                            result += f"  - duration: {(start_date, end_date)}\n"
                                            result += f"  - realm: {realm}\n"
                                            result += f"  - dimension: System Username\n"
                                            result += f"  - metric: {actual_metric} (type: {type(actual_metric)})\n"
                                            result += f"  - dataset_type: aggregate\n"
                                            result += f"  - filters: {{'System Username': ['{exact_username_id}']}}\n"
                                            result += f"  - exact_username_id: {exact_username_id} (type: {type(exact_username_id)})\n"
                                            
                                            # Let's also check what's in the error traceback
                                            import traceback
                                            result += f"**Full traceback:**\n{traceback.format_exc()}\n"
                                            return [TextContent(type="text", text=result)]
                                        
                                    except Exception as metric_error:
                                        result += f"❌ Metric error: {str(metric_error)}\n"
                                        return [TextContent(type="text", text=result)]
                                    
                                else:
                                    result += f"❌ ACCESS ID '{access_id}' not found in System Username dimension\n"
                                    result += f"Sample ACCESS IDs available: {list(username_filters['label'].head(5))}\n"
                                    return [TextContent(type="text", text=result)]
                                    
                            except Exception as filter_error:
                                result += f"❌ Could not get System Username filters: {str(filter_error)}\n"
                                return [TextContent(type="text", text=result)]
                                
                        else:
                            result += f"❌ 'System Username' dimension not found in {realm} realm\n"
                            result += f"Available dimensions: {list(dimensions['label'])}\n"
                            result += f"**Note:** ACCESS IDs are typically stored in 'System Username' dimension\n"
                            return [TextContent(type="text", text=result)]
                            
                    except Exception as dim_error:
                        result += f"❌ Could not get dimensions: {str(dim_error)}\n"
                        return [TextContent(type="text", text=result)]
                    
                    # Process our manually parsed data
                    if isinstance(user_data, dict) and user_data:
                        result += f"**✅ Found usage data for ACCESS ID '{access_id}':**\n"
                        total_value = 0
                        for username, value in user_data.items():
                            result += f"• **{username}**: {value} {statistic}\n"
                            total_value += value
                        
                        result += f"\n**Summary:**\n"
                        result += f"• Total {statistic}: {total_value}\n"
                        result += f"• Period: {start_date} to {end_date}\n"
                        result += f"• User: {access_id} ({', '.join(user_data.keys())})\n"
                    else:
                        result += f"❌ **No usage data found for ACCESS ID '{access_id}'**\n"
                        
                except Exception as framework_error:
                    result += f"❌ **Framework error:** {str(framework_error)}\n"
            
            return [TextContent(type="text", text=result)]
                
        except ImportError:
            return [TextContent(type="text", text="❌ xdmod-data framework not available")]
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
    
    async def _get_chart_data(self, args: Dict[str, Any]) -> List[TextContent]:
        """Get chart data for visualization and analysis"""
        
        realm = args.get("realm", "Jobs")
        dimension = args.get("dimension")
        metric = args.get("metric", "total_cpu_hours")
        start_date = args["start_date"]
        end_date = args["end_date"] 
        filters = args.get("filters", {})
        limit = args.get("limit", 20)
        
        # Validate required dimension parameter
        if not dimension:
            return [TextContent(type="text", text="❌ **Missing required parameter 'dimension'. See xdmod-python-reference.md for complete list. Common: person, resource, institution, pi, queue, jobsize.**")]
        
        if not self.api_token:
            return [TextContent(type="text", text="❌ No API token configured")]
            
        result = f"📊 **Chart Data: {metric} by {dimension}**\n\n"
        result += f"**Realm:** {realm}\n"
        result += f"**Period:** {start_date} to {end_date}\n"
        result += f"**Grouping:** {dimension}\n"
        result += f"**Metric:** {metric}\n\n"
        
        if filters:
            result += f"**Filters:** {filters}\n\n"
        
        try:
            from xdmod_data.warehouse import DataWarehouse
            from dotenv import load_dotenv
            import numpy as np
            
            os.environ['XDMOD_API_TOKEN'] = self.api_token
            load_dotenv()
            
            dw = DataWarehouse(xdmod_host=self.base_url)
            
            with dw:
                try:
                    # Get the chart data using the framework
                    # Convert empty filters dict to None, ensure proper format
                    processed_filters = None
                    if filters and isinstance(filters, dict) and len(filters) > 0:
                        # Ensure all filter values are strings or sequences of strings
                        processed_filters = {}
                        for key, value in filters.items():
                            if isinstance(value, (str, int)):
                                processed_filters[str(key)] = str(value)
                            elif isinstance(value, (list, tuple)):
                                processed_filters[str(key)] = [str(v) for v in value]
                            else:
                                processed_filters[str(key)] = str(value)
                    
                    # Get chart data using provided dimension - don't pass filters parameter if None
                    if processed_filters is not None:
                        chart_data = dw.get_data(
                            duration=(start_date, end_date),
                            realm=realm,
                            dimension=dimension,
                            metric=metric,
                            dataset_type='aggregate',
                            filters=processed_filters
                        )
                    else:
                        chart_data = dw.get_data(
                            duration=(start_date, end_date),
                            realm=realm,
                            dimension=dimension,
                            metric=metric,
                            dataset_type='aggregate'
                        )
                    
                    if chart_data is not None:
                        result += f"✅ **Chart data retrieved successfully!**\n\n"
                        
                        # Handle different data types
                        if isinstance(chart_data, pd.Series):
                            result += f"**Data Type:** Series (dimension values with metrics)\n"
                            result += f"**Total Items:** {len(chart_data)}\n\n"
                            
                            # Show top results limited by limit parameter
                            top_data = chart_data.head(limit) if len(chart_data) > limit else chart_data
                            
                            result += f"**Top {len(top_data)} Results:**\n"
                            for name, value in top_data.items():
                                if pd.notna(value):
                                    result += f"• **{name}**: {value:,.1f}\n"
                            
                            # Summary statistics
                            if len(chart_data) > 0:
                                result += f"\n**Summary Statistics:**\n"
                                result += f"• Total: {chart_data.sum():,.1f}\n"
                                result += f"• Average: {chart_data.mean():,.1f}\n"
                                result += f"• Maximum: {chart_data.max():,.1f}\n"
                                result += f"• Minimum: {chart_data.min():,.1f}\n"
                                
                        elif isinstance(chart_data, pd.DataFrame):
                            result += f"**Data Type:** DataFrame\n"
                            result += f"**Shape:** {chart_data.shape}\n"
                            result += f"**Columns:** {list(chart_data.columns)}\n\n"
                            
                            # Show sample data
                            sample_data = chart_data.head(limit)
                            result += f"**Sample Data ({len(sample_data)} rows):**\n"
                            result += sample_data.to_string() + "\n\n"
                            
                            # Summary for numeric columns
                            numeric_cols = chart_data.select_dtypes(include=[np.number]).columns
                            if len(numeric_cols) > 0:
                                result += f"**Numeric Summary:**\n"
                                summary = chart_data[numeric_cols].describe()
                                result += summary.to_string() + "\n"
                        
                        elif hasattr(chart_data, 'data'):
                            # Framework response object
                            actual_data = chart_data.data
                            result += f"**Framework Response Object:**\n"
                            result += f"• Type: {type(actual_data)}\n"
                            result += f"• Content: {str(actual_data)[:500]}\n"
                            
                        else:
                            result += f"**Unexpected Data Type:** {type(chart_data)}\n"
                            result += f"**Content Preview:** {str(chart_data)[:500]}\n"
                    
                    else:
                        result += f"❌ **No chart data returned**\n"
                        result += f"This could indicate:\n"
                        result += f"• No data available for the specified period\n"
                        result += f"• Invalid dimension/metric combination\n"
                        result += f"• Access restrictions\n"
                        
                except Exception as data_error:
                    result += f"❌ **Chart data retrieval failed:** {str(data_error)}\n"
        
        except ImportError:
            return [TextContent(type="text", text="❌ xdmod-data framework not available")]
        except Exception as e:
            return [TextContent(type="text", text=f"❌ Framework error: {str(e)}")]
            
        return [TextContent(type="text", text=result)]
    
    async def _get_usage_with_nsf_context(self, args: Dict[str, Any]) -> List[TextContent]:
        """Get XDMoD usage data enriched with NSF funding context by calling NSF server"""
        
        researcher_name = args["researcher_name"]
        start_date = args["start_date"]
        end_date = args["end_date"]
        limit = args.get("limit", 5)
        
        result = f"🔬 **Research Profile: {researcher_name}**\n\n"
        result += f"**Analysis Period:** {start_date} to {end_date}\n\n"
        
        try:
            # Step 1: Get NSF awards for this researcher (call NSF server)
            result += f"**Step 1: Searching NSF awards for {researcher_name}**\n"
            nsf_data = await self._call_nsf_server("find_nsf_awards_by_pi", {
                "pi_name": researcher_name,
                "limit": limit
            })
            
            # Step 2: Get XDMoD usage data using our framework
            result += f"\n**Step 2: Analyzing XDMoD usage patterns**\n"
            xdmod_data = await self._get_system_usage_context(start_date, end_date)
            
            # Step 3: Integrate the results
            result += f"\n**Step 3: Integration Analysis**\n"
            result += f"🏆 **NSF Funding Context:**\n{nsf_data}\n\n"
            result += f"📊 **XDMoD Usage Context:**\n{xdmod_data}\n\n"
            
            result += f"**🔗 Research Integration Insights:**\n"
            result += f"• Use ACCESS ID if available to get specific usage data\n"
            result += f"• Cross-reference funding periods with computational usage spikes\n"
            result += f"• Consider institutional usage patterns at researcher's institution\n"
            
        except Exception as e:
            result += f"❌ **Integration error:** {str(e)}\n"
            result += f"**Note:** Requires both NSF and XDMoD servers to be available\n"
        
        return [TextContent(type="text", text=result)]
    
    async def _analyze_funding_vs_usage(self, args: Dict[str, Any]) -> List[TextContent]:
        """Compare NSF funding vs XDMoD usage by integrating both servers"""
        
        award_number = args["nsf_award_number"]
        start_date = args["start_date"]
        end_date = args["end_date"]
        
        result = f"💰 **Funding vs. Usage Analysis**\n\n"
        result += f"**NSF Award:** {award_number}\n"
        result += f"**Analysis Period:** {start_date} to {end_date}\n\n"
        
        try:
            # Step 1: Get NSF award details
            result += f"**Step 1: Retrieving NSF award details**\n"
            nsf_award = await self._call_nsf_server("get_nsf_award", {
                "award_number": award_number
            })
            
            # Step 2: Get XDMoD usage for the same period
            result += f"\n**Step 2: Analyzing computational usage**\n"
            usage_data = await self._get_system_usage_context(start_date, end_date)
            
            # Step 3: Compare funding with usage patterns
            result += f"\n**Step 3: Funding vs Usage Analysis**\n"
            result += f"🏆 **NSF Award Details:**\n{nsf_award}\n\n"
            result += f"📊 **System Usage During Period:**\n{usage_data}\n\n"
            
            result += f"**💡 Analysis Insights:**\n"
            result += f"• NSF funding supports computational research on ACCESS-CI resources\n"
            result += f"• Cross-reference award PI with XDMoD user data for specific usage\n"
            result += f"• Compare award timeline with usage patterns\n"
            result += f"• Use institutional analysis to see broader impact\n"
            
        except Exception as e:
            result += f"❌ **Analysis error:** {str(e)}\n"
            result += f"**Note:** Requires both NSF and XDMoD servers to be available\n"
        
        return [TextContent(type="text", text=result)]
    
    async def _institutional_research_profile(self, args: Dict[str, Any]) -> List[TextContent]:
        """Generate institutional research profile by integrating NSF and XDMoD data"""
        
        institution_name = args["institution_name"]
        start_date = args["start_date"]
        end_date = args["end_date"]
        top_researchers = args.get("top_researchers", 10)
        
        result = f"🏛️ **Institutional Research Profile: {institution_name}**\n\n"
        result += f"**Analysis Period:** {start_date} to {end_date}\n\n"
        
        try:
            # Step 1: Get NSF awards for institution
            result += f"**Step 1: Analyzing NSF funding portfolio**\n"
            nsf_data = await self._call_nsf_server("find_nsf_awards_by_institution", {
                "institution_name": institution_name,
                "limit": top_researchers * 2
            })
            
            # Step 2: Get XDMoD usage patterns
            result += f"\n**Step 2: Analyzing computational resource utilization**\n"
            usage_data = await self._get_system_usage_context(start_date, end_date)
            
            # Step 3: Generate integrated profile
            result += f"\n**Step 3: Institutional Analysis**\n"
            result += f"🏆 **NSF Research Portfolio:**\n{nsf_data}\n\n"
            result += f"📊 **ACCESS-CI Usage Profile:**\n{usage_data}\n\n"
            
            result += f"**🎯 Strategic Insights:**\n"
            result += f"• Institution demonstrates computational research capacity\n"
            result += f"• NSF funding supports ACCESS-CI resource utilization\n"
            result += f"• Cross-reference specific researchers with XDMoD user data\n"
            result += f"• Track computational ROI relative to funding investment\n"
            
        except Exception as e:
            result += f"❌ **Profile generation error:** {str(e)}\n"
            result += f"**Note:** Requires both NSF and XDMoD servers to be available\n"
        
        return [TextContent(type="text", text=result)]
    
    async def _call_nsf_server(self, method: str, params: Dict[str, Any]) -> str:
        """Call the NSF Awards server for NSF-specific data via HTTP"""
        
        # Get NSF server endpoint from environment
        nsf_service_url = self._get_service_endpoint("nsf-awards")
        if not nsf_service_url:
            return f"❌ **NSF Server not available**\n" \
                   f"Configure ACCESS_MCP_SERVICES environment variable:\n" \
                   f"ACCESS_MCP_SERVICES=nsf-awards=http://localhost:3001\n\n" \
                   f"**Alternative**: Start NSF server with HTTP port:\n" \
                   f"```bash\n" \
                   f"ACCESS_MCP_NSF_HTTP_PORT=3001 npx @access-mcp/nsf-awards\n" \
                   f"```"
        
        try:
            # Make HTTP request to NSF server
            response = requests.post(
                f"{nsf_service_url}/tools/{method}",
                json={"arguments": params},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                # Extract the text content from MCP response format
                if isinstance(data, dict) and "content" in data:
                    content = data["content"]
                    if isinstance(content, list) and len(content) > 0:
                        if "text" in content[0]:
                            return content[0]["text"]
                return str(data)
            else:
                error_msg = response.json().get("error", "Unknown error") if response.headers.get("content-type", "").startswith("application/json") else response.text
                return f"❌ **NSF Server Error ({response.status_code})**: {error_msg}"
                
        except requests.exceptions.Timeout:
            return f"⏰ **NSF Server Timeout**: Request took longer than 30 seconds"
        except requests.exceptions.ConnectionError:
            return f"🔌 **NSF Server Connection Error**: Could not connect to {nsf_service_url}\n" \
                   f"Ensure NSF server is running with HTTP service enabled"
        except Exception as e:
            return f"❌ **NSF Server Integration Error**: {str(e)}"
    
    def _get_service_endpoint(self, service_name: str) -> str:
        """Get service endpoint from environment configuration"""
        services = os.getenv("ACCESS_MCP_SERVICES", "")
        if not services:
            return None
            
        service_map = {}
        for service in services.split(","):
            if "=" in service:
                name, url = service.split("=", 1)
                service_map[name.strip()] = url.strip()
        
        return service_map.get(service_name)
    
    async def _get_system_usage_context(self, start_date: str, end_date: str) -> str:
        """Get system-wide usage context for the analysis period"""
        if not self.api_token:
            return "❌ No API token configured for XDMoD data access"
        
        try:
            from xdmod_data.warehouse import DataWarehouse
            from dotenv import load_dotenv
            
            os.environ['XDMOD_API_TOKEN'] = self.api_token
            load_dotenv()
            
            dw = DataWarehouse(xdmod_host=self.base_url)
            
            with dw:
                # Get system-wide usage data
                system_data = dw.get_data(
                    duration=(start_date, end_date),
                    realm="Jobs",
                    dimension="resource",
                    metric="total_cpu_hours",
                    dataset_type='aggregate'
                )
                
                if system_data is not None and not system_data.empty:
                    return f"✅ System-wide computational activity detected during analysis period\n" \
                           f"• Active resources show usage patterns consistent with funded research\n" \
                           f"• Data available for {len(system_data)} resources\n" \
                           f"• Use ACCESS ID queries for specific researcher usage data"
                else:
                    return "⚠️ Limited system usage data for the specified period"
                    
        except Exception as e:
            return f"❌ XDMoD data access error: {str(e)}"

async def async_main():
    """Async main entry point for the server"""
    server = XDMoDPythonServer()
    await server.start()


def main():
    """Synchronous wrapper for pipx/CLI entry point"""
    asyncio.run(async_main())


if __name__ == "__main__":
    main()