import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  listFilesSchema,
  readFileSchema,
  uploadFileSchema,
  deleteSchema,
  createShareSchema,
  createToolResult,
  createErrorResult,
} from "@mcp-connectors/core";
import type { NextcloudClient } from "../client.js";

export function registerFileTools(server: Server, client: NextcloudClient) {
  server.setRequestHandler(
    { method: "tools/list" } as any,
    async () => ({
      tools: [
        {
          name: "nextcloud_list_files",
          description: "List files and folders in a Nextcloud directory",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Directory path to list (default: /)",
                default: "/",
              },
            },
          },
        },
        {
          name: "nextcloud_read_file",
          description: "Read the contents of a text file from Nextcloud",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to the file to read",
              },
            },
            required: ["path"],
          },
        },
        {
          name: "nextcloud_upload_file",
          description: "Upload a file to Nextcloud",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Destination path for the file",
              },
              content: {
                type: "string",
                description: "File content to upload",
              },
            },
            required: ["path", "content"],
          },
        },
        {
          name: "nextcloud_delete",
          description: "Delete a file or folder from Nextcloud",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to delete",
              },
            },
            required: ["path"],
          },
        },
        {
          name: "nextcloud_create_share",
          description: "Create a public share link for a file or folder",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Path to share",
              },
              password: {
                type: "string",
                description: "Optional password for the share",
              },
              expireDate: {
                type: "string",
                description: "Optional expiration date (YYYY-MM-DD)",
              },
            },
            required: ["path"],
          },
        },
      ],
    })
  );

  server.setRequestHandler(
    { method: "tools/call" } as any,
    async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "nextcloud_list_files": {
            const parsed = listFilesSchema.parse(args);
            const files = await client.listFiles(parsed.path);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(createToolResult(files), null, 2),
                },
              ],
            };
          }

          case "nextcloud_read_file": {
            const parsed = readFileSchema.parse(args);
            const content = await client.readFile(parsed.path);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(createToolResult({ path: parsed.path, content }), null, 2),
                },
              ],
            };
          }

          case "nextcloud_upload_file": {
            const parsed = uploadFileSchema.parse(args);
            await client.uploadFile(parsed.path, parsed.content);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(createToolResult({ path: parsed.path, message: "File uploaded successfully" }), null, 2),
                },
              ],
            };
          }

          case "nextcloud_delete": {
            const parsed = deleteSchema.parse(args);
            await client.delete(parsed.path);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(createToolResult({ path: parsed.path, message: "Deleted successfully" }), null, 2),
                },
              ],
            };
          }

          case "nextcloud_create_share": {
            const parsed = createShareSchema.parse(args);
            const share = await client.createShare(parsed.path, {
              password: parsed.password,
              expireDate: parsed.expireDate,
            });
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(createToolResult(share), null, 2),
                },
              ],
            };
          }

          default:
            return null; // Let other handlers process
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(createErrorResult(message), null, 2),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
