import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { Task, TasksResponse, DeleteTaskResponse } from "../models/task.js";

/**
 * タスク関連のツールを登録する
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

  // タスク取得ツール
  server.tool(
    "getTask",
    {
      taskId: z.string(),
    },
    async ({ taskId }) => {
      try {
        const response = await tasksClient.tasks.get({
          tasklist: "@default",
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
    }
  );

  // タスク作成ツール
  server.tool(
    "createTask",
    {
      title: z.string(),
      notes: z.string().optional(),
      due: z.string().optional(),
      status: z.enum(["needsAction", "completed"]).optional(),
      parent: z.string().optional(),
    },
    async ({ title, notes, due, status, parent }) => {
      try {
        const response = await tasksClient.tasks.insert({
          tasklist: "@default",
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
    }
  );

  // タスク更新ツール
  server.tool(
    "updateTask",
    {
      taskId: z.string(),
      title: z.string().optional(),
      notes: z.string().optional(),
      due: z.string().optional(),
      status: z.enum(["needsAction", "completed"]).optional(),
      completed: z.string().optional(),
    },
    async ({ taskId, title, notes, due, status, completed }) => {
      try {
        const response = await tasksClient.tasks.update({
          tasklist: "@default",
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
    }
  );

  // タスク削除ツール
  server.tool(
    "deleteTask",
    {
      taskId: z.string(),
    },
    async ({ taskId }) => {
      try {
        await tasksClient.tasks.delete({
          tasklist: "@default",
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
    }
  );
}
