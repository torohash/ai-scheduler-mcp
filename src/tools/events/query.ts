import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import {
  CalendarEvent,
  EventsResponse,
  TimeRange,
  TimeRangePreset,
} from "../../models/event/index.js";
import { getTimeRangeFromPreset } from "../../utils/date.js";

/**
 * イベント関連の検索・クエリツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerEventQueryTools(
  server: McpServer,
  authClient: OAuth2Client
): void {
  // Google Calendar APIクライアント初期化
  const calendarClient = google.calendar({ version: "v3", auth: authClient });

  // イベント一覧取得ツール
  server.tool(
    "listEvents",
    {
      timeMin: z.string().optional(),
      timeMax: z.string().optional(),
      calendarId: z.string().optional().default("primary"),
      maxResults: z.number().optional(),
      pageToken: z.string().optional(),
      timeZone: z.string().optional(),
    },
    async ({
      timeMin,
      timeMax,
      calendarId,
      maxResults,
      pageToken,
      timeZone,
    }) => {
      try {
        const response = await calendarClient.events.list({
          calendarId,
          timeMin,
          timeMax,
          maxResults,
          pageToken,
          timeZone,
        });

        const eventsResponse: EventsResponse = {
          items: response.data.items as CalendarEvent[],
          nextPageToken: response.data.nextPageToken || undefined,
          timeZone: response.data.timeZone || "UTC",
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
    }
  );

  // 時間範囲プリセットを使用したイベント一覧取得ツール
  server.tool(
    "listEventsInTimeRange",
    {
      timeRange: z.union([
        z.object({
          preset: z.enum([
            "today",
            "tomorrow",
            "this_week",
            "next_week",
            "this_month",
          ]),
        }),
        z.object({
          start: z.string(),
          end: z.string(),
        }),
      ]),
      calendarId: z.string().optional().default("primary"),
      includeLinkedTasks: z.boolean().optional().default(false),
      maxResults: z.number().optional(),
      pageToken: z.string().optional(),
      timeZone: z.string().optional(),
    },
    async ({
      timeRange,
      calendarId,
      includeLinkedTasks,
      maxResults,
      pageToken,
      timeZone,
    }) => {
      try {
        // 時間範囲の計算
        let timeMin: string;
        let timeMax: string;

        if ("preset" in timeRange) {
          const range = getTimeRangeFromPreset(timeRange.preset);
          timeMin = range.start;
          timeMax = range.end;
        } else {
          timeMin = timeRange.start;
          timeMax = timeRange.end;
        }

        // イベント一覧取得
        const response = await calendarClient.events.list({
          calendarId,
          timeMin,
          timeMax,
          maxResults,
          pageToken,
          timeZone,
        });

        const eventsResponse: EventsResponse = {
          items: response.data.items as CalendarEvent[],
          nextPageToken: response.data.nextPageToken || undefined,
          timeZone: response.data.timeZone || "UTC",
        };

        // TODO: includeLinkedTasksがtrueの場合、関連するタスクも取得する処理を追加

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
    }
  );

  // タグでイベントを検索するツール
  server.tool(
    "listEventsByTags",
    {
      tags: z.array(z.string()),
      matchAll: z.boolean().optional().default(false),
      timeMin: z.string().optional(),
      timeMax: z.string().optional(),
      calendarId: z.string().optional().default("primary"),
      maxResults: z.number().optional(),
      pageToken: z.string().optional(),
      timeZone: z.string().optional(),
    },
    async ({
      tags,
      matchAll,
      timeMin,
      timeMax,
      calendarId,
      maxResults,
      pageToken,
      timeZone,
    }) => {
      try {
        // イベント一覧取得
        const response = await calendarClient.events.list({
          calendarId,
          timeMin,
          timeMax,
          maxResults: maxResults || 100, // タグフィルタリング前に多めに取得
          pageToken,
          timeZone,
        });

        // タグでフィルタリング（拡張フィールドを想定）
        const filteredEvents = (response.data.items as any[]).filter(
          (event) => {
            if (!event.tags) return false;

            if (matchAll) {
              // すべてのタグが一致するかチェック
              return tags.every((tag) => event.tags.includes(tag));
            } else {
              // いずれかのタグが一致するかチェック
              return tags.some((tag) => event.tags.includes(tag));
            }
          }
        );

        const eventsResponse: EventsResponse = {
          items: filteredEvents as CalendarEvent[],
          nextPageToken: response.data.nextPageToken || undefined,
          timeZone: response.data.timeZone || "UTC",
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
    }
  );
}
