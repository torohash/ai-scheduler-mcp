import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { google, calendar_v3 } from "googleapis"; // calendar_v3 をインポート
import { shiftTime } from "../../utils/date.js";

/**
 * イベント関連のバルク操作ツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerEventBulkTools(
  server: McpServer,
  authClient: OAuth2Client,
): void {
  // Google Calendar APIクライアント初期化
  const calendarClient = google.calendar({ version: "v3", auth: authClient });

  // 複数イベントの一括更新ツール
  server.tool(
    "bulkUpdateEvents",
    {
      eventIds: z.array(z.string()),
      updates: z.object({
        timeShift: z.number().optional(), // 分単位での時間シフト
        summary: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        colorId: z.string().optional(),
      }),
      calendarId: z.string().optional().default("primary"),
    },
    async ({ eventIds, updates, calendarId }) => {
      try {
        const results = [];
        const errors = [];

        // 各イベントを順次更新
        for (const eventId of eventIds) {
          try {
            // 現在のイベント情報を取得
            const currentEvent = await calendarClient.events.get({
              calendarId,
              eventId,
            });

            // 更新内容を準備
            const updateData: calendar_v3.Schema$Event = {}; // 具体的な型を使用

            // 時間シフトの処理
            if (updates.timeShift && updates.timeShift !== 0) {
              if (currentEvent.data.start?.dateTime) {
                updateData.start = {
                  dateTime: shiftTime(
                    currentEvent.data.start.dateTime,
                    updates.timeShift,
                  ),
                  timeZone: currentEvent.data.start.timeZone,
                };
              }

              if (currentEvent.data.end?.dateTime) {
                updateData.end = {
                  dateTime: shiftTime(
                    currentEvent.data.end.dateTime,
                    updates.timeShift,
                  ),
                  timeZone: currentEvent.data.end.timeZone,
                };
              }
            }

            // その他の更新内容
            if (updates.summary !== undefined)
              updateData.summary = updates.summary;
            if (updates.description !== undefined)
              updateData.description = updates.description;
            if (updates.location !== undefined)
              updateData.location = updates.location;
            if (updates.colorId !== undefined)
              updateData.colorId = updates.colorId;

            // イベント更新
            const response = await calendarClient.events.update({
              calendarId,
              eventId,
              requestBody: updateData,
            });

            results.push({
              eventId,
              success: true,
              data: response.data,
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            errors.push({
              eventId,
              success: false,
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
                  results,
                  errors,
                  summary: {
                    total: eventIds.length,
                    succeeded: results.length,
                    failed: errors.length,
                  },
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

  // イベント更新時に関連タスクも連動して更新するツール
  server.tool(
    "updateEventWithLinkedTasks",
    {
      eventId: z.string(),
      updates: z.object({
        summary: z.string().optional(),
        description: z.string().optional(),
        location: z.string().optional(),
        start: z
          .object({
            dateTime: z.string(),
            timeZone: z.string(),
          })
          .optional(),
        end: z
          .object({
            dateTime: z.string(),
            timeZone: z.string(),
          })
          .optional(),
        colorId: z.string().optional(),
      }),
      taskUpdates: z
        .object({
          updateDueDate: z.boolean().optional().default(false),
          updateTitle: z.boolean().optional().default(false),
          updateNotes: z.boolean().optional().default(false),
        })
        .optional(),
      calendarId: z.string().optional().default("primary"),
    },
    async ({ eventId, updates, taskUpdates, calendarId }) => {
      try {
        // イベント更新
        const eventResponse = await calendarClient.events.update({
          calendarId,
          eventId,
          requestBody: updates,
        });

        // 関連タスクの更新処理（実装例）
        // 注: 実際の実装では、リンク情報を取得してタスクを更新する処理が必要
        const linkedTasksResult = {
          message: "関連タスクの更新機能は実装中です",
          taskUpdates: taskUpdates || {},
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  event: eventResponse.data,
                  linkedTasks: linkedTasksResult,
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
