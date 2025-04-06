import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { z } from "zod";
import {
  TaskEventLink,
  LinksResponse,
  DeleteLinkResponse,
} from "../../models/link/index.js";

/**
 * タスクとイベントの紐付け関連のツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerLinkTools(
  server: McpServer,
  authClient: OAuth2Client
): void {
  // Google APIクライアント初期化
  const tasksClient = google.tasks({ version: "v1", auth: authClient });
  const calendarClient = google.calendar({ version: "v3", auth: authClient });

  // TaskEventLinkの管理用データストア（実際の実装ではデータベースを使用）
  const taskEventLinks: TaskEventLink[] = [];

  // 紐付け一覧取得ツール
  server.tool(
    "listTaskEventLinks",
    {
      taskId: z.string().optional(),
      eventId: z.string().optional(),
      maxResults: z.number().optional(),
      pageToken: z.string().optional(),
    },
    async ({ taskId, eventId, maxResults, pageToken }) => {
      try {
        let filteredLinks = [...taskEventLinks];

        if (taskId) {
          filteredLinks = filteredLinks.filter(
            (link) => link.taskId === taskId
          );
        }

        if (eventId) {
          filteredLinks = filteredLinks.filter(
            (link) => link.eventId === eventId
          );
        }

        // ページネーション処理（簡易実装）
        const startIndex = pageToken ? parseInt(pageToken) : 0;
        const endIndex = maxResults
          ? startIndex + maxResults
          : filteredLinks.length;
        const paginatedLinks = filteredLinks.slice(startIndex, endIndex);

        const nextPageToken =
          endIndex < filteredLinks.length ? endIndex.toString() : undefined;

        const linksResponse: LinksResponse = {
          items: paginatedLinks,
          nextPageToken,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(linksResponse, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 注: 実際の実装では、リンク関連の他のツールも登録する
  // 今後、basic.ts, query.ts, sync.ts などに分割する予定
}
