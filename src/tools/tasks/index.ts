import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { z } from "zod";
import {
  Task,
  TasksResponse,
  DeleteTaskResponse,
} from "../../models/task/index.js";

/**
 * タスク関連のすべてのツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerTaskTools(
  server: McpServer,
  authClient: OAuth2Client
): void {
  // Google Tasks APIクライアント初期化
  const tasksClient = google.tasks({ version: "v1", auth: authClient });

  // タスク一覧取得ツール
  server.tool(
    "listTasks",
    {
      status: z.enum(["needsAction", "completed"]).optional(),
      dueMin: z.string().optional(),
      dueMax: z.string().optional(),
      maxResults: z.number().optional(),
      pageToken: z.string().optional(),
    },
    async ({ status, dueMin, dueMax, maxResults, pageToken }) => {
      try {
        // Google APIの型定義に合わせてパラメータを調整
        const params: any = {
          tasklist: "@default",
          maxResults,
          pageToken,
        };

        // オプションパラメータを追加
        if (status) params.showCompleted = status === "completed";
        if (dueMin) params.dueMin = dueMin;
        if (dueMax) params.dueMax = dueMax;

        const response = await tasksClient.tasks.list(params);

        const tasksResponse: TasksResponse = {
          items: (response.data?.items || []) as Task[],
          nextPageToken: response.data?.nextPageToken || undefined,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tasksResponse, null, 2),
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

  // 注: 実際の実装では、タスク関連の他のツールも登録する
  // 今後、basic.ts, query.ts, bulk.ts, smart.ts などに分割する予定
}
