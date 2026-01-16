import { z } from "zod";

// Common validation schemas
export const pathSchema = z.string().min(1).describe("File or folder path");

export const dateSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}$/,
  "Date must be in YYYY-MM-DD format"
);

export const dateTimeSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  "DateTime must be in ISO 8601 format"
);

// File operation schemas
export const listFilesSchema = z.object({
  path: pathSchema.default("/").describe("Directory path to list"),
});

export const readFileSchema = z.object({
  path: pathSchema.describe("Path to the file to read"),
});

export const uploadFileSchema = z.object({
  path: pathSchema.describe("Destination path for the file"),
  content: z.string().describe("File content to upload"),
});

export const deleteSchema = z.object({
  path: pathSchema.describe("Path to delete"),
});

export const createShareSchema = z.object({
  path: pathSchema.describe("Path to share"),
  password: z.string().optional().describe("Optional password for the share"),
  expireDate: dateSchema.optional().describe("Optional expiration date (YYYY-MM-DD)"),
});

// Calendar schemas
export const listEventsSchema = z.object({
  calendarId: z.string().default("personal").describe("Calendar ID"),
  startDate: dateSchema.optional().describe("Start date filter (YYYY-MM-DD)"),
  endDate: dateSchema.optional().describe("End date filter (YYYY-MM-DD)"),
});

export const createEventSchema = z.object({
  calendarId: z.string().default("personal").describe("Calendar ID"),
  summary: z.string().min(1).describe("Event title"),
  description: z.string().optional().describe("Event description"),
  start: dateTimeSchema.describe("Start datetime (ISO 8601)"),
  end: dateTimeSchema.describe("End datetime (ISO 8601)"),
  location: z.string().optional().describe("Event location"),
});

export const deleteEventSchema = z.object({
  calendarId: z.string().describe("Calendar ID"),
  eventId: z.string().describe("Event UID to delete"),
});

// Contact schemas
export const listContactsSchema = z.object({
  addressBookId: z.string().default("contacts").describe("Address book ID"),
});

export const getContactSchema = z.object({
  addressBookId: z.string().default("contacts").describe("Address book ID"),
  contactId: z.string().describe("Contact UID"),
});

export const createContactSchema = z.object({
  addressBookId: z.string().default("contacts").describe("Address book ID"),
  fullName: z.string().min(1).describe("Full name"),
  email: z.string().email().optional().describe("Email address"),
  phone: z.string().optional().describe("Phone number"),
  organization: z.string().optional().describe("Organization/company"),
  note: z.string().optional().describe("Notes"),
});
