import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  InitializeRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios, { AxiosInstance } from 'axios';

export abstract class BaseAccessServer {
  protected server: Server;
  protected transport: StdioServerTransport;
  private _httpClient?: AxiosInstance;

  constructor(
    protected serverName: string, 
    protected version: string,
    protected baseURL: string = 'https://support.access-ci.org/api'
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
      }
    );

    this.transport = new StdioServerTransport();
    this.setupHandlers();
  }

  protected get httpClient(): AxiosInstance {
    if (!this._httpClient) {
      const headers: any = {
        'User-Agent': `${this.serverName}/${this.version}`,
      };

      // Add authentication if API key is provided
      const apiKey = process.env.ACCESS_CI_API_KEY;
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
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
        console.error('Error handling tool call:', errorMessage);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      try {
        return await this.handleResourceRead(request);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error reading resource:', errorMessage);
        return {
          contents: [
            {
              uri: request.params.uri,
              mimeType: 'text/plain',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  protected abstract getTools(): any[];
  protected abstract getResources(): any[];
  protected abstract handleToolCall(request: any): Promise<any>;
  protected abstract handleResourceRead(request: any): Promise<any>;

  async start() {
    await this.server.connect(this.transport);
    // MCP servers should not output anything to stderr/stdout when running
    // as it interferes with JSON-RPC communication
  }
}