import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  InitializeRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";
import express, { Express, Request, Response } from "express";

interface ServiceEndpoint {
  name: string;
  url: string;
}

export abstract class BaseAccessServer {
  protected server: Server;
  protected transport: StdioServerTransport;
  private _httpClient?: AxiosInstance;
  private _httpServer?: Express;
  private _httpPort?: number;

  constructor(
    protected serverName: string,
    protected version: string,
    protected baseURL: string = "https://support.access-ci.org/api",
  ) {
    this.server = new Server(
      {
        name: serverName,
        version: version,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      },
    );

    this.transport = new StdioServerTransport();
    this.setupHandlers();
  }

  protected get httpClient(): AxiosInstance {
    if (!this._httpClient) {
      const headers: any = {
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
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error("Error handling tool call:", errorMessage);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });

    this.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (request) => {
        try {
          return await this.handleResourceRead(request);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.error("Error reading resource:", errorMessage);
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
      },
    );
  }

  protected abstract getTools(): any[];
  protected abstract getResources(): any[];
  protected abstract handleToolCall(request: any): Promise<any>;
  protected async handleResourceRead(request: any): Promise<any> {
    throw new Error("Resource reading not supported by this server");
  }

  /**
   * Start the MCP server with optional HTTP service layer for inter-server communication
   */
  async start(options?: { httpPort?: number }) {
    // Start HTTP service layer if port is specified
    if (options?.httpPort) {
      this._httpPort = options.httpPort;
      await this.startHttpService();
    }

    await this.server.connect(this.transport);
    // MCP servers should not output anything to stderr/stdout when running
    // as it interferes with JSON-RPC communication
  }

  /**
   * Start HTTP service layer for inter-server communication
   */
  private async startHttpService(): Promise<void> {
    if (!this._httpPort) return;

    this._httpServer = express();
    this._httpServer.use(express.json());

    // Health check endpoint
    this._httpServer.get('/health', (req: Request, res: Response) => {
      res.json({
        server: this.serverName,
        version: this.version,
        status: 'healthy',
        timestamp: new Date().toISOString()
      });
    });

    // List available tools endpoint
    this._httpServer.get('/tools', (req: Request, res: Response) => {
      try {
        const tools = this.getTools();
        res.json({ tools });
      } catch (error) {
        res.status(500).json({ error: 'Failed to list tools' });
      }
    });

    // Tool execution endpoint
    this._httpServer.post('/tools/:toolName', async (req: Request, res: Response) => {
      try {
        const { toolName } = req.params;
        const { arguments: args = {} } = req.body;

        // Validate that the tool exists
        const tools = this.getTools();
        const tool = tools.find(t => t.name === toolName);
        if (!tool) {
          return res.status(404).json({ error: `Tool '${toolName}' not found` });
        }

        // Execute the tool
        const request = {
          params: {
            name: toolName,
            arguments: args
          }
        };

        const result = await this.handleToolCall(request);
        res.json(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: errorMessage });
      }
    });

    // Start HTTP server
    return new Promise((resolve, reject) => {
      this._httpServer!.listen(this._httpPort, () => {
        resolve();
      }).on('error', reject);
    });
  }

  /**
   * Call a tool on another ACCESS-CI MCP server via HTTP
   */
  protected async callRemoteServer(
    serviceName: string,
    toolName: string,
    args: Record<string, any> = {}
  ): Promise<any> {
    const serviceUrl = this.getServiceEndpoint(serviceName);
    if (!serviceUrl) {
      throw new Error(`Service '${serviceName}' not found. Check ACCESS_MCP_SERVICES environment variable.`);
    }

    const response = await axios.post(`${serviceUrl}/tools/${toolName}`, {
      arguments: args
    }, {
      timeout: 30000,
      validateStatus: () => true
    });

    if (response.status !== 200) {
      throw new Error(`Remote server call failed: ${response.status} ${response.data?.error || response.statusText}`);
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
    services.split(',').forEach(service => {
      const [name, url] = service.split('=');
      if (name && url) {
        serviceMap[name.trim()] = url.trim();
      }
    });

    return serviceMap[serviceName] || null;
  }
}
