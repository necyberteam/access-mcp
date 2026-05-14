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

  describe("scaffold-stage behavior (describe_tools + execute_tool)", () => {
    it("returns a not-implemented error for describe_tools", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: { name: "describe_tools", arguments: { names: ["search_events"] } },
      });

      expect(result.isError).toBe(true);
      const payload = JSON.parse((result.content[0] as TextContent).text);
      expect(payload.stage).toBe("scaffold");
    });

    it("returns a not-implemented error for execute_tool", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: { name: "execute_tool", arguments: { name: "search_events" } },
      });

      expect(result.isError).toBe(true);
      const payload = JSON.parse((result.content[0] as TextContent).text);
      expect(payload.stage).toBe("scaffold");
    });

    it("errors on unknown tool names", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: { name: "bogus_tool", arguments: {} },
      });

      const payload = JSON.parse((result.content[0] as TextContent).text);
      expect(payload.error).toContain("Unknown tool");
    });
  });
});
