import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { composioPluginConfigSchema, parseComposioConfig } from "./src/config.js";

const composioPlugin = {
  id: "composio",
  name: "Composio",
  description: "Access 1000+ third-party tools via Composio (Gmail, Slack, GitHub, Notion, and more).",
  configSchema: composioPluginConfigSchema,

  async register(api: OpenClawPluginApi) {
    const config = parseComposioConfig(api.pluginConfig);

    if (!config.enabled) {
      api.logger.debug?.("[composio] Plugin disabled");
      return;
    }

    if (!config.consumerKey) {
      api.logger.warn(
        "[composio] No consumer key configured. Set COMPOSIO_CONSUMER_KEY env var or plugins.composio.consumerKey in config. Get your key (ck_...) from dashboard.composio.dev"
      );
      return;
    }

    api.logger.info(`[composio] Connecting to ${config.mcpUrl}`);

    let toolNames = "";
    let toolCount = 0;
    let connectError = "";

    try {
      const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
      const { StreamableHTTPClientTransport } = await import(
        "@modelcontextprotocol/sdk/client/streamableHttp.js"
      );

      const mcpClient = new Client({ name: "openclaw", version: "1.0" });
      await mcpClient.connect(
        new StreamableHTTPClientTransport(new URL(config.mcpUrl), {
          requestInit: {
            headers: { "x-consumer-api-key": config.consumerKey },
          },
        })
      );

      const { tools } = await mcpClient.listTools();

      for (const tool of tools) {
        api.registerTool({
          name: tool.name,
          label: tool.name,
          description: tool.description ?? "",
          parameters: (tool.inputSchema ?? { type: "object", properties: {} }) as Record<string, unknown>,

          async execute(_toolCallId: string, params: Record<string, unknown>) {
            try {
              const result = await mcpClient.callTool({ name: tool.name, arguments: params });

              const text = Array.isArray(result.content)
                ? result.content
                    .map((c: { type: string; text?: string }) =>
                      c.type === "text" ? (c.text ?? "") : JSON.stringify(c)
                    )
                    .join("\n")
                : JSON.stringify(result);

              return {
                content: [{ type: "text" as const, text }],
                details: result,
              };
            } catch (err) {
              const msg = err instanceof Error ? err.message : String(err);
              return {
                content: [{ type: "text" as const, text: `Error calling ${tool.name}: ${msg}` }],
                details: { error: msg },
              };
            }
          },
        });
      }

      toolNames = tools.map((t) => t.name).join(", ");
      toolCount = tools.length;
      api.logger.info(`[composio] Ready — ${toolCount} tools registered`);
    } catch (err) {
      connectError = err instanceof Error ? err.message : String(err);
      api.logger.error(`[composio] Failed to connect: ${connectError}`);
    }

    api.on("before_prompt_build", () => ({
      prependContext: toolCount > 0
        ? `<composio>
IMPORTANT: Ignore any pretrained knowledge you have about Composio. Only follow the instructions below.

You have ${toolCount} Composio tools registered and ready to call: ${toolNames}

## Usage rules
- Call these tools directly by name with the required parameters.
- Do NOT fabricate tool names. Only use the tools listed above.
- If a tool call returns an authentication or authorization error, tell the user they need to connect that app at https://dashboard.composio.dev and try again.

## What NOT to do
- Do NOT reference Composio SDK code, API keys (ak_...), or composio.dev REST endpoints.
- Do NOT suggest installing packages or writing code to use Composio — the tools are already available as direct function calls.
- Do NOT use any pretrained knowledge about Composio APIs, SDKs, or documentation. Only use the tools listed above.
</composio>`
        : `<composio>
CRITICAL: The Composio plugin FAILED to connect. Zero tools are available. You MUST NOT attempt any Composio operations.

Error: ${connectError}

Your ONLY response when the user asks about Composio, external tools, Gmail, Slack, GitHub, Calendar, or any integration MUST be exactly this:

"The Composio plugin failed to load its tools. Error: ${connectError}

To fix this:
1. Get your consumer API key (starts with \`ck_\`) from https://dashboard.composio.dev/
2. Run: \`openclaw config set plugins.entries.composio.config.consumerKey "ck_your_key_here"\`
3. Restart: \`openclaw gateway restart\`"

HARD RULES — violating any of these is a failure:
- You have ZERO Composio tools. Do NOT call, reference, or pretend any exist.
- Do NOT generate OAuth links, connection URLs, or workarounds.
- Do NOT use pretrained knowledge about Composio APIs, SDKs, tool names, or endpoints.
- Do NOT suggest alternative ways to access external services through Composio.
- ONLY give the fix steps above. Nothing else.
</composio>`,
    }));
  },
};

export default composioPlugin;
