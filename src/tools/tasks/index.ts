import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuth2Client } from "google-auth-library";
// import { registerBasicTaskTools } from "./basic.js"; // Future: Import basic tools
import { registerQueryTaskTools } from "./query.js";
// import { registerBulkTaskTools } from "./bulk.js"; // Future: Import bulk tools
// import { registerSmartTaskTools } from "./smart.js"; // Future: Import smart tools

/**
 * タスク関連のすべてのツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerTaskTools(
  server: McpServer,
  authClient: OAuth2Client,
): void {
  // Register different categories of task tools
  // registerBasicTaskTools(server, authClient); // Future: Basic CRUD operations
  registerQueryTaskTools(server, authClient); // Query and listing operations
  // registerBulkTaskTools(server, authClient); // Future: Bulk operations
  // registerSmartTaskTools(server, authClient); // Future: AI-powered or complex tools
}
