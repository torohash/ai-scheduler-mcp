import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuth2Client } from "google-auth-library";
import { registerBasicEventTools } from "./basic.js";
import { registerEventQueryTools } from "./query.js";
import { registerEventBulkTools } from "./bulk.js";

/**
 * イベント関連のすべてのツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerEventTools(
  server: McpServer,
  authClient: OAuth2Client,
): void {
  // 基本的なCRUD操作ツールを登録
  registerBasicEventTools(server, authClient);

  // 検索・クエリ関連ツールを登録
  registerEventQueryTools(server, authClient);

  // バルク操作関連ツールを登録
  registerEventBulkTools(server, authClient);
}
