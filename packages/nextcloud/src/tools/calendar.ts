import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  listEventsSchema,
  createEventSchema,
  deleteEventSchema,
  createToolResult,
  createErrorResult,
} from "@mcp-connectors/core";
import type { NextcloudClient } from "../client.js";

export function registerCalendarTools(server: Server, client: NextcloudClient) {
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
            name: "nextcloud_list_events",
            description: "List calendar events from Nextcloud",
            inputSchema: {
              type: "object",
              properties: {
                calendarId: {
                  type: "string",
                  description: "Calendar ID (default: personal)",
                  default: "personal",
                },
                startDate: {
                  type: "string",
                  description: "Start date filter (YYYY-MM-DD)",
                },
                endDate: {
                  type: "string",
                  description: "End date filter (YYYY-MM-DD)",
                },
              },
            },
          },
          {
            name: "nextcloud_create_event",
            description: "Create a calendar event in Nextcloud",
            inputSchema: {
              type: "object",
              properties: {
                calendarId: {
                  type: "string",
                  description: "Calendar ID (default: personal)",
                  default: "personal",
                },
                summary: {
                  type: "string",
                  description: "Event title",
                },
                description: {
                  type: "string",
                  description: "Event description",
                },
                start: {
                  type: "string",
                  description: "Start datetime (ISO 8601, e.g., 2024-01-15T10:00:00)",
                },
                end: {
                  type: "string",
                  description: "End datetime (ISO 8601, e.g., 2024-01-15T11:00:00)",
                },
                location: {
                  type: "string",
                  description: "Event location",
                },
              },
              required: ["summary", "start", "end"],
            },
          },
          {
            name: "nextcloud_delete_event",
            description: "Delete a calendar event from Nextcloud",
            inputSchema: {
              type: "object",
              properties: {
                calendarId: {
                  type: "string",
                  description: "Calendar ID",
                },
                eventId: {
                  type: "string",
                  description: "Event UID to delete",
                },
              },
              required: ["calendarId", "eventId"],
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
          case "nextcloud_list_events": {
            const parsed = listEventsSchema.parse(args);
            const events = await client.listCalendarEvents(
              parsed.calendarId,
              parsed.startDate,
              parsed.endDate
            );
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(createToolResult(events), null, 2),
                },
              ],
            };
          }

          case "nextcloud_create_event": {
            const parsed = createEventSchema.parse(args);
            const uid = await client.createCalendarEvent(parsed.calendarId, {
              summary: parsed.summary,
              description: parsed.description,
              start: parsed.start,
              end: parsed.end,
              location: parsed.location,
            });
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    createToolResult({ uid, message: "Event created successfully" }),
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case "nextcloud_delete_event": {
            const parsed = deleteEventSchema.parse(args);
            await client.deleteCalendarEvent(parsed.calendarId, parsed.eventId);
            return {
              content: [
                {
                  type: "text",
                  text: JSON.stringify(
                    createToolResult({ eventId: parsed.eventId, message: "Event deleted successfully" }),
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
        if (originalCallHandler && !["nextcloud_list_events", "nextcloud_create_event", "nextcloud_delete_event"].includes(name)) {
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
