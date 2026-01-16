# @mcp-connectors/nextcloud

MCP connector for Nextcloud - access your files, calendar, and contacts through AI.

## Features

- **Files**: List, read, upload, delete files and create share links
- **Calendar**: List, create, and delete calendar events
- **Contacts**: List, get, and create contacts

## Installation

```bash
pnpm add @mcp-connectors/nextcloud
```

## Configuration

Set these environment variables:

```bash
NEXTCLOUD_URL=https://your-nextcloud-instance.com
NEXTCLOUD_USERNAME=your-username
NEXTCLOUD_PASSWORD=your-app-password
```

To create an app password:
1. Go to your Nextcloud Settings
2. Navigate to Security
3. Under "Devices & sessions", create a new app password

## Usage

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nextcloud": {
      "command": "node",
      "args": ["/path/to/mcp-connectors/packages/nextcloud/dist/index.js"],
      "env": {
        "NEXTCLOUD_URL": "https://your-nextcloud.com",
        "NEXTCLOUD_USERNAME": "your-username",
        "NEXTCLOUD_PASSWORD": "your-app-password"
      }
    }
  }
}
```

### With Kubernetes

1. Update the secret with your credentials:
```bash
kubectl apply -f k8s/secret.yaml
```

2. Deploy the connector:
```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

3. Connect to the SSE endpoint at `http://nextcloud-mcp:3000/sse`

## Available Tools

### File Tools

| Tool | Description |
|------|-------------|
| `nextcloud_list_files` | List files/folders at a path |
| `nextcloud_read_file` | Read text file contents |
| `nextcloud_upload_file` | Upload a file |
| `nextcloud_delete` | Delete a file or folder |
| `nextcloud_create_share` | Create a public share link |

### Calendar Tools

| Tool | Description |
|------|-------------|
| `nextcloud_list_events` | List calendar events |
| `nextcloud_create_event` | Create a calendar event |
| `nextcloud_delete_event` | Delete a calendar event |

### Contact Tools

| Tool | Description |
|------|-------------|
| `nextcloud_list_contacts` | List all contacts |
| `nextcloud_get_contact` | Get contact details |
| `nextcloud_create_contact` | Create a new contact |

## Example Prompts

Once connected, you can ask:

- "What files do I have in my Documents folder?"
- "Create a meeting for tomorrow at 2pm called 'Team Sync'"
- "Add a contact for John Doe with email john@example.com"
- "Share my project folder with a public link"

## License

MIT
