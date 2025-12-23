import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Resource,
  Prompt,
  CallToolResult,
  ReadResourceResult,
  GetPromptResult,
  CallToolRequest,
  ReadResourceRequest,
  GetPromptRequest,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";
import express, { Express, Request, Response } from "express";
import { IncomingMessage, ServerResponse } from "node:http";
import { createLogger, Logger } from "./logger.js";

// Re-export SDK types for convenience
export type { Tool, Resource, Prompt, CallToolResult, ReadResourceResult, GetPromptResult };

export abstract class BaseAccessServer {
  protected server: Server;
  protected transport: StdioServerTransport;
  protected logger: Logger;
  private _httpClient?: AxiosInstance;
  private _httpServer?: Express;
  private _httpPort?: number;
  private _sseTransports: Map<string, SSEServerTransport> = new Map();

  constructor(
    protected serverName: string,
    protected version: string,
    protected baseURL: string = "https://support.access-ci.org/api"
  ) {
    this.logger = createLogger(serverName);
    this.server = new Server(
      {
        name: serverName,
        version: version,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
      }
    );

    this.transport = new StdioServerTransport();
    this.setupHandlers();
  }

  protected get httpClient(): AxiosInstance {
    if (!this._httpClient) {
      const headers: Record<string, string> = {
        "User-Agent": `${this.serverName}/${this.version}`,
      };

      // Add authentication if API key is provided
      const apiKey = process.env.ACCESS_CI_API_KEY;
      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      this._httpClient = axios.create({
        baseURL: this.baseURL,
        timeout: 5000,
        headers,
        validateStatus: () => true, // Don't throw on HTTP errors
      });
    }
    return this._httpClient;
  }

