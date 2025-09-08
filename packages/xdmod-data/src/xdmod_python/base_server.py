#!/usr/bin/env python3
"""
Python Base ACCESS Server

Provides HTTP support for MCP servers to run in Docker containers,
equivalent to the TypeScript BaseAccessServer functionality.
"""

import asyncio
import os
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from aiohttp import web, web_request
import json
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool


class BaseAccessServer(ABC):
    """Base class for ACCESS-CI MCP servers with HTTP support"""
    
    def __init__(self, server_name: str, version: str, base_url: Optional[str] = None):
        self.server_name = server_name
        self.version = version
        self.base_url = base_url or "https://access-ci.org"
        self.server = Server(server_name)
        self._setup_handlers()
    
    @abstractmethod
    def get_tools(self) -> List[Tool]:
        """Return list of available tools"""
        pass
    
    @abstractmethod 
    async def handle_tool_call(self, name: str, arguments: Dict[str, Any]) -> Any:
        """Handle tool execution"""
        pass
    
    def _setup_handlers(self):
        """Setup MCP tool handlers"""
        tools = self.get_tools()
        
        @self.server.list_tools()
        async def list_tools():
            return tools
        
        @self.server.call_tool()
        async def handle_call(name: str, arguments: Dict[str, Any]):
            return await self.handle_tool_call(name, arguments)
    
    async def start(self, http_port: Optional[int] = None):
        """Start the server in HTTP or stdio mode"""
        port = http_port or (int(os.environ['PORT']) if os.environ.get('PORT') else None)
        
        if port:
            await self._start_http_server(port)
        else:
            await self._start_stdio_server()
    
    async def _start_stdio_server(self):
        """Start in stdio mode for MCP communication"""
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                self.server.create_initialization_options(),
            )
    
    async def _start_http_server(self, port: int):
        """Start HTTP server for Docker deployment"""
        app = web.Application()
        
        # Health check endpoint
        async def health(request: web_request.Request):
            return web.json_response({
                "server": self.server_name,
                "version": self.version,
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            })
        
        # List tools endpoint  
        async def list_tools(request: web_request.Request):
            tools = self.get_tools()
            tools_data = [
                {
                    "name": tool.name,
                    "description": tool.description
                }
                for tool in tools
            ]
            return web.json_response({"tools": tools_data})
        
        # Tool execution endpoint
        async def execute_tool(request: web_request.Request):
            tool_name = request.match_info['tool_name']
            
            try:
                # Get request body
                if request.content_type == 'application/json':
                    data = await request.json()
                    arguments = data.get('arguments', {})
                else:
                    arguments = {}
                
                # Validate tool exists
                tools = self.get_tools()
                tool_exists = any(t.name == tool_name for t in tools)
                if not tool_exists:
                    return web.json_response(
                        {"error": f"Tool '{tool_name}' not found"}, 
                        status=404
                    )
                
                # Execute tool
                result = await self.handle_tool_call(tool_name, arguments)
                
                return web.json_response({
                    "content": [
                        {
                            "type": "text", 
                            "text": json.dumps(result, indent=2) if not isinstance(result, str) else result
                        }
                    ]
                })
                
            except Exception as e:
                return web.json_response(
                    {"error": str(e)}, 
                    status=500
                )
        
        # Register routes
        app.router.add_get('/health', health)
        app.router.add_get('/tools', list_tools)
        app.router.add_post('/tools/{tool_name}', execute_tool)
        
        # Start server
        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, '0.0.0.0', port)
        
        print(f"{self.server_name} HTTP server running on port {port}")
        await site.start()
        
        # Keep server running
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            pass
        finally:
            await runner.cleanup()