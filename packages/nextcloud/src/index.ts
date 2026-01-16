#!/usr/bin/env node

import { NextcloudConnector } from "./connector.js";

// Parse command line arguments
const args = process.argv.slice(2);
const transportArg = args.find((arg) => arg.startsWith("--transport="));
const portArg = args.find((arg) => arg.startsWith("--port="));

const transport = transportArg?.split("=")[1] || "stdio";
const port = portArg ? parseInt(portArg.split("=")[1], 10) : 3000;

// Get configuration from environment variables
const config = {
  baseUrl: process.env.NEXTCLOUD_URL || "",
  username: process.env.NEXTCLOUD_USERNAME || "",
  password: process.env.NEXTCLOUD_PASSWORD || "",
};

// Validate configuration
if (!config.baseUrl || !config.username || !config.password) {
  console.error("Error: Missing required environment variables:");
  console.error("  NEXTCLOUD_URL - Base URL of your Nextcloud instance (e.g., https://cloud.example.com)");
  console.error("  NEXTCLOUD_USERNAME - Your Nextcloud username");
  console.error("  NEXTCLOUD_PASSWORD - Your Nextcloud app password");
  console.error("");
  console.error("To create an app password:");
  console.error("  1. Go to your Nextcloud Settings");
  console.error("  2. Navigate to Security");
  console.error("  3. Create a new app password");
  process.exit(1);
}

// Create and start the connector
const connector = new NextcloudConnector(config);

async function main() {
  try {
    if (transport === "sse") {
      await connector.startSSE(port);
    } else {
      await connector.startStdio();
    }
  } catch (error) {
    console.error("Failed to start Nextcloud MCP server:", error);
    process.exit(1);
  }
}

main();

// Export for programmatic use
export { NextcloudConnector } from "./connector.js";
export { NextcloudClient } from "./client.js";
