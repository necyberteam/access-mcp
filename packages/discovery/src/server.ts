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
import {
  buildCatalog,
  listCapabilities,
  PeerCatalogMap,
  ListCapabilitiesArgs as CatalogListArgs,
} from "./catalog.js";
const require = createRequire(import.meta.url);
const { version } = require("../package.json");

const DEFAULT_CACHE_PATH = "/data/discovery-catalog.json";

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

interface DescribeToolsArgs {
  names: string[];
}

interface ExecuteToolArgs {
  name: string;
  args?: Record<string, unknown>;
  fields?: string[];
}

export class DiscoveryServer extends BaseAccessServer {
  private catalog: PeerCatalogMap = {};
  private cachePath: string;

  constructor() {
    super("access-mcp-discovery", version);
    this.cachePath = process.env.DISCOVERY_CATALOG_CACHE_PATH ?? DEFAULT_CACHE_PATH;
  }

  /**
   * Override the start lifecycle to build the catalog before accepting requests.
   * Per the spec, discovery refuses to start if the catalog ends up empty
   * (no peers reachable AND no cached snapshot to fall back to).
   */
  async start(options?: { httpPort?: number }): Promise<void> {
    await this.initializeCatalog();
    await super.start(options);
  }

  /**
   * Test hook: build the catalog without standing up the HTTP server.
   */
  async initializeCatalog(overrides?: {
    servicesEnv?: string;
    fetchImpl?: typeof fetch;
    fetchTimeoutMs?: number;
  }): Promise<void> {
    this.catalog = await buildCatalog({
      servicesEnv: overrides?.servicesEnv,
      cachePath: this.cachePath,
      logger: this.logger,
      fetchImpl: overrides?.fetchImpl,
      fetchTimeoutMs: overrides?.fetchTimeoutMs,
    });
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
        return this.handleListCapabilities(args as unknown as CatalogListArgs);
      case "describe_tools":
        return this.describeTools(args as unknown as DescribeToolsArgs);
      case "execute_tool":
        return this.executeTool(args as unknown as ExecuteToolArgs);
      default:
        return this.errorResponse(`Unknown tool: ${name}`);
    }
  }

  private async handleListCapabilities(args: CatalogListArgs): Promise<CallToolResult> {
    const entries = listCapabilities(this.catalog, args);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            total: entries.length,
            items: entries,
            metadata: {
              filters_applied: {
                query: args.query ?? null,
                category: args.category ?? null,
                limit: args.limit ?? null,
              },
              catalog_servers: Object.keys(this.catalog),
            },
          }),
        },
      ],
    };
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