  private setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        return { tools: this.getTools() };
      } catch (error: unknown) {
        // Silent error handling for MCP compatibility
        return { tools: [] };
      }
    });

    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        return { resources: this.getResources() };
      } catch (error: unknown) {
        // Silent error handling for MCP compatibility
        return { resources: [] };
      }
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        return await this.handleToolCall(request);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Error handling tool call", { error: errorMessage });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: errorMessage,
              }),
            },
          ],
          isError: true,
        };
      }
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        return await this.handleResourceRead(request);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Error reading resource", { error: errorMessage });
        return {
          contents: [
            {
              uri: request.params.uri,
              mimeType: "text/plain",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });

    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      try {
        return { prompts: this.getPrompts() };
      } catch (error: unknown) {
        // Silent error handling for MCP compatibility
        return { prompts: [] };
      }
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      try {
        return await this.handleGetPrompt(request);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Error getting prompt", { error: errorMessage });
        throw error;
      }
    });
  }

  protected abstract getTools(): Tool[];
  protected abstract getResources(): Resource[];
  protected abstract handleToolCall(request: CallToolRequest): Promise<CallToolResult>;

  /**
   * Get available prompts - override in subclasses to provide prompts
   */
  protected getPrompts(): Prompt[] {
    return [];
  }

  /**
   * Handle resource read requests - override in subclasses
   */
  protected async handleResourceRead(request: ReadResourceRequest): Promise<ReadResourceResult> {
    throw new Error(`Resource reading not supported by this server: ${request.params.uri}`);
  }

  /**
   * Handle get prompt requests - override in subclasses
   */
  protected async handleGetPrompt(request: GetPromptRequest): Promise<GetPromptResult> {
    throw new Error(`Prompt not found: ${request.params.name}`);
  }

  /**
   * Helper method to create a standard error response (MCP 2025 compliant)
   * @param message The error message
   * @param hint Optional suggestion for how to fix the error
   */
  protected errorResponse(message: string, hint?: string): CallToolResult {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            error: message,
            ...(hint && { hint }),
          }),
        },
      ],
      isError: true,
    };
  }

  /**
   * Helper method to create a JSON resource response
   * @param uri The resource URI
   * @param data The data to return as JSON
   */
  protected createJsonResource(uri: string, data: unknown) {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  /**
   * Helper method to create a Markdown resource response
   * @param uri The resource URI
   * @param markdown The markdown content
   */
  protected createMarkdownResource(uri: string, markdown: string) {
    return {
      contents: [
        {
          uri,
          mimeType: "text/markdown",
          text: markdown,
        },
      ],
    };
  }

  /**
   * Helper method to create a text resource response
   * @param uri The resource URI
   * @param text The plain text content
   */
  protected createTextResource(uri: string, text: string) {
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: text,
        },
      ],
    };
  }

  /**
   * Start the MCP server with optional HTTP service layer for inter-server communication
   */
  async start(options?: { httpPort?: number }) {
    // Start HTTP service layer if port is specified
    if (options?.httpPort) {
      this._httpPort = options.httpPort;
      await this.startHttpService();
      this.logger.info("HTTP server running", { port: this._httpPort });
    } else {
      // Only connect stdio transport when NOT in HTTP mode
      await this.server.connect(this.transport);
      // MCP servers should not output anything to stderr/stdout when running
      // as it interferes with JSON-RPC communication
    }
  }

  /**
   * Start HTTP service layer with SSE support for remote MCP connections
   */
  private async startHttpService(): Promise<void> {
    if (!this._httpPort) return;

    this._httpServer = express();
    this._httpServer.use(express.json());

    // Health check endpoint
    this._httpServer.get("/health", (req: Request, res: Response) => {
      res.json({
        server: this.serverName,
        version: this.version,
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
    });

    // SSE endpoint for MCP remote connections
    this._httpServer.get("/sse", async (req: Request, res: Response) => {
      this.logger.debug("New SSE connection");

      const transport = new SSEServerTransport("/messages", res as unknown as ServerResponse);
      const sessionId = transport.sessionId;
      this._sseTransports.set(sessionId, transport);

      // Clean up on disconnect
      res.on("close", () => {
        this.logger.debug("SSE connection closed", { sessionId });
        this._sseTransports.delete(sessionId);
      });

      // Create a new server instance for this SSE connection
      const sseServer = new Server(
        {
          name: this.serverName,
          version: this.version,
        },
        {
          capabilities: {
            resources: {},
            tools: {},
            prompts: {},
          },
        }
      );

      // Set up handlers for the SSE server (same as main server)
      this.setupServerHandlers(sseServer);

      await sseServer.connect(transport);
    });

    // Messages endpoint for SSE POST messages
    this._httpServer.post("/messages", async (req: Request, res: Response) => {
      const sessionId = req.query.sessionId as string;
      const transport = this._sseTransports.get(sessionId);

      if (!transport) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      await transport.handlePostMessage(
        req as unknown as IncomingMessage,
        res as unknown as ServerResponse,
        req.body
      );
    });

    // List available tools endpoint (for inter-server communication)
    this._httpServer.get("/tools", (req: Request, res: Response) => {
      try {
        const tools = this.getTools();
        res.json({ tools });
      } catch (error) {
        res.status(500).json({ error: "Failed to list tools" });
      }
    });

    // Tool execution endpoint (for inter-server communication)
    this._httpServer.post("/tools/:toolName", async (req: Request, res: Response) => {
      try {
        const { toolName } = req.params;
        const { arguments: args = {} } = req.body;

        // Validate that the tool exists
        const tools = this.getTools();
        const tool = tools.find((t) => t.name === toolName);
        if (!tool) {
          res.status(404).json({ error: `Tool '${toolName}' not found` });
          return;
        }

        // Execute the tool
        const request: CallToolRequest = {
          method: "tools/call",
          params: {
            name: toolName,
            arguments: args,
          },
        };

        const result = await this.handleToolCall(request);
        res.json(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: errorMessage });
      }
    });

    // Start HTTP server
    return new Promise<void>((resolve, reject) => {
      this._httpServer!.listen(this._httpPort!, "0.0.0.0", () => {
        resolve();
      }).on("error", reject);
    });
  }

  /**
   * Set up MCP handlers on a server instance
   */
  private setupServerHandlers(server: Server) {
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        return { tools: this.getTools() };
      } catch (error: unknown) {
        return { tools: [] };
      }
    });

    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        return { resources: this.getResources() };
      } catch (error: unknown) {
        return { resources: [] };
      }
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        return await this.handleToolCall(request);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Error handling tool call", { error: errorMessage });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: errorMessage,
              }),
            },
          ],
          isError: true,
        };
      }
    });

    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        return await this.handleResourceRead(request);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Error reading resource", { error: errorMessage });
        return {
          contents: [
            {
              uri: request.params.uri,
              mimeType: "text/plain",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });

    server.setRequestHandler(ListPromptsRequestSchema, async () => {
      try {
        return { prompts: this.getPrompts() };
      } catch (error: unknown) {
        return { prompts: [] };
      }
    });

    server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      try {
        return await this.handleGetPrompt(request);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error("Error getting prompt", { error: errorMessage });
        throw error;
      }
    });
  }

  /**
   * Call a tool on another ACCESS-CI MCP server via HTTP
   */
  protected async callRemoteServer(
    serviceName: string,
    toolName: string,
    args: Record<string, unknown> = {}
  ): Promise<unknown> {
    const serviceUrl = this.getServiceEndpoint(serviceName);
    if (!serviceUrl) {
      throw new Error(
        `Service '${serviceName}' not found. Check ACCESS_MCP_SERVICES environment variable.`
      );
    }

    const response = await axios.post(
      `${serviceUrl}/tools/${toolName}`,
      {
        arguments: args,
      },
      {
        timeout: 30000,
        validateStatus: () => true,
      }
    );

    if (response.status !== 200) {
      throw new Error(
        `Remote server call failed: ${response.status} ${response.data?.error || response.statusText}`
      );
    }

    return response.data;
  }

  /**
   * Get service endpoint from environment configuration
   * Expected format: ACCESS_MCP_SERVICES=nsf-awards=http://localhost:3001,xdmod-metrics=http://localhost:3002
   */
  private getServiceEndpoint(serviceName: string): string | null {
    const services = process.env.ACCESS_MCP_SERVICES;
    if (!services) return null;

    const serviceMap: Record<string, string> = {};
    services.split(",").forEach((service) => {
      const [name, url] = service.split("=");
      if (name && url) {
        serviceMap[name.trim()] = url.trim();
      }
    });

    return serviceMap[serviceName] || null;
  }
}
