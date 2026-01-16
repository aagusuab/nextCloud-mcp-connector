import type { z } from "zod";

export interface ConnectorConfig {
  baseUrl: string;
  username?: string;
  password?: string;
  apiKey?: string;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodSchema<TInput>;
  handler: (input: TInput) => Promise<ToolResult<TOutput>>;
}

// Nextcloud-specific types
export interface NextcloudConfig extends ConnectorConfig {
  baseUrl: string;
  username: string;
  password: string;
}

export interface FileInfo {
  filename: string;
  basename: string;
  type: "file" | "directory";
  size: number;
  lastmod: string;
  etag?: string | null;
  mime?: string;
}

export interface CalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  created?: string;
  lastModified?: string;
}

export interface Contact {
  uid: string;
  fullName: string;
  email?: string;
  phone?: string;
  organization?: string;
  note?: string;
}

export interface ShareLink {
  id: string;
  url: string;
  token: string;
  path: string;
  expiration?: string;
  password?: boolean;
}
