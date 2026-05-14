import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "node:fs";
import { DiscoveryServer } from "./server.js";

interface TextContent {
  type: "text";
  text: string;
}

describe("DiscoveryServer", () => {
  let server: DiscoveryServer;

  beforeEach(() => {
    server = new DiscoveryServer();
  });

  describe("tool registration", () => {
    it("registers the three discovery tools", () => {
      const tools = server["getTools"]();
      const names = tools.map((t) => t.name);
      expect(names).toEqual(["list_capabilities", "describe_tools", "execute_tool"]);
    });

    it("list_capabilities advertises query, category, and limit parameters", () => {
      const tool = server["getTools"]().find((t) => t.name === "list_capabilities");
      const props = tool?.inputSchema.properties as Record<string, unknown>;
      expect(props.query).toBeDefined();
      expect(props.category).toBeDefined();
      expect(props.limit).toBeDefined();
    });

    it("describe_tools requires the names parameter", () => {
      const tool = server["getTools"]().find((t) => t.name === "describe_tools");
      expect(tool?.inputSchema.required).toContain("names");
    });

    it("execute_tool requires name and advertises args + fields parameters", () => {
      const tool = server["getTools"]().find((t) => t.name === "execute_tool");
      expect(tool?.inputSchema.required).toContain("name");
      const props = tool?.inputSchema.properties as Record<string, unknown>;
      expect(props.args).toBeDefined();
      expect(props.fields).toBeDefined();
    });
  });

  describe("list_capabilities", () => {
    function mockFetchReturning(tools: Array<{ name: string; description: string }>) {
      return vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              tools: tools.map((t) => ({
                ...t,
                inputSchema: { type: "object", properties: {} },
              })),
            }),
            { status: 200 }
          )
      ) as unknown as typeof fetch;
    }

    let tmpCache: string;

    beforeEach(async () => {
      // Use a unique temp cache so tests don't share state.
      tmpCache = `/tmp/discovery-test-${Date.now()}-${Math.random()}.json`;
      process.env.DISCOVERY_CATALOG_CACHE_PATH = tmpCache;
      server = new DiscoveryServer();
    });

    afterEach(async () => {
      await fs.rm(tmpCache, { force: true });
      delete process.env.DISCOVERY_CATALOG_CACHE_PATH;
    });

    it("returns catalog entries after initialization", async () => {
      const fetchImpl = mockFetchReturning([
        { name: "search_events", description: "Search ACCESS-CI events" },
      ]);
      await server.initializeCatalog({
        servicesEnv: "events=http://mcp-events:3000",
        fetchImpl,
      });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: { name: "list_capabilities", arguments: {} },
      });

      expect(result.isError).toBeFalsy();
      const payload = JSON.parse((result.content[0] as TextContent).text);
      expect(payload.total).toBe(1);
      expect(payload.items[0].name).toBe("search_events");
      expect(payload.items[0].server).toBe("events");
      expect(payload.metadata.catalog_servers).toEqual(["events"]);
    });
  });

  describe("describe_tools", () => {
    let tmpCache: string;

    beforeEach(async () => {
      tmpCache = `/tmp/discovery-test-${Date.now()}-${Math.random()}.json`;
      process.env.DISCOVERY_CATALOG_CACHE_PATH = tmpCache;
      server = new DiscoveryServer();
      const fetchImpl = vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              tools: [
                {
                  name: "search_events",
                  description: "Search ACCESS-CI events",
                  inputSchema: { type: "object", properties: { query: { type: "string" } } },
                  _meta: { supportsFieldProjection: true },
                },
              ],
            }),
            { status: 200 }
          )
      ) as unknown as typeof fetch;
      await server.initializeCatalog({
        servicesEnv: "events=http://mcp-events:3000",
        fetchImpl,
      });
    });

    afterEach(async () => {
      await fs.rm(tmpCache, { force: true });
      delete process.env.DISCOVERY_CATALOG_CACHE_PATH;
    });

    it("returns full tool definitions for the requested names", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: { name: "describe_tools", arguments: { names: ["search_events"] } },
      });

      expect(result.isError).toBeFalsy();
      const payload = JSON.parse((result.content[0] as TextContent).text);
      expect(payload.total).toBe(1);
      expect(payload.items[0].name).toBe("search_events");
      expect(payload.items[0].server).toBe("events");
      expect(payload.items[0].inputSchema.properties.query).toBeDefined();
      expect(payload.items[0]._meta.supportsFieldProjection).toBe(true);
    });

    it("surfaces unknown names in metadata instead of erroring", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "describe_tools",
          arguments: { names: ["search_events", "bogus_tool"] },
        },
      });

      expect(result.isError).toBeFalsy();
      const payload = JSON.parse((result.content[0] as TextContent).text);
      expect(payload.total).toBe(1);
      expect(payload.metadata.unknown).toEqual(["bogus_tool"]);
    });

    it("errors when names is missing or empty", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: { name: "describe_tools", arguments: { names: [] } },
      });

      const payload = JSON.parse((result.content[0] as TextContent).text);
      expect(payload.error).toContain("non-empty 'names' array");
    });
  });

  describe("execute_tool", () => {
    let tmpCache: string;

    beforeEach(async () => {
      tmpCache = `/tmp/discovery-test-${Date.now()}-${Math.random()}.json`;
      process.env.DISCOVERY_CATALOG_CACHE_PATH = tmpCache;
      server = new DiscoveryServer();
      const fetchImpl = vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              tools: [
                {
                  name: "search_events",
                  description: "Search ACCESS-CI events",
                  inputSchema: { type: "object" },
                },
              ],
            }),
            { status: 200 }
          )
      ) as unknown as typeof fetch;
      await server.initializeCatalog({
        servicesEnv: "events=http://mcp-events:3000",
        fetchImpl,
      });
    });

    afterEach(async () => {
      await fs.rm(tmpCache, { force: true });
      delete process.env.DISCOVERY_CATALOG_CACHE_PATH;
    });

    it("dispatches to the owning peer and passes through the response content", async () => {
      const spy = vi
        .spyOn(server as unknown as { callRemoteServer: Function }, "callRemoteServer")
        .mockResolvedValue({
          content: [{ type: "text", text: JSON.stringify({ total: 5, items: [] }) }],
        });

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "execute_tool",
          arguments: { name: "search_events", args: { query: "python" } },
        },
      });

      expect(result.isError).toBeFalsy();
      expect(spy).toHaveBeenCalledWith("events", "search_events", { query: "python" });
      const payload = JSON.parse((result.content[0] as TextContent).text);
      expect(payload.total).toBe(5);
    });

    it("merges top-level fields into the dispatched args", async () => {
      const spy = vi
        .spyOn(server as unknown as { callRemoteServer: Function }, "callRemoteServer")
        .mockResolvedValue({ content: [{ type: "text", text: "{}" }] });

      await server["handleToolCall"]({
        method: "tools/call",
        params: {
          name: "execute_tool",
          arguments: {
            name: "search_events",
            args: { query: "python" },
            fields: ["total", "items[].name"],
          },
        },
      });

      expect(spy).toHaveBeenCalledWith("events", "search_events", {
        query: "python",
        fields: ["total", "items[].name"],
      });
    });

    it("errors on unknown tool names with a helpful message", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: { name: "execute_tool", arguments: { name: "bogus_tool" } },
      });

      const payload = JSON.parse((result.content[0] as TextContent).text);
      expect(payload.error).toContain("Unknown tool: bogus_tool");
    });

    it("propagates a clean error when the peer dispatch throws", async () => {
      vi.spyOn(server as unknown as { callRemoteServer: Function }, "callRemoteServer")
        .mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: { name: "execute_tool", arguments: { name: "search_events" } },
      });

      const payload = JSON.parse((result.content[0] as TextContent).text);
      expect(payload.error).toContain("execute_tool dispatch failed");
      expect(payload.error).toContain("ECONNREFUSED");
    });
  });

  describe("unknown discovery-level tool names", () => {
    it("errors when an unknown tool name is passed to handleToolCall", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: { name: "bogus_tool", arguments: {} },
      });

      const payload = JSON.parse((result.content[0] as TextContent).text);
      expect(payload.error).toContain("Unknown tool");
    });
  });
});
