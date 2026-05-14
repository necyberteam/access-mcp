import {
  BaseAccessServer,
  Tool,
  Resource,
  CallToolResult,
} from "@access-mcp/shared";
import {
  CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("../package.json");

// Pillar 3 — Discovery meta-server.
// See docs/2026-05-12-tool-catalog-architecture.md §Pillar 3.
//
// Three tools expose progressive disclosure of the MCP tool catalog:
//   list_capabilities(query?, category?, limit?) — names + one-line summaries
//   describe_tools(names)                        — full schemas for named tools
//   execute_tool(name, args, fields?)            — uniform dispatch w/ projection
//
// This file is the scaffold. Tool handlers return stub responses until
// introspection (next commit) populates the in-memory catalog from peer
// MCP servers' tools/list at boot.

interface ListCapabilitiesArgs {
  query?: string;
  category?: string;
  limit?: number;
}

interface DescribeToolsArgs {
  names: string[];
}

interface ExecuteToolArgs {
  name: string;
  args?: Record<string, unknown>;
  fields?: string[];
}

export class DiscoveryServer extends BaseAccessServer {
  constructor() {
    super("access-mcp-discovery", version);
  }

  protected getResources(): Resource[] {
    return [];
  }

  protected getTools(): Tool[] {
    return [
      {
        name: "list_capabilities",
        description:
          "Browse the MCP tool catalog. Returns tool names with one-line summaries and server tags — no schemas. Use to discover what's available; then call describe_tools to get the schema for tools you want to invoke.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "Optional keyword filter against tool names and summaries.",
            },
            category: {
              type: "string",
              description:
                "Optional server-tag or category filter (e.g. 'events', 'system-status').",
            },
            limit: {
              type: "number",
              description: "Max entries to return. Default 20.",
              default: 20,
            },
          },
        },
      },
      {
        name: "describe_tools",
        description:
          "Return full JSON schemas + example invocations for the named tools. Call after list_capabilities to learn how to invoke a tool you've identified.",
        inputSchema: {
          type: "object",
          properties: {
            names: {
              type: "array",
              items: { type: "string" },
              description:
                "Tool names to describe. Each name must match an entry from list_capabilities.",
            },
          },
          required: ["names"],
        },
      },
      {
        name: "execute_tool",
        description:
          "Invoke a tool from the catalog. Pass the tool name, its arguments object, and an optional fields projection to slim the response.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Tool name to invoke (from list_capabilities).",
            },
            args: {
              type: "object",
              description:
                "Arguments object matching the tool's inputSchema (from describe_tools).",
              additionalProperties: true,
            },
            fields: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional response projection (forwarded to the underlying tool). Dotted path syntax: 'total', 'items[].name', etc.",
            },
          },
          required: ["name"],
        },
      },
    ];
  }

  protected async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    const { name, arguments: args = {} } = request.params;

    switch (name) {
      case "list_capabilities":
        return this.listCapabilities(args as unknown as ListCapabilitiesArgs);
      case "describe_tools":
        return this.describeTools(args as unknown as DescribeToolsArgs);
      case "execute_tool":
        return this.executeTool(args as unknown as ExecuteToolArgs);
      default:
        return this.errorResponse(`Unknown tool: ${name}`);
    }
  }

  // Stub implementations — replaced in the introspection commit.
  private async listCapabilities(_args: ListCapabilitiesArgs): Promise<CallToolResult> {
    return this.notImplementedResponse(
      "list_capabilities will return catalog entries after introspection lands."
    );
  }

  private async describeTools(_args: DescribeToolsArgs): Promise<CallToolResult> {
    return this.notImplementedResponse(
      "describe_tools will return tool schemas after introspection lands."
    );
  }

  private async executeTool(_args: ExecuteToolArgs): Promise<CallToolResult> {
    return this.notImplementedResponse(
      "execute_tool will dispatch to peer servers after introspection lands."
    );
  }

  private notImplementedResponse(detail: string): CallToolResult {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: "Not yet implemented",
            detail,
            stage: "scaffold",
          }),
        },
      ],
      isError: true,
    };
  }
}
