import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import {
  TaskEventLink,
  LinksResponse,
  DeleteLinkResponse,
} from "../models/link.js";

/**
 * タスクとイベントの紐付け関連のツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerLinkTools(
  server: McpServer,
  authClient: OAuth2Client,
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

  // 特定の紐付け取得ツール
  server.tool(
    "getTaskEventLink",
    {
      linkId: z.string(),
    },
    async ({ linkId }) => {
      try {
        const link = taskEventLinks.find((link) => link.id === linkId);

        if (!link) {
          return {
            content: [
              {
                type: "text",
                text: `Error: Link with ID ${linkId} not found`,
              },
            ],
            isError: true,
          };
        }

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

  // 紐付け作成ツール
  server.tool(
    "createTaskEventLink",
    {
      taskId: z.string(),
      eventId: z.string(),
      notes: z.string().optional(),
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

        // 紐付け情報作成
        const link: TaskEventLink = {
          id: `link_${Date.now()}`,
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
    {
      linkId: z.string(),
      notes: z.string().optional(),
    },
    async ({ linkId, notes }) => {
      try {
        const linkIndex = taskEventLinks.findIndex(
          (link) => link.id === linkId,
        );

        if (linkIndex === -1) {
          return {
            content: [
              {
                type: "text",
                text: `Error: Link with ID ${linkId} not found`,
              },
            ],
            isError: true,
          };
        }

        // 紐付け情報更新
        const updatedLink: TaskEventLink = {
          ...taskEventLinks[linkIndex],
          notes: notes !== undefined ? notes : taskEventLinks[linkIndex].notes,
          updatedAt: new Date().toISOString(),
        };

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
    {
      linkId: z.string(),
    },
    async ({ linkId }) => {
      try {
        const linkIndex = taskEventLinks.findIndex(
          (link) => link.id === linkId,
        );

        if (linkIndex === -1) {
          return {
            content: [
              {
                type: "text",
                text: `Error: Link with ID ${linkId} not found`,
              },
            ],
            isError: true,
          };
        }

        // 紐付け情報削除
        taskEventLinks.splice(linkIndex, 1);

        const deleteResponse: DeleteLinkResponse = {
          success: true,
          message: "Link deleted successfully",
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

  // タスクに紐付けられたイベント取得ツール
  server.tool(
    "getTaskEvents",
    {
      taskId: z.string(),
      maxResults: z.number().optional(),
      pageToken: z.string().optional(),
      timeZone: z.string().optional(),
    },
    async ({ taskId, maxResults, pageToken, timeZone }) => {
      try {
        // タスクの存在確認
        await tasksClient.tasks.get({
          tasklist: "@default",
          task: taskId,
        });

        // タスクに紐付けられたイベントIDを取得
        const eventIds = taskEventLinks
          .filter((link) => link.taskId === taskId)
          .map((link) => link.eventId);

        // イベント情報を取得
        const events = [];
        for (const eventId of eventIds) {
          try {
            const response = await calendarClient.events.get({
              calendarId: "primary",
              eventId,
              timeZone,
            });
            events.push(response.data);
          } catch (error) {
            console.error(`Error fetching event ${eventId}:`, error);
            // エラーが発生しても処理を続行
          }
        }

        // ページネーション処理（簡易実装）
        const startIndex = pageToken ? parseInt(pageToken) : 0;
        const endIndex = maxResults ? startIndex + maxResults : events.length;
        const paginatedEvents = events.slice(startIndex, endIndex);

        const nextPageToken =
          endIndex < events.length ? endIndex.toString() : undefined;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  items: paginatedEvents,
                  nextPageToken,
                  timeZone: timeZone || "UTC",
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

  // イベントに紐付けられたタスク取得ツール
  server.tool(
    "getEventTasks",
    {
      eventId: z.string(),
      maxResults: z.number().optional(),
      pageToken: z.string().optional(),
    },
    async ({ eventId, maxResults, pageToken }) => {
      try {
        // イベントの存在確認
        await calendarClient.events.get({
          calendarId: "primary",
          eventId,
        });

        // イベントに紐付けられたタスクIDを取得
        const taskIds = taskEventLinks
          .filter((link) => link.eventId === eventId)
          .map((link) => link.taskId);

        // タスク情報を取得
        const tasks = [];
        for (const taskId of taskIds) {
          try {
            const response = await tasksClient.tasks.get({
              tasklist: "@default",
              task: taskId,
            });
            tasks.push(response.data);
          } catch (error) {
            console.error(`Error fetching task ${taskId}:`, error);
            // エラーが発生しても処理を続行
          }
        }

        // ページネーション処理（簡易実装）
        const startIndex = pageToken ? parseInt(pageToken) : 0;
        const endIndex = maxResults ? startIndex + maxResults : tasks.length;
        const paginatedTasks = tasks.slice(startIndex, endIndex);

        const nextPageToken =
          endIndex < tasks.length ? endIndex.toString() : undefined;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  items: paginatedTasks,
                  nextPageToken,
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
