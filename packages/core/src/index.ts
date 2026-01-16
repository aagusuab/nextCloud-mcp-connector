// Types
export type {
  ConnectorConfig,
  ToolResult,
  ToolDefinition,
  NextcloudConfig,
  FileInfo,
  CalendarEvent,
  Contact,
  ShareLink,
} from "./types.js";

// Validation schemas
export {
  pathSchema,
  dateSchema,
  dateTimeSchema,
  listFilesSchema,
  readFileSchema,
  uploadFileSchema,
  deleteSchema,
  createShareSchema,
  listEventsSchema,
  createEventSchema,
  deleteEventSchema,
  listContactsSchema,
  getContactSchema,
  createContactSchema,
} from "./validation.js";

// Utility functions
export function createToolResult<T>(data: T): { success: true; data: T } {
  return { success: true, data };
}

export function createErrorResult(error: string): { success: false; error: string } {
  return { success: false, error };
}
