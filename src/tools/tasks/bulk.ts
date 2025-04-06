import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { google, tasks_v1 } from "googleapis";

/**
 * タスク関連のバルク操作ツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerBulkTaskTools(
  server: McpServer,
  authClient: OAuth2Client,
): void {
  // Google Tasks APIクライアント初期化
  const tasksClient = google.tasks({ version: "v1", auth: authClient });

  // タスク一括作成ツール
  server.tool(
    "createBulkTasks",
    "複数のGoogle Tasksタスクを一括で作成します。",
    {
      tasks: z.array(
        z.object({
          title: z.string(),
          notes: z.string().optional(),
          due: z.string().optional(),
          status: z.enum(["needsAction", "completed"]).optional(),
          parent: z.string().optional(),
        }),
      ),
      tasklist: z.string().optional().default("@default"),
    },
    async ({ tasks, tasklist }) => {
      try {
        const results = [];
        const errors = [];

        // 各タスクを順番に作成
        for (const task of tasks) {
          try {
            const response = await tasksClient.tasks.insert({
              tasklist,
              requestBody: task,
            });
            results.push(response.data);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            errors.push({
              task,
              error: errorMessage,
            });
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: errors.length === 0,
                  results,
                  errors,
                  totalCreated: results.length,
                  totalFailed: errors.length,
                },
                null,
                2,
              ),
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

  // タスク一括更新ツール
  server.tool(
    "updateBulkTasks",
    "複数のGoogle Tasksタスクを一括で更新します。",
    {
      tasks: z.array(
        z.object({
          taskId: z.string(),
          title: z.string().optional(),
          notes: z.string().optional(),
          due: z.string().optional(),
          status: z.enum(["needsAction", "completed"]).optional(),
          completed: z.string().optional(),
        }),
      ),
      tasklist: z.string().optional().default("@default"),
    },
    async ({ tasks, tasklist }) => {
      try {
        const results = [];
        const errors = [];

        // 各タスクを順番に更新
        for (const task of tasks) {
          const { taskId, ...taskData } = task;
          try {
            const response = await tasksClient.tasks.update({
              tasklist,
              task: taskId,
              requestBody: taskData,
            });
            results.push(response.data);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            errors.push({
              taskId,
              error: errorMessage,
            });
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: errors.length === 0,
                  results,
                  errors,
                  totalUpdated: results.length,
                  totalFailed: errors.length,
                },
                null,
                2,
              ),
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

  // タスク一括削除ツール
  server.tool(
    "deleteBulkTasks",
    "複数のGoogle Tasksタスクを一括で削除します。",
    {
      taskIds: z.array(z.string()),
      tasklist: z.string().optional().default("@default"),
    },
    async ({ taskIds, tasklist }) => {
      try {
        const results = [];
        const errors = [];

        // 各タスクを順番に削除
        for (const taskId of taskIds) {
          try {
            await tasksClient.tasks.delete({
              tasklist,
              task: taskId,
            });
            results.push({ taskId, deleted: true });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            errors.push({
              taskId,
              error: errorMessage,
            });
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: errors.length === 0,
                  results,
                  errors,
                  totalDeleted: results.length,
                  totalFailed: errors.length,
                },
                null,
                2,
              ),
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
}
