import { describe, it, expect, beforeEach } from "vitest";
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

  describe("scaffold-stage behavior", () => {
    it("returns a not-implemented error for list_capabilities", async () => {
      const result = await server["handleToolCall"]({
        method: "tools/call",
        params: { name: "list_capabilities", arguments: {} },
      });

      expect(result.isError).toBe(true);
      const payload = JSON.parse((result.content[0] as TextContent).text);
      expect(payload.error).toBe("Not yet implemented");
      expect(payload.stage).toBe("scaffold");
    });

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
