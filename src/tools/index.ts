import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuth2Client } from "google-auth-library";
import { registerTaskTools } from "./tasks/index.js";
import { registerEventTools } from "./events/index.js";
import { registerLinkTools } from "./links/index.js";
import { registerDateTools } from "./date.js";

/**
 * Registers all available tools with the MCP server.
 * @param server The MCP server instance.
 * @param authClient The authenticated OAuth2 client.
 */
export function registerAllTools(
  server: McpServer,
  authClient: OAuth2Client,
): void {
  console.log("Registering Task tools...");
  registerTaskTools(server, authClient);
  console.log("Task tools registered.");

  console.log("Registering Event tools...");
  registerEventTools(server, authClient);
  console.log("Event tools registered.");

  console.log("Registering Link tools...");
  registerLinkTools(server, authClient); // Pass authClient here as well
  console.log("Link tools registered.");

  console.log("Registering Date tools...");
  registerDateTools(server); // 日付ツールは認証が不要
  console.log("Date tools registered.");
}
