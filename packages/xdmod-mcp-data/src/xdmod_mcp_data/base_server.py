#!/usr/bin/env python3
"""
Python Base ACCESS Server

Provides HTTP and SSE support for MCP servers to run in Docker containers,
equivalent to the TypeScript BaseAccessServer functionality.
"""

import asyncio
import os
import uuid
import json
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional

from aiohttp import web, web_request
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent


class SSESession:
    """Represents an active SSE session"""
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.queue: asyncio.Queue = asyncio.Queue()
        self.initialized = False


class BaseAccessServer(ABC):
    """Base class for ACCESS-CI MCP servers with HTTP and SSE support"""

    def __init__(self, server_name: str, version: str, base_url: Optional[str] = None):
        self.server_name = server_name
        self.version = version
        self.base_url = base_url or "https://access-ci.org"
        self.server = Server(server_name)
        self._sessions: Dict[str, SSESession] = {}
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

    async def _handle_jsonrpc_message(self, session: SSESession, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Handle incoming JSONRPC message and return response"""
        method = message.get("method")
        msg_id = message.get("id")
        params = message.get("params", {})

        try:
            if method == "initialize":
                session.initialized = True
                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "protocolVersion": "2024-11-05",
                        "capabilities": {
                            "tools": {},
                            "resources": {}
                        },
                        "serverInfo": {
                            "name": self.server_name,
                            "version": self.version
                        }
                    }
                }

            elif method == "notifications/initialized":
                # No response needed for notifications
                return None

            elif method == "tools/list":
                tools = self.get_tools()
                tools_data = [
                    {
                        "name": tool.name,
                        "description": tool.description,
                        "inputSchema": tool.inputSchema
                    }
                    for tool in tools
                ]
                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {"tools": tools_data}
                }

            elif method == "tools/call":
                tool_name = params.get("name")
                arguments = params.get("arguments", {})

                # Validate tool exists
                tools = self.get_tools()
                tool_exists = any(t.name == tool_name for t in tools)
                if not tool_exists:
                    return {
                        "jsonrpc": "2.0",
                        "id": msg_id,
                        "error": {
                            "code": -32601,
                            "message": f"Tool '{tool_name}' not found"
                        }
                    }

                # Execute tool
                result = await self.handle_tool_call(tool_name, arguments)

                # Format result as TextContent
                if isinstance(result, str):
                    text = result
                else:
                    text = json.dumps(result, indent=2)

                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "content": [{"type": "text", "text": text}]
                    }
                }

            elif method == "resources/list":
                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {"resources": []}
                }

            elif method == "prompts/list":
                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "error": {
                        "code": -32601,
                        "message": "Method not found"
                    }
                }

            else:
                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "error": {
                        "code": -32601,
                        "message": f"Method '{method}' not found"
                    }
                }

        except Exception as e:
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {
                    "code": -32603,
                    "message": str(e)
                }
            }

    async def _start_http_server(self, port: int):
        """Start HTTP server with SSE support for Docker deployment"""
        app = web.Application()

        # Health check endpoint
        async def health(request: web_request.Request):
            return web.json_response({
                "server": self.server_name,
                "version": self.version,
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            })

        # SSE endpoint
        async def sse_handler(request: web_request.Request):
            session_id = str(uuid.uuid4())
            session = SSESession(session_id)
            self._sessions[session_id] = session

            response = web.StreamResponse(
                status=200,
                reason='OK',
                headers={
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache, no-transform',
                    'Connection': 'keep-alive',
                }
            )
            await response.prepare(request)

            # Send endpoint event with session ID
            endpoint_event = f"event: endpoint\ndata: /messages?sessionId={session_id}\n\n"
            await response.write(endpoint_event.encode('utf-8'))

            try:
                # Keep connection alive and send queued messages
                while True:
                    try:
                        # Wait for messages with timeout for keepalive
                        message = await asyncio.wait_for(session.queue.get(), timeout=30)
                        event_data = f"event: message\ndata: {json.dumps(message)}\n\n"
                        await response.write(event_data.encode('utf-8'))
                    except asyncio.TimeoutError:
                        # Send keepalive comment
                        await response.write(b": keepalive\n\n")
            except (asyncio.CancelledError, ConnectionResetError):
                pass
            finally:
                # Cleanup session
                if session_id in self._sessions:
                    del self._sessions[session_id]

            return response

        # Messages endpoint for JSONRPC
        async def messages_handler(request: web_request.Request):
            session_id = request.query.get('sessionId')

            if not session_id or session_id not in self._sessions:
                return web.json_response(
                    {"error": "Session not found"},
                    status=404
                )

            session = self._sessions[session_id]

            try:
                data = await request.json()

                # Handle the JSONRPC message
                response = await self._handle_jsonrpc_message(session, data)

                if response:
                    # Queue response to be sent via SSE
                    await session.queue.put(response)

                # Return accepted status
                return web.Response(status=202, text="Accepted")

            except json.JSONDecodeError:
                return web.json_response(
                    {"error": "Invalid JSON"},
                    status=400
                )
            except Exception as e:
                return web.json_response(
                    {"error": str(e)},
                    status=500
                )

        # List tools endpoint (REST API)
        async def list_tools(request: web_request.Request):
            tools = self.get_tools()
            tools_data = [
                {
                    "name": tool.name,
                    "description": tool.description,
                    "inputSchema": tool.inputSchema
                }
                for tool in tools
            ]
            return web.json_response({"tools": tools_data})

        # Tool execution endpoint (REST API)
        async def execute_tool(request: web_request.Request):
            tool_name = request.match_info['tool_name']

            try:
                if request.content_type == 'application/json':
                    data = await request.json()
                    arguments = data.get('arguments', {})
                else:
                    arguments = {}

                tools = self.get_tools()
                tool_exists = any(t.name == tool_name for t in tools)
                if not tool_exists:
                    return web.json_response(
                        {"error": f"Tool '{tool_name}' not found"},
                        status=404
                    )

                result = await self.handle_tool_call(tool_name, arguments)

                # handle_tool_call returns List[TextContent] for MCP,
                # but the REST API needs plain JSON serialization
                if isinstance(result, list) and result and hasattr(result[0], 'text'):
                    # Already TextContent objects — extract their text/type
                    content = [{"type": item.type, "text": item.text} for item in result]
                elif isinstance(result, str):
                    content = [{"type": "text", "text": result}]
                else:
                    content = [{"type": "text", "text": json.dumps(result, indent=2)}]

                return web.json_response({"content": content})

            except Exception as e:
                return web.json_response(
                    {"error": str(e)},
                    status=500
                )

        # Register routes
        app.router.add_get('/health', health)
        app.router.add_get('/sse', sse_handler)
        app.router.add_post('/messages', messages_handler)
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
