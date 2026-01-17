# Nextcloud MCP Connector

An MCP (Model Context Protocol) connector for Nextcloud that lets AI assistants access your files, calendar, and contacts.

## Features

- **Files** - List, read, upload, delete, and share files
- **Calendar** - List, create, and delete events
- **Contacts** - List, view, and create contacts
- **Dual Transport** - Works with Claude Desktop (STDIO) and Kubernetes (SSE)

## Quick Start

### 1. Install dependencies

```bash
pnpm install
pnpm build
```

### 2. Create a Nextcloud App Password

1. Go to your Nextcloud Settings → Security
2. Create a new app password
3. Save the username and password

### 3. Configure

Copy the example config and add your credentials:

```bash
cp examples/claude-desktop/claude_desktop_config.example.json \
   ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

Edit the file with your Nextcloud URL, username, and app password.

### 4. Restart Claude Desktop

The Nextcloud tools will now be available.

## Available Tools

| Tool | Description |
|------|-------------|
| `nextcloud_list_files` | List files and folders |
| `nextcloud_read_file` | Read file contents |
| `nextcloud_upload_file` | Upload a file |
| `nextcloud_delete` | Delete a file or folder |
| `nextcloud_create_share` | Create a public share link |
| `nextcloud_list_events` | List calendar events |
| `nextcloud_create_event` | Create a calendar event |
| `nextcloud_delete_event` | Delete a calendar event |
| `nextcloud_list_contacts` | List contacts |
| `nextcloud_get_contact` | Get contact details |
| `nextcloud_create_contact` | Create a contact |

## Kubernetes Deployment

```bash
# Copy and configure the secret
cp packages/nextcloud/k8s/secret.example.yaml packages/nextcloud/k8s/secret.yaml
# Edit secret.yaml with your credentials

# Deploy
kubectl apply -f packages/nextcloud/k8s/
```

## Project Structure

```
├── packages/
│   ├── core/          # Shared types and validation
│   └── nextcloud/     # Nextcloud connector
│       ├── src/
│       │   ├── client.ts      # WebDAV/CalDAV/CardDAV client
│       │   ├── connector.ts   # MCP server
│       │   └── tools/         # Tool implementations
│       ├── k8s/               # Kubernetes manifests
│       └── Dockerfile
└── examples/
    └── claude-desktop/        # Claude Desktop config example
```

## License

MIT
