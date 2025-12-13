import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { BaseAccessServer, Tool, Resource, CallToolResult } from "../base-server.js";
import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";

// Concrete implementation for testing
class TestServer extends BaseAccessServer {
  constructor() {
    super("test-server", "1.0.0", "https://api.example.com");
  }

  protected getTools(): Tool[] {
    return [
      {
        name: "test_tool",
        description: "A test tool",
        inputSchema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    ];
  }

  protected getResources(): Resource[] {
    return [
      {
        uri: "test://resource",
        name: "Test Resource",
        mimeType: "application/json",
      },
    ];
  }

  protected async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    if (request.params.name === "test_tool") {
      const args = request.params.arguments as { message?: string };
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ echo: args.message || "no message" }),
          },
        ],
      };
    }
    return this.errorResponse(`Unknown tool: ${request.params.name}`);
  }
}

describe("BaseAccessServer HTTP Mode", () => {
  let server: TestServer;
  let port: number;
  let baseUrl: string;

  beforeEach(async () => {
    server = new TestServer();
    port = 3100 + Math.floor(Math.random() * 100);
    baseUrl = `http://localhost:${port}`;
    await server.start({ httpPort: port });
  });

  afterEach(async () => {
    // Server cleanup handled by process exit
  });

  describe("Health endpoint", () => {
    it("should return health status", async () => {
      const response = await fetch(`${baseUrl}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.server).toBe("test-server");
      expect(data.version).toBe("1.0.0");
      expect(data.status).toBe("healthy");
      expect(data.timestamp).toBeDefined();
    });
  });

  describe("Tools endpoint", () => {
    it("should list available tools", async () => {
      const response = await fetch(`${baseUrl}/tools`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tools).toHaveLength(1);
      expect(data.tools[0].name).toBe("test_tool");
    });
  });

  describe("Tool execution endpoint", () => {
    it("should execute a tool via POST", async () => {
      const response = await fetch(`${baseUrl}/tools/test_tool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arguments: { message: "hello" } }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBeDefined();
      const result = JSON.parse(data.content[0].text);
      expect(result.echo).toBe("hello");
    });

    it("should return 404 for unknown tool", async () => {
      const response = await fetch(`${baseUrl}/tools/unknown_tool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arguments: {} }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain("not found");
    });
  });

  describe("SSE endpoint", () => {
    it("should accept SSE connections", async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);

      try {
        const response = await fetch(`${baseUrl}/sse`, {
          signal: controller.signal,
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("text/event-stream");
      } catch (e: unknown) {
        // AbortError is expected when we timeout
        if (e instanceof Error && e.name !== "AbortError") {
          throw e;
        }
      } finally {
        clearTimeout(timeout);
      }
    });
  });
});

describe("BaseAccessServer helper methods", () => {
  let server: TestServer;

  beforeEach(() => {
    server = new TestServer();
  });

  describe("errorResponse", () => {
    it("should create error response without hint", () => {
      const result = server["errorResponse"]("Something went wrong");

      expect(result.isError).toBe(true);
      const textContent = result.content[0] as { type: string; text: string };
      const content = JSON.parse(textContent.text);
      expect(content.error).toBe("Something went wrong");
      expect(content.hint).toBeUndefined();
    });

    it("should create error response with hint", () => {
      const result = server["errorResponse"]("Invalid input", "Try using a number");

      expect(result.isError).toBe(true);
      const textContent = result.content[0] as { type: string; text: string };
      const content = JSON.parse(textContent.text);
      expect(content.error).toBe("Invalid input");
      expect(content.hint).toBe("Try using a number");
    });
  });

  describe("createJsonResource", () => {
    it("should create JSON resource response", () => {
      const result = server["createJsonResource"]("test://data", { foo: "bar" });

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe("test://data");
      expect(result.contents[0].mimeType).toBe("application/json");
      expect(JSON.parse(result.contents[0].text)).toEqual({ foo: "bar" });
    });
  });

  describe("createMarkdownResource", () => {
    it("should create Markdown resource response", () => {
      const result = server["createMarkdownResource"]("test://doc", "# Hello");

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe("test://doc");
      expect(result.contents[0].mimeType).toBe("text/markdown");
      expect(result.contents[0].text).toBe("# Hello");
    });
  });

  describe("createTextResource", () => {
    it("should create plain text resource response", () => {
      const result = server["createTextResource"]("test://text", "Hello world");

      expect(result.contents).toHaveLength(1);
      expect(result.contents[0].uri).toBe("test://text");
      expect(result.contents[0].mimeType).toBe("text/plain");
      expect(result.contents[0].text).toBe("Hello world");
    });
  });
});
