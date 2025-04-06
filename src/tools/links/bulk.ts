import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";
import { google } from "googleapis";
import { TaskEventLink, DeleteLinkResponse } from "../../models/link/index.js";

// basic.tsからtaskEventLinksをインポート
import { taskEventLinks } from "./basic.js";

/**
 * タスクとイベントの紐付け関連のバルク操作ツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerBulkLinkTools(
  server: McpServer,
  authClient: OAuth2Client,
): void {
  // Google APIクライアント初期化
  const tasksClient = google.tasks({ version: "v1", auth: authClient });
  const calendarClient = google.calendar({ version: "v3", auth: authClient });

  // 複数の紐付け一括作成ツール
  server.tool(
    "bulkCreateTaskEventLinks",
    "複数のGoogle TasksのタスクとGoogle Calendarのイベントを一括で紐付けます。",
    {
      links: z
        .array(
          z.object({
            taskId: z.string().describe("タスクのID"),
            eventId: z.string().describe("イベントのID"),
            notes: z
              .string()
              .optional()
              .describe("紐付けに関するメモ（オプション）"),
          }),
        )
        .describe("作成する紐付けの配列"),
    },
    async ({ links }) => {
      try {
        const results = [];
        const errors = [];

        // 各紐付けを処理
        for (const linkData of links) {
          const { taskId, eventId, notes } = linkData;

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
              errors.push({
                taskId,
                eventId,
                error: `このタスク(${taskId})とイベント(${eventId})は既に紐付けられています。`,
              });
              continue;
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
            results.push(link);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            errors.push({
              taskId,
              eventId,
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
                  created: results.length,
                  total: links.length,
                  results,
                  errors: errors.length > 0 ? errors : undefined,
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

  // 複数の紐付け一括削除ツール
  server.tool(
    "bulkDeleteTaskEventLinks",
    "複数のタスクとイベントの紐付けを一括で削除します。",
    {
      linkIds: z.array(z.string()).describe("削除する紐付けIDの配列"),
    },
    async ({ linkIds }) => {
      try {
        const results = [];
        const errors = [];

        // 各紐付けIDを処理
        for (const linkId of linkIds) {
          try {
            // 紐付けの存在確認
            const linkIndex = taskEventLinks.findIndex(
              (link) => link.id === linkId,
            );

            if (linkIndex === -1) {
              errors.push({
                linkId,
                error: `指定されたID(${linkId})の紐付けが見つかりません。`,
              });
              continue;
            }

            // 紐付け情報削除
            const deletedLink = taskEventLinks.splice(linkIndex, 1)[0];
            results.push({
              id: deletedLink.id,
              taskId: deletedLink.taskId,
              eventId: deletedLink.eventId,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            errors.push({
              linkId,
              error: errorMessage,
            });
          }
        }

        const response: DeleteLinkResponse & {
          deleted: number;
          total: number;
          results: Array<{ id: string; taskId: string; eventId: string }>;
          errors?: Array<{ linkId: string; error: string }>;
        } = {
          success: errors.length === 0,
          message: `${results.length}件の紐付けが削除されました。`,
          deleted: results.length,
          total: linkIds.length,
          results,
          errors: errors.length > 0 ? errors : undefined,
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

  // 複数のタスクとイベントの紐付け一括解除ツール
  server.tool(
    "bulkUnlinkTaskEvents",
    "複数のタスクとイベントの組み合わせの紐付けを一括で解除します。",
    {
      pairs: z
        .array(
          z.object({
            taskId: z.string().describe("タスクのID"),
            eventId: z.string().describe("イベントのID"),
          }),
        )
        .describe("紐付けを解除するタスクとイベントのペアの配列"),
    },
    async ({ pairs }) => {
      try {
        const results = [];
        const errors = [];

        // 各ペアを処理
        for (const pair of pairs) {
          const { taskId, eventId } = pair;

          try {
            // 紐付けの存在確認
            const linkIndex = taskEventLinks.findIndex(
              (link) => link.taskId === taskId && link.eventId === eventId,
            );

            if (linkIndex === -1) {
              errors.push({
                taskId,
                eventId,
                error: `指定されたタスク(${taskId})とイベント(${eventId})の紐付けが見つかりません。`,
              });
              continue;
            }

            // 紐付け情報削除
            const deletedLink = taskEventLinks.splice(linkIndex, 1)[0];
            results.push({
              id: deletedLink.id,
              taskId: deletedLink.taskId,
              eventId: deletedLink.eventId,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            errors.push({
              taskId,
              eventId,
              error: errorMessage,
            });
          }
        }

        const response: DeleteLinkResponse & {
          unlinked: number;
          total: number;
          results: Array<{ id: string; taskId: string; eventId: string }>;
          errors?: Array<{ taskId: string; eventId: string; error: string }>;
        } = {
          success: errors.length === 0,
          message: `${results.length}件のタスクとイベントの紐付けが解除されました。`,
          unlinked: results.length,
          total: pairs.length,
          results,
          errors: errors.length > 0 ? errors : undefined,
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

  // タスクに複数のイベントを一括紐付けツール
  server.tool(
    "linkTaskToMultipleEvents",
    "1つのタスクを複数のイベントに一括で紐付けます。",
    {
      taskId: z.string().describe("紐付けるタスクのID"),
      eventIds: z.array(z.string()).describe("紐付けるイベントIDの配列"),
      notes: z.string().optional().describe("紐付けに関するメモ（オプション）"),
    },
    async ({ taskId, eventIds, notes }) => {
      try {
        // タスクの存在確認
        await tasksClient.tasks.get({
          tasklist: "@default",
          task: taskId,
        });

        const results = [];
        const errors = [];

        // 各イベントIDを処理
        for (const eventId of eventIds) {
          try {
            // イベントの存在確認
            await calendarClient.events.get({
              calendarId: "primary",
              eventId,
            });

            // 既存の紐付けをチェック
            const existingLink = taskEventLinks.find(
              (link) => link.taskId === taskId && link.eventId === eventId,
            );

            if (existingLink) {
              errors.push({
                eventId,
                error: `このタスク(${taskId})とイベント(${eventId})は既に紐付けられています。`,
              });
              continue;
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
            results.push(link);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            errors.push({
              eventId,
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
                  taskId,
                  linked: results.length,
                  total: eventIds.length,
                  results,
                  errors: errors.length > 0 ? errors : undefined,
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

  // イベントに複数のタスクを一括紐付けツール
  server.tool(
    "linkEventToMultipleTasks",
    "1つのイベントを複数のタスクに一括で紐付けます。",
    {
      eventId: z.string().describe("紐付けるイベントのID"),
      taskIds: z.array(z.string()).describe("紐付けるタスクIDの配列"),
      notes: z.string().optional().describe("紐付けに関するメモ（オプション）"),
    },
    async ({ eventId, taskIds, notes }) => {
      try {
        // イベントの存在確認
        await calendarClient.events.get({
          calendarId: "primary",
          eventId,
        });

        const results = [];
        const errors = [];

        // 各タスクIDを処理
        for (const taskId of taskIds) {
          try {
            // タスクの存在確認
            await tasksClient.tasks.get({
              tasklist: "@default",
              task: taskId,
            });

            // 既存の紐付けをチェック
            const existingLink = taskEventLinks.find(
              (link) => link.taskId === taskId && link.eventId === eventId,
            );

            if (existingLink) {
              errors.push({
                taskId,
                error: `このタスク(${taskId})とイベント(${eventId})は既に紐付けられています。`,
              });
              continue;
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
            results.push(link);
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
                  eventId,
                  linked: results.length,
                  total: taskIds.length,
                  results,
                  errors: errors.length > 0 ? errors : undefined,
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
