import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuth2Client } from "google-auth-library";
// import { registerBasicLinkTools } from "./basic.js"; // Future: Import basic tools
import { registerQueryLinkTools } from "./query.js";
// import { registerSyncLinkTools } from "./sync.js"; // Future: Import sync tools

/**
 * タスクとイベントの紐付け関連のツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerLinkTools(
  server: McpServer,
  _authClient: OAuth2Client, // 未使用のためアンダースコアを付与
): void {
  // Register different categories of link tools
  // registerBasicLinkTools(server, _authClient); // Future: Basic CRUD operations
  registerQueryLinkTools(server, _authClient); // Query and listing operations
  // registerSyncLinkTools(server, _authClient); // Future: Sync operations
}
