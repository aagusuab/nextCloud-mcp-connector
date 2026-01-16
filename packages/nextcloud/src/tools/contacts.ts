import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  listContactsSchema,
  getContactSchema,
  createContactSchema,
  createToolResult,
  createErrorResult,
} from "@mcp-connectors/core";
import type { NextcloudClient } from "../client.js";

export function registerContactTools(server: Server, client: NextcloudClient) {
  // Extend tools list
  const originalListHandler = (server as any)._requestHandlers?.get("tools/list");

  server.setRequestHandler(
    { method: "tools/list" } as any,
    async (request: any) => {
      const baseResult = originalListHandler ? await originalListHandler(request) : { tools: [] };

      return {
        tools: [
          ...baseResult.tools,
          {
            name: "nextcloud_list_contacts",
            description: "List contacts from Nextcloud address book",
            inputSchema: {
              type: "object",
              properties: {
                addressBookId: {
                  type: "string",
                  description: "Address book ID (default: contacts)",
                  default: "contacts",
                },
              },
            },
          },
          {
            name: "nextcloud_get_contact",
            description: "Get details of a specific contact",
            inputSchema: {
              type: "object",
              properties: {
                addressBookId: {
                  type: "string",
                  description: "Address book ID (default: contacts)",
                  default: "contacts",
                },
                contactId: {
                  type: "string",
                  description: "Contact UID",
                },
              },
              required: ["contactId"],
            },
          },
          {
            name: "nextcloud_create_contact",
            description: "Create a new contact in Nextcloud",
            inputSchema: {
              type: "object",
              properties: {
                addressBookId: {
                  type: "string",
                  description: "Address book ID (default: contacts)",
                  default: "contacts",
                },
                fullName: {
                  type: "string",
                  description: "Full name of the contact",
                },
                email: {
                  type: "string",
                  description: "Email address",
                },
                phone: {
                  type: "string",
                  description: "Phone number",
                },
                organization: {
                  type: "string",
                  description: "Organization/company",
                },
                note: {
                  type: "string",
                  description: "Notes",
                },
              },
              required: ["fullName"],
            },
          },
        ],
      };
    }
  );

  // Extend tools/call handler
  const originalCallHandler = (server as any)._requestHandlers?.get("tools/call");

  server.setRequestHandler(
    { method: "tools/call" } as any,
    async (request: any) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "nextcloud_list_contacts": {
            const parsed = listContactsSchema.parse(args);
            const contacts = await client.listContacts(parsed.addressBookId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(createToolResult(contacts), null, 2),
                },
              ],
            };
          }

          case "nextcloud_get_contact": {
            const parsed = getContactSchema.parse(args);
            const contact = await client.getContact(parsed.addressBookId, parsed.contactId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(createToolResult(contact), null, 2),
                },
              ],
            };
          }

          case "nextcloud_create_contact": {
            const parsed = createContactSchema.parse(args);
            const uid = await client.createContact(parsed.addressBookId, {
              fullName: parsed.fullName,
              email: parsed.email,
              phone: parsed.phone,
              organization: parsed.organization,
              note: parsed.note,
            });
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    createToolResult({ uid, message: "Contact created successfully" }),
                    null,
                    2
                  ),
                },
              ],
            };
          }

          default:
            // Pass to original handler
            if (originalCallHandler) {
              return originalCallHandler(request);
            }
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        // Check if it's a "not our tool" case
        if (originalCallHandler && !["nextcloud_list_contacts", "nextcloud_get_contact", "nextcloud_create_contact"].includes(name)) {
          return originalCallHandler(request);
        }

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
