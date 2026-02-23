import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  BaseAccessServer,
  Tool,
  Resource,
  CallToolResult,
  getRequestContext,
  getActingUser,
  getActingUserUid,
  requestContextStorage,
  RequestContext,
} from "../base-server.js";
import { CallToolRequest } from "@modelcontextprotocol/sdk/types.js";

// Concrete implementation for testing
class TestServer extends BaseAccessServer {
  // Store the last captured context for verification
  public lastCapturedContext?: RequestContext;

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
      {
        name: "get_context",
        description: "Returns the current request context",
        inputSchema: {
          type: "object",
          properties: {},
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
    // Capture the context for verification
    this.lastCapturedContext = getRequestContext();

    if (request.params.name === "get_context") {
      const context = getRequestContext();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              actingUser: context?.actingUser,
              actingUserUid: context?.actingUserUid,
              requestId: context?.requestId,
            }),
          },
        ],
      };
    }

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
      expect(data.tools).toHaveLength(2);
      expect(data.tools.map((t: { name: string }) => t.name)).toContain("test_tool");
      expect(data.tools.map((t: { name: string }) => t.name)).toContain("get_context");
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

describe("Request Context", () => {
  describe("getRequestContext", () => {
    it("should return undefined outside of request context", () => {
      const context = getRequestContext();
      expect(context).toBeUndefined();
    });

    it("should return context when inside requestContextStorage.run", () => {
      const testContext: RequestContext = {
        actingUser: "testuser@access-ci.org",
        actingUserUid: 12345,
        requestId: "req-123",
      };

      requestContextStorage.run(testContext, () => {
        const context = getRequestContext();
        expect(context).toBeDefined();
        expect(context?.actingUser).toBe("testuser@access-ci.org");
        expect(context?.actingUserUid).toBe(12345);
        expect(context?.requestId).toBe("req-123");
      });
    });
  });

  describe("getActingUser", () => {
    it("should throw when no acting user is set", () => {
      expect(() => getActingUser()).toThrow("No acting user specified");
    });

    it("should throw when context exists but actingUser is undefined", () => {
      const testContext: RequestContext = {
        requestId: "req-123",
      };

      requestContextStorage.run(testContext, () => {
        expect(() => getActingUser()).toThrow("No acting user specified");
      });
    });

    it("should return acting user when set", () => {
      const testContext: RequestContext = {
        actingUser: "researcher@access-ci.org",
      };

      requestContextStorage.run(testContext, () => {
        expect(getActingUser()).toBe("researcher@access-ci.org");
      });
    });
  });

  describe("getActingUserUid", () => {
    it("should throw when no acting user UID is set", () => {
      expect(() => getActingUserUid()).toThrow("No acting user UID specified");
    });

    it("should throw when context exists but actingUserUid is undefined", () => {
      const testContext: RequestContext = {
        actingUser: "testuser@access-ci.org",
      };

      requestContextStorage.run(testContext, () => {
        expect(() => getActingUserUid()).toThrow("No acting user UID specified");
      });
    });

    it("should return acting user UID when set", () => {
      const testContext: RequestContext = {
        actingUserUid: 98765,
      };

      requestContextStorage.run(testContext, () => {
        expect(getActingUserUid()).toBe(98765);
      });
    });
  });
});

