import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuth2Client } from "google-auth-library";
import { registerBasicLinkTools } from "./basic.js";
import { registerBulkLinkTools } from "./bulk.js";
import { registerQueryLinkTools } from "./query.js";
// import { registerSyncLinkTools } from "./sync.js"; // Future: Import sync tools

/**
 * タスクとイベントの紐付け関連のツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerLinkTools(
  server: McpServer,
  authClient: OAuth2Client,
): void {
  // Register different categories of link tools
  registerBasicLinkTools(server, authClient); // Basic CRUD operations
  registerBulkLinkTools(server, authClient); // Bulk operations
  registerQueryLinkTools(server, authClient); // Query and listing operations
  // registerSyncLinkTools(server, authClient); // Future: Sync operations
}
