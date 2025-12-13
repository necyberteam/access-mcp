import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, ChildProcess } from "child_process";
import path from "path";

/**
 * Integration tests for inter-server HTTP communication
 * These tests start actual MCP servers and test tool execution via HTTP
 */
describe("Inter-server Communication Integration Tests", () => {
  let nsfServer: ChildProcess;
  const NSF_PORT = 3199;
  const NSF_URL = `http://localhost:${NSF_PORT}`;

  beforeAll(async () => {
    // Start NSF Awards server in HTTP mode
    const serverPath = path.resolve(
      process.cwd(),
      "packages/nsf-awards/dist/index.js"
    );

    nsfServer = spawn("node", [serverPath], {
      env: {
        ...process.env,
        PORT: String(NSF_PORT),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    // Wait for server to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Server startup timeout"));
      }, 10000);

      nsfServer.stdout?.on("data", (data: Buffer) => {
        if (data.toString().includes("HTTP server running")) {
          clearTimeout(timeout);
          resolve();
        }
      });

      nsfServer.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }, 15000);

  afterAll(async () => {
    if (nsfServer) {
      nsfServer.kill("SIGTERM");
      // Wait for process to exit
      await new Promise<void>((resolve) => {
        nsfServer.on("exit", () => resolve());
        setTimeout(resolve, 1000); // Fallback timeout
      });
    }
  });

  describe("NSF Awards Server HTTP API", () => {
    it("should respond to health check", async () => {
      const response = await fetch(`${NSF_URL}/health`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe("healthy");
      expect(data.server).toBe("access-mcp-nsf-awards");
    });

    it("should list available tools", async () => {
      const response = await fetch(`${NSF_URL}/tools`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.tools).toBeDefined();
      expect(Array.isArray(data.tools)).toBe(true);

      const toolNames = data.tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain("search_nsf_awards");
    });

    it("should execute search_nsf_awards tool via HTTP", async () => {
      const response = await fetch(`${NSF_URL}/tools/search_nsf_awards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arguments: {
            keyword: "machine learning",
            limit: 5,
          },
        }),
      });

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.content).toBeDefined();
      expect(data.content[0].type).toBe("text");

      // Parse the result
      const result = JSON.parse(data.content[0].text);
      expect(result).toBeDefined();
    }, 15000);

    it("should return 404 for unknown tool", async () => {
      const response = await fetch(`${NSF_URL}/tools/nonexistent_tool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ arguments: {} }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe("SSE Endpoint", () => {
    it("should accept SSE connections on /sse", async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);

      try {
        const response = await fetch(`${NSF_URL}/sse`, {
          signal: controller.signal,
        });

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toContain("text/event-stream");
      } catch (e: unknown) {
        // AbortError is expected
        if (e instanceof Error && e.name !== "AbortError") {
          throw e;
        }
      } finally {
        clearTimeout(timeout);
      }
    });
  });
});
