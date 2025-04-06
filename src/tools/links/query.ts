import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { TaskEventLink, LinksResponse } from "../../models/link/index.js";

// TaskEventLinkの管理用データストア（実際の実装ではデータベースを使用）
// TODO: このデータストアは一時的なものです。永続化ストレージに移行する必要があります。
const taskEventLinks: TaskEventLink[] = [];

/**
 * Registers link query tools.
 * @param server The MCP server instance.
 * @param _authClient The authenticated OAuth2 client (currently unused).
 */
export function registerQueryLinkTools(
  server: McpServer,
  _authClient: OAuth2Client, // Mark as unused for now
): void {
  // 紐付け一覧取得ツール
  server.tool(
    "listTaskEventLinks",
    "Google TasksとGoogle Calendarイベント間の紐付け（リンク）を取得します。タスクIDまたはイベントIDでフィルタリングできます。（データは一時ストア）",
    {
      taskId: z.string().optional(),
      eventId: z.string().optional(),
      maxResults: z.number().optional(),
      pageToken: z.string().optional(),
    },
    async ({ taskId, eventId, maxResults, pageToken }) => {
      try {
        // TODO: データベースからリンクを取得するように変更
        let filteredLinks = [...taskEventLinks];

        if (taskId) {
          filteredLinks = filteredLinks.filter(
            (link) => link.taskId === taskId,
          );
        }

        if (eventId) {
          filteredLinks = filteredLinks.filter(
            (link) => link.eventId === eventId,
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
    },
  );

  // Add other query-related link tools here
}