describe("HTTP Mode - Acting User Headers", () => {
  let server: TestServer;
  let port: number;
  let baseUrl: string;

  beforeEach(async () => {
    server = new TestServer();
    port = 3200 + Math.floor(Math.random() * 100);
    baseUrl = `http://localhost:${port}`;
    await server.start({ httpPort: port });
  });

  describe("X-Acting-User header", () => {
    it("should extract X-Acting-User header and make it available in context", async () => {
      const response = await fetch(`${baseUrl}/tools/get_context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Acting-User": "researcher@access-ci.org",
        },
        body: JSON.stringify({ arguments: {} }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      const result = JSON.parse(data.content[0].text);
      expect(result.actingUser).toBe("researcher@access-ci.org");
    });

    it("should extract X-Acting-User-Uid header and parse as number", async () => {
      const response = await fetch(`${baseUrl}/tools/get_context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Acting-User-Uid": "12345",
        },
        body: JSON.stringify({ arguments: {} }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      const result = JSON.parse(data.content[0].text);
      expect(result.actingUserUid).toBe(12345);
    });

    it("should extract X-Request-ID header", async () => {
      const response = await fetch(`${baseUrl}/tools/get_context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": "req-abc-123",
        },
        body: JSON.stringify({ arguments: {} }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      const result = JSON.parse(data.content[0].text);
      expect(result.requestId).toBe("req-abc-123");
    });

    it("should extract all headers together", async () => {
      const response = await fetch(`${baseUrl}/tools/get_context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Acting-User": "admin@access-ci.org",
          "X-Acting-User-Uid": "999",
          "X-Request-ID": "full-context-test",
        },
        body: JSON.stringify({ arguments: {} }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      const result = JSON.parse(data.content[0].text);
      expect(result.actingUser).toBe("admin@access-ci.org");
      expect(result.actingUserUid).toBe(999);
      expect(result.requestId).toBe("full-context-test");
    });

    it("should handle missing headers gracefully", async () => {
      const response = await fetch(`${baseUrl}/tools/get_context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ arguments: {} }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      const result = JSON.parse(data.content[0].text);
      expect(result.actingUser).toBeUndefined();
      expect(result.actingUserUid).toBeUndefined();
      expect(result.requestId).toBeUndefined();
    });

    it("should handle invalid UID header gracefully", async () => {
      const response = await fetch(`${baseUrl}/tools/get_context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Acting-User-Uid": "not-a-number",
        },
        body: JSON.stringify({ arguments: {} }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      const result = JSON.parse(data.content[0].text);
      // NaN becomes null when JSON serialized
      expect(result.actingUserUid).toBeNull();
    });
  });
});

// Server that requires API key
class ApiKeyRequiredServer extends BaseAccessServer {
  constructor() {
    super("apikey-server", "1.0.0", "https://api.example.com", {
      requireApiKey: true,
    });
  }

  protected getTools(): Tool[] {
    return [
      {
        name: "protected_tool",
        description: "A tool that requires API key",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ];
  }

  protected getResources(): Resource[] {
    return [];
  }

  protected async handleToolCall(request: CallToolRequest): Promise<CallToolResult> {
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true, tool: request.params.name }),
        },
      ],
    };
  }
}

describe("API Key Authentication", () => {
  let server: ApiKeyRequiredServer;
  let port: number;
  let baseUrl: string;
  const TEST_API_KEY = "test-secret-api-key-12345";

  beforeEach(async () => {
    server = new ApiKeyRequiredServer();
    port = 3300 + Math.floor(Math.random() * 100);
    baseUrl = `http://localhost:${port}`;
    // Set the API key environment variable
    process.env.MCP_API_KEY = TEST_API_KEY;
    await server.start({ httpPort: port });
  });

  afterEach(() => {
    delete process.env.MCP_API_KEY;
  });

  describe("Tool endpoints with requireApiKey", () => {
    it("should reject requests without API key", async () => {
      const response = await fetch(`${baseUrl}/tools/protected_tool`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ arguments: {} }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain("Invalid or missing API key");
    });

    it("should reject requests with incorrect API key", async () => {
      const response = await fetch(`${baseUrl}/tools/protected_tool`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": "wrong-key",
        },
        body: JSON.stringify({ arguments: {} }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain("Invalid or missing API key");
    });

    it("should accept requests with correct API key", async () => {
      const response = await fetch(`${baseUrl}/tools/protected_tool`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": TEST_API_KEY,
        },
        body: JSON.stringify({ arguments: {} }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      const result = JSON.parse(data.content[0].text);
      expect(result.success).toBe(true);
    });

    it("should allow health endpoint without API key", async () => {
      const response = await fetch(`${baseUrl}/health`);
      expect(response.status).toBe(200);
    });

    it("should allow tools listing without API key", async () => {
      const response = await fetch(`${baseUrl}/tools`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tools).toHaveLength(1);
    });
  });

  describe("Server misconfiguration", () => {
    it("should return 500 when MCP_API_KEY is not configured", async () => {
      // Remove the API key
      delete process.env.MCP_API_KEY;

      const response = await fetch(`${baseUrl}/tools/protected_tool`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": "some-key",
        },
        body: JSON.stringify({ arguments: {} }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain("Server misconfiguration");
    });
  });
});
