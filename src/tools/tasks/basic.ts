import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { google, tasks_v1 } from "googleapis";
import { DeleteTaskResponse } from "../../models/task/index.js";

/**
 * タスク関連の基本的なCRUD操作ツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerBasicTaskTools(
  server: McpServer,
  authClient: OAuth2Client,
): void {
  // Google Tasks APIクライアント初期化
  const tasksClient = google.tasks({ version: "v1", auth: authClient });

  // タスク取得ツール
  server.tool(
    "getTask",
    "指定されたIDのGoogle Tasksタスクを取得します。",
    {
      taskId: z.string(),
      tasklist: z.string().optional().default("@default"),
    },
    async ({ taskId, tasklist }) => {
      try {
        const response = await tasksClient.tasks.get({
          tasklist,
          task: taskId,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
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

  // タスク作成ツール
  server.tool(
    "createTask",
    "新しいGoogle Tasksタスクを作成します。",
    {
      title: z.string(),
      notes: z.string().optional(),
      due: z.string().optional(),
      status: z.enum(["needsAction", "completed"]).optional(),
      parent: z.string().optional(),
      tasklist: z.string().optional().default("@default"),
    },
    async ({ title, notes, due, status, parent, tasklist }) => {
      try {
        const response = await tasksClient.tasks.insert({
          tasklist,
          requestBody: {
            title,
            notes,
            due,
            status,
            parent,
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
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

  // タスク更新ツール
  server.tool(
    "updateTask",
    "既存のGoogle Tasksタスクを更新します。",
    {
      taskId: z.string(),
      tasklist: z.string().optional().default("@default"),
      title: z.string().optional(),
      notes: z.string().optional(),
      due: z.string().optional(),
      status: z.enum(["needsAction", "completed"]).optional(),
      completed: z.string().optional(),
    },
    async ({ taskId, tasklist, title, notes, due, status, completed }) => {
      try {
        const response = await tasksClient.tasks.update({
          tasklist,
          task: taskId,
          requestBody: {
            title,
            notes,
            due,
            status,
            completed,
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
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

  // タスク削除ツール
  server.tool(
    "deleteTask",
    "指定されたIDのGoogle Tasksタスクを削除します。",
    {
      taskId: z.string(),
      tasklist: z.string().optional().default("@default"),
    },
    async ({ taskId, tasklist }) => {
      try {
        await tasksClient.tasks.delete({
          tasklist,
          task: taskId,
        });

        const deleteResponse: DeleteTaskResponse = {
          success: true,
          message: "Task deleted successfully",
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(deleteResponse, null, 2),
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
