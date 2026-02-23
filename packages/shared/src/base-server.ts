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
import { AsyncLocalStorage } from "node:async_hooks";
import { createLogger, Logger } from "./logger.js";
import { traceMcpToolCall } from "./telemetry.js";

// Re-export SDK types for convenience
export type { Tool, Resource, Prompt, CallToolResult, ReadResourceResult, GetPromptResult };

/**
 * Request context passed via AsyncLocalStorage for per-request data.
 * This allows tool handlers to access request-scoped data like the acting user
 * without needing to thread it through every function call.
 */
export interface RequestContext {
  /**
   * The ACCESS ID of the user performing the action.
   * Passed via X-Acting-User header from the agent.
   * Format: "username@access-ci.org"
   */
  actingUser?: string;
  /**
   * The Drupal user ID of the acting user.
   * Passed via X-Acting-User-Uid header from the agent.
   * Used for content attribution in Drupal.
   */
  actingUserUid?: number;
  /** Unique request ID for tracing (from X-Request-ID header) */
  requestId?: string;
}

/** AsyncLocalStorage instance for request context */
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request context. Returns undefined if called outside a request.
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Get the acting user's ACCESS ID from the current request context.
 * Throws an error if no acting user is set - use this for operations that require attribution.
 */
export function getActingUser(): string {
  const context = getRequestContext();
  if (!context?.actingUser) {
    throw new Error(
      "No acting user specified. The X-Acting-User header must be set to the ACCESS ID " +
        "(username@access-ci.org) of the person performing this action."
    );
  }
  return context.actingUser;
}

/**
 * Get the acting user's Drupal UID from the current request context.
 * Throws an error if no acting user UID is set - use this for Drupal content attribution.
 */
export function getActingUserUid(): number {
  const context = getRequestContext();
  if (!context?.actingUserUid) {
    throw new Error(
      "No acting user UID specified. The X-Acting-User-Uid header must be set to the Drupal user ID " +
        "of the person performing this action."
    );
  }
  return context.actingUserUid;
}

/**
 * Options for BaseAccessServer constructor
 */
export interface BaseAccessServerOptions {
  /**
   * Require API key authentication for tool execution endpoints.
   * When enabled, requests to /tools/:toolName must include a valid
   * X-Api-Key header matching the MCP_API_KEY environment variable.
   * Enable this for servers that perform write operations on behalf of users.
   */
  requireApiKey?: boolean;
}

export abstract class BaseAccessServer {
  protected server: Server;
  protected transport: StdioServerTransport;
  protected logger: Logger;
  private _httpClient?: AxiosInstance;
  private _httpServer?: Express;
  private _httpPort?: number;
  private _sseTransports: Map<string, SSEServerTransport> = new Map();
  private _requireApiKey: boolean;

  constructor(
    protected serverName: string,
    protected version: string,
    protected baseURL: string = "https://support.access-ci.org/api",
    options: BaseAccessServerOptions = {}
  ) {
    this._requireApiKey = options.requireApiKey ?? false;
    // Note: Telemetry is initialized via --import flag in the Dockerfile
    // This ensures OpenTelemetry is set up BEFORE express/http are imported
    // See packages/shared/src/telemetry-bootstrap.ts

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
      // Validate API key if required
      if (this._requireApiKey) {
        const expectedApiKey = process.env.MCP_API_KEY;
        const providedApiKey = req.header("X-Api-Key");

        if (!expectedApiKey) {
          this.logger.error("MCP_API_KEY environment variable not set but requireApiKey is enabled");
          res.status(500).json({ error: "Server misconfiguration: API key not configured" });
          return;
        }

        if (!providedApiKey || providedApiKey !== expectedApiKey) {
          this.logger.warn("Unauthorized tool call attempt", {
            tool: req.params.toolName,
            hasKey: !!providedApiKey,
          });
          res.status(401).json({ error: "Invalid or missing API key" });
          return;
        }
      }

      // Extract request context from headers
      const uidHeader = req.header("X-Acting-User-Uid");
      const context: RequestContext = {
        actingUser: req.header("X-Acting-User"),
        actingUserUid: uidHeader ? parseInt(uidHeader, 10) : undefined,
        requestId: req.header("X-Request-ID"),
      };

      const { toolName } = req.params;
      const { arguments: args = {} } = req.body;

      // Validate that the tool exists (before tracing to avoid noisy spans)
      const tools = this.getTools();
      const tool = tools.find((t) => t.name === toolName);
      if (!tool) {
        res.status(404).json({ error: `Tool '${toolName}' not found` });
        return;
      }

      // Run the handler within the request context
      await requestContextStorage.run(context, async () => {
        // Wrap tool execution with OpenTelemetry tracing
        try {
          const result = await traceMcpToolCall(toolName, args, async (span) => {
            // Add server info to span
            span.setAttribute("mcp.server.name", this.serverName);
            span.setAttribute("mcp.server.version", this.version);

            // Add request context if available
            if (context.requestId) {
              span.setAttribute("mcp.request.id", context.requestId);
            }

            // Execute the tool
            const request: CallToolRequest = {
              method: "tools/call",
              params: {
                name: toolName,
                arguments: args,
              },
            };

            const toolResult = await this.handleToolCall(request);

            // Record result info on span
            if (toolResult.isError) {
              span.setAttribute("mcp.result.is_error", true);
            }

            return toolResult;
          });

          res.json(result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          res.status(500).json({ error: errorMessage });
        }
      });
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
   * Call a tool on another ACCESS-CI MCP server via HTTP.
   * Automatically forwards acting user context from the current request.
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

    // Forward acting user context to the remote server
    const context = getRequestContext();
    const headers: Record<string, string> = {};
    if (context?.actingUser) {
      headers["X-Acting-User"] = context.actingUser;
    }
    if (context?.actingUserUid) {
      headers["X-Acting-User-Uid"] = String(context.actingUserUid);
    }
    if (context?.requestId) {
      headers["X-Request-ID"] = context.requestId;
    }

    const response = await axios.post(
      `${serviceUrl}/tools/${toolName}`,
      {
        arguments: args,
      },
      {
        timeout: 30000,
        validateStatus: () => true,
        headers,
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
