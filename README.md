# Composio Plugin for OpenClaw

Access 1000+ third-party tools via Composio MCP — Gmail, Slack, GitHub, Notion, Linear, Jira, HubSpot, Salesforce, Google Drive, and more.

## Install

```bash
openclaw plugins install @composio/openclaw-plugin
```

## Setup

1. Log in at [dashboard.composio.dev](http://dashboard.composio.dev/~/org/connect/clients/openclaw)
2. Choose your preferred client (OpenClaw, Claude Code, Cursor, etc.)
3. Copy your consumer key (`ck_...`)

### Via OpenClaw Config

```bash
openclaw config set plugins.entries.composio.config.consumerKey "ck_your_key_here"
openclaw config set plugins.allow '["composio"]'
openclaw config set tools.alsoAllow '["composio"]'
```

- `plugins.allow` ensures the Composio plugin is explicitly trusted and allowed to load.
- `tools.alsoAllow` ensures Composio tools remain available on non-`full` tool profiles such as `coding`, `minimal`, and `messaging`.

After setting your key and allowlists, restart the gateway:

```bash
openclaw gateway restart
```

## How It Works

The plugin connects to Composio's MCP server at `https://connect.composio.dev/mcp` and registers all available tools directly into the OpenClaw agent. Once the plugin is configured, Composio tools show up directly inside OpenClaw and can be invoked like native tools.

If a tool returns an auth error, the agent will prompt you to connect that toolkit at [dashboard.composio.dev](http://dashboard.composio.dev/~/org/connect/clients/openclaw).

## Configuration

```json
{
  "plugins": {
    "entries": {
      "composio": {
        "enabled": true,
        "config": {
          "consumerKey": "ck_your_key_here"
        }
      }
    }
  }
}
```

| Option | Description | Default |
|---|---|---|
| `enabled` | Enable or disable the plugin | `true` |
| `consumerKey` | Your Composio consumer key (`ck_...`) | — |
| `mcpUrl` | MCP server URL (advanced) | `https://connect.composio.dev/mcp` |

## Troubleshooting

### No consumer key configured

If OpenClaw shows:

```
[plugins] [composio] No consumer key configured. Set COMPOSIO_CONSUMER_KEY env var or plugins.composio.consumerKey in config.
```

Run the following commands **in order**:

```bash
# 1. Set your consumer key
openclaw config set plugins.entries.composio.config.consumerKey "ck_your_key_here"

# 2. Allow the plugin to load
openclaw config set plugins.allow '["composio"]'

# 3. Make tools available on all tool profiles
openclaw config set tools.alsoAllow '["composio"]'

# 4. Restart the gateway to apply changes
openclaw gateway restart

# 5. Verify the plugin is loaded and tools are available
openclaw plugins inspect composio
openclaw plugins doctor
```

A successful setup should show the plugin as loaded and list the `COMPOSIO_*` tools.

> **Note on config path:** The warning message may mention `plugins.composio.consumerKey`, but the correct OpenClaw config path is `plugins.entries.composio.config.consumerKey`. Using the wrong path may cause config validation errors.

### Tools not showing up after restart

Run:

```bash
openclaw plugins inspect composio
openclaw plugins doctor
```

If needed, restart once more:

```bash
openclaw gateway restart
```

A healthy setup should list tools such as:

- `COMPOSIO_SEARCH_TOOLS`
- `COMPOSIO_GET_TOOL_SCHEMAS`
- `COMPOSIO_MANAGE_CONNECTIONS`
- `COMPOSIO_WAIT_FOR_CONNECTIONS`
- `COMPOSIO_MULTI_EXECUTE_TOOL`

### Plugin name mismatch warning

During install, you may see:

```
Plugin manifest id "composio" differs from npm package name "@composio/openclaw-plugin"
```

This is expected. OpenClaw uses the manifest id `composio` as the config key. You can safely ignore this warning.

## Links

- [Composio Documentation](https://docs.composio.dev)
- [Composio Dashboard](http://dashboard.composio.dev/~/org/connect/)
- [MCP Protocol](https://modelcontextprotocol.io)
