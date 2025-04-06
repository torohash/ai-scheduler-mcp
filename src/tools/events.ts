import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import {
  CalendarEvent,
  EventsResponse,
  DeleteEventResponse,
} from "../models/event.js";

/**
 * イベント関連のツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerEventTools(
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

  // イベント取得ツール
  server.tool(
    "getEvent",
    {
      eventId: z.string(),
      calendarId: z.string().optional().default("primary"),
      timeZone: z.string().optional(),
    },
    async ({ eventId, calendarId, timeZone }) => {
      try {
        const response = await calendarClient.events.get({
          calendarId,
          eventId,
          timeZone,
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

  // イベント作成ツール
  server.tool(
    "createEvent",
    {
      summary: z.string(),
      description: z.string().optional(),
      location: z.string().optional(),
      start: z.object({
        dateTime: z.string(),
        timeZone: z.string(),
      }),
      end: z.object({
        dateTime: z.string(),
        timeZone: z.string(),
      }),
      recurrence: z.array(z.string()).optional(),
      attendees: z
        .array(
          z.object({
            email: z.string(),
            displayName: z.string().optional(),
          })
        )
        .optional(),
      reminders: z
        .object({
          useDefault: z.boolean(),
          overrides: z
            .array(
              z.object({
                method: z.string(),
                minutes: z.number(),
              })
            )
            .optional(),
        })
        .optional(),
      colorId: z.string().optional(),
      calendarId: z.string().optional().default("primary"),
    },
    async ({
      summary,
      description,
      location,
      start,
      end,
      recurrence,
      attendees,
      reminders,
      colorId,
      calendarId,
    }) => {
      try {
        const response = await calendarClient.events.insert({
          calendarId,
          requestBody: {
            summary,
            description,
            location,
            start,
            end,
            recurrence,
            attendees,
            reminders,
            colorId,
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

  // イベント更新ツール
  server.tool(
    "updateEvent",
    {
      eventId: z.string(),
      calendarId: z.string().optional().default("primary"),
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
      recurrence: z.array(z.string()).optional(),
      attendees: z
        .array(
          z.object({
            email: z.string(),
            displayName: z.string().optional(),
          })
        )
        .optional(),
      reminders: z
        .object({
          useDefault: z.boolean(),
          overrides: z
            .array(
              z.object({
                method: z.string(),
                minutes: z.number(),
              })
            )
            .optional(),
        })
        .optional(),
      colorId: z.string().optional(),
    },
    async ({
      eventId,
      calendarId,
      summary,
      description,
      location,
      start,
      end,
      recurrence,
      attendees,
      reminders,
      colorId,
    }) => {
      try {
        const response = await calendarClient.events.update({
          calendarId,
          eventId,
          requestBody: {
            summary,
            description,
            location,
            start,
            end,
            recurrence,
            attendees,
            reminders,
            colorId,
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

  // イベント削除ツール
  server.tool(
    "deleteEvent",
    {
      eventId: z.string(),
      calendarId: z.string().optional().default("primary"),
    },
    async ({ eventId, calendarId }) => {
      try {
        await calendarClient.events.delete({
          calendarId,
          eventId,
        });

        const deleteResponse: DeleteEventResponse = {
          success: true,
          message: "Event deleted successfully",
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
