import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { NextcloudConfig } from "@mcp-connectors/core";
import { NextcloudClient } from "./client.js";
import { registerFileTools } from "./tools/files.js";
import { registerCalendarTools } from "./tools/calendar.js";
import { registerContactTools } from "./tools/contacts.js";

export class NextcloudConnector {
  private client: NextcloudClient;
  private server: Server;

  constructor(config: NextcloudConfig) {
    this.client = new NextcloudClient(config);
    this.server = new Server(
      {
        name: "nextcloud-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.registerTools();
  }

  private registerTools() {
    // Register all tool handlers
    // Note: Each register function extends the previous handlers
    registerFileTools(this.server, this.client);
    registerCalendarTools(this.server, this.client);
    registerContactTools(this.server, this.client);
  }

  /**
   * Start the server with STDIO transport (for Claude Desktop)
   */
  async startStdio() {
    const { StdioServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/stdio.js"
    );
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Nextcloud MCP server running on stdio");
  }

  /**
   * Start the server with SSE transport (for Kubernetes/network access)
   */
  async startSSE(port: number = 3000) {
    const { SSEServerTransport } = await import(
      "@modelcontextprotocol/sdk/server/sse.js"
    );

    // Create HTTP server for SSE
    const http = await import("node:http");

    const httpServer = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "healthy" }));
        return;
      }

      if (req.url === "/sse" && req.method === "GET") {
        const transport = new SSEServerTransport("/message", res);
        await this.server.connect(transport);
        return;
      }

      if (req.url === "/message" && req.method === "POST") {
        // Handle incoming messages for SSE transport
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          // The SSE transport handles this internally
          res.writeHead(200);
          res.end();
        });
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    });

    httpServer.listen(port, () => {
      console.error(`Nextcloud MCP server running on http://localhost:${port}`);
      console.error(`SSE endpoint: http://localhost:${port}/sse`);
      console.error(`Health check: http://localhost:${port}/health`);
    });
  }

  getServer(): Server {
    return this.server;
  }
}
