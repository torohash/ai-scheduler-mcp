import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { google } from "googleapis";
import {
  TaskEventLink,
  CreateLinkRequest,
  UpdateLinkRequest,
  DeleteLinkResponse,
} from "../../models/link/index.js";

// TaskEventLinkの管理用データストア（実際の実装ではデータベースを使用）
// 注: このデータストアはquery.tsと共有する必要があります
// TODO: このデータストアは一時的なものです。永続化ストレージに移行する必要があります。
export const taskEventLinks: TaskEventLink[] = [];

/**
 * タスクとイベントの紐付け関連の基本的なCRUD操作ツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerBasicLinkTools(
  server: McpServer,
  authClient: OAuth2Client,
): void {
  // Google APIクライアント初期化
  const tasksClient = google.tasks({ version: "v1", auth: authClient });
  const calendarClient = google.calendar({ version: "v3", auth: authClient });

  // 紐付け作成ツール
  server.tool(
    "createTaskEventLink",
    "Google TasksのタスクとGoogle Calendarのイベントを紐付けます。両方のIDが必要です。",
    {
      taskId: z.string().describe("タスクのID"),
      eventId: z.string().describe("イベントのID"),
      notes: z.string().optional().describe("紐付けに関するメモ（オプション）"),
    },
    async ({ taskId, eventId, notes }) => {
      try {
        // タスクとイベントの存在確認
        await tasksClient.tasks.get({
          tasklist: "@default",
          task: taskId,
        });

        await calendarClient.events.get({
          calendarId: "primary",
          eventId,
        });

        // 既存の紐付けをチェック
        const existingLink = taskEventLinks.find(
          (link) => link.taskId === taskId && link.eventId === eventId,
        );

        if (existingLink) {
          return {
            content: [
              {
                type: "text",
                text: `Error: このタスク(${taskId})とイベント(${eventId})は既に紐付けられています。`,
              },
            ],
            isError: true,
          };
        }

        // 紐付け情報作成
        const link: TaskEventLink = {
          id: `link_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          taskId,
          eventId,
          userId: "current_user", // 実際の実装では認証ユーザーIDを使用
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notes,
        };

        taskEventLinks.push(link);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(link, null, 2),
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

  // 紐付け更新ツール
  server.tool(
    "updateTaskEventLink",
    "タスクとイベントの紐付け情報を更新します。",
    {
      linkId: z.string().describe("更新する紐付けのID"),
      notes: z.string().optional().describe("更新するメモ（オプション）"),
    },
    async ({ linkId, notes }) => {
      try {
        // 紐付けの存在確認
        const linkIndex = taskEventLinks.findIndex(
          (link) => link.id === linkId,
        );

        if (linkIndex === -1) {
          return {
            content: [
              {
                type: "text",
                text: `Error: 指定されたID(${linkId})の紐付けが見つかりません。`,
              },
            ],
            isError: true,
          };
        }

        // 紐付け情報更新
        const updatedLink: TaskEventLink = {
          ...taskEventLinks[linkIndex],
          updatedAt: new Date().toISOString(),
        };

        if (notes !== undefined) {
          updatedLink.notes = notes;
        }

        taskEventLinks[linkIndex] = updatedLink;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(updatedLink, null, 2),
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

  // 紐付け削除ツール
  server.tool(
    "deleteTaskEventLink",
    "タスクとイベントの紐付けを削除します。",
    {
      linkId: z.string().describe("削除する紐付けのID"),
    },
    async ({ linkId }) => {
      try {
        // 紐付けの存在確認
        const linkIndex = taskEventLinks.findIndex(
          (link) => link.id === linkId,
        );

        if (linkIndex === -1) {
          return {
            content: [
              {
                type: "text",
                text: `Error: 指定されたID(${linkId})の紐付けが見つかりません。`,
              },
            ],
            isError: true,
          };
        }

        // 紐付け情報削除
        taskEventLinks.splice(linkIndex, 1);

        const response: DeleteLinkResponse = {
          success: true,
          message: "紐付けが正常に削除されました。",
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
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

  // タスクとイベントの紐付け解除ツール
  server.tool(
    "unlinkTaskEvent",
    "特定のタスクとイベントの紐付けを解除します。",
    {
      taskId: z.string().describe("タスクのID"),
      eventId: z.string().describe("イベントのID"),
    },
    async ({ taskId, eventId }) => {
      try {
        // 紐付けの存在確認
        const linkIndex = taskEventLinks.findIndex(
          (link) => link.taskId === taskId && link.eventId === eventId,
        );

        if (linkIndex === -1) {
          return {
            content: [
              {
                type: "text",
                text: `Error: 指定されたタスク(${taskId})とイベント(${eventId})の紐付けが見つかりません。`,
              },
            ],
            isError: true,
          };
        }

        // 紐付け情報削除
        taskEventLinks.splice(linkIndex, 1);

        const response: DeleteLinkResponse = {
          success: true,
          message: "タスクとイベントの紐付けが正常に解除されました。",
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
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
