import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { z } from "zod";
import {
  TaskEventLink,
  LinksResponse,
  TaskEventsResponse,
  EventTasksResponse,
} from "../../models/link/index.js";
import { Task } from "../../models/task/types.js";
import { CalendarEvent } from "../../models/event/types.js";

// basic.tsからtaskEventLinksをインポート
import { taskEventLinks } from "./basic.js";

/**
 * Registers link query tools.
 * @param server The MCP server instance.
 * @param _authClient The authenticated OAuth2 client (currently unused).
 */
export function registerQueryLinkTools(
  server: McpServer,
  authClient: OAuth2Client,
): void {
  // Google APIクライアント初期化
  const tasksClient = google.tasks({ version: "v1", auth: authClient });
  const calendarClient = google.calendar({ version: "v3", auth: authClient });
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

  // タスクに紐付けられたイベント一覧取得ツール
  server.tool(
    "getTaskEvents",
    "特定のタスクに紐付けられたGoogle Calendarイベントを取得します。",
    {
      taskId: z.string().describe("イベントを取得するタスクのID"),
      timeZone: z
        .string()
        .optional()
        .describe("タイムゾーン（例: 'Asia/Tokyo'）"),
      maxResults: z.number().optional().describe("取得する最大結果数"),
      pageToken: z.string().optional().describe("ページネーショントークン"),
    },
    async ({ taskId, timeZone = "UTC", maxResults, pageToken }) => {
      try {
        // タスクの存在確認
        await tasksClient.tasks.get({
          tasklist: "@default",
          task: taskId,
        });

        // タスクに紐付けられたリンクを取得
        const links = taskEventLinks.filter((link) => link.taskId === taskId);

        if (links.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    items: [],
                    nextPageToken: undefined,
                    timeZone,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // イベントIDのリストを作成
        const eventIds = links.map((link) => link.eventId);

        // ページネーション処理（簡易実装）
        const startIndex = pageToken ? parseInt(pageToken) : 0;
        const endIndex = maxResults ? startIndex + maxResults : eventIds.length;
        const paginatedEventIds = eventIds.slice(startIndex, endIndex);

        // イベント情報を取得
        const events: CalendarEvent[] = [];
        for (const eventId of paginatedEventIds) {
          try {
            const response = await calendarClient.events.get({
              calendarId: "primary",
              eventId,
              timeZone,
            });

            if (response.data) {
              events.push(response.data as unknown as CalendarEvent);
            }
          } catch (error) {
            console.error(`イベント取得エラー (ID: ${eventId}):`, error);
            // エラーが発生しても処理を続行
          }
        }

        const nextPageToken =
          endIndex < eventIds.length ? endIndex.toString() : undefined;

        const eventsResponse: TaskEventsResponse = {
          items: events,
          nextPageToken,
          timeZone,
        };

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(eventsResponse, null, 2),
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

  // イベントに紐付けられたタスク一覧取得ツール
  server.tool(
    "getEventTasks",
    "特定のイベントに紐付けられたGoogle Tasksのタスクを取得します。",
    {
      eventId: z.string().describe("タスクを取得するイベントのID"),
      maxResults: z.number().optional().describe("取得する最大結果数"),
      pageToken: z.string().optional().describe("ページネーショントークン"),
    },
    async ({ eventId, maxResults, pageToken }) => {
      try {
        // イベントの存在確認
        await calendarClient.events.get({
          calendarId: "primary",
          eventId,
        });

        // イベントに紐付けられたリンクを取得
        const links = taskEventLinks.filter((link) => link.eventId === eventId);

        if (links.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    items: [],
                    nextPageToken: undefined,
                  },
                  null,
                  2,
                ),
              },
            ],
          };
        }

        // タスクIDのリストを作成
        const taskIds = links.map((link) => link.taskId);

        // ページネーション処理（簡易実装）
        const startIndex = pageToken ? parseInt(pageToken) : 0;
        const endIndex = maxResults ? startIndex + maxResults : taskIds.length;
        const paginatedTaskIds = taskIds.slice(startIndex, endIndex);

        // タスク情報を取得
        const tasks: Task[] = [];
        for (const taskId of paginatedTaskIds) {
          try {
            const response = await tasksClient.tasks.get({
              tasklist: "@default",
              task: taskId,
            });

            if (response.data) {
              tasks.push(response.data as unknown as Task);
            }
          } catch (error) {
            console.error(`タスク取得エラー (ID: ${taskId}):`, error);
            // エラーが発生しても処理を続行
          }
        }

        const nextPageToken =
          endIndex < taskIds.length ? endIndex.toString() : undefined;

        const tasksResponse: EventTasksResponse = {
          items: tasks,
          nextPageToken,
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
    },
  );
}
