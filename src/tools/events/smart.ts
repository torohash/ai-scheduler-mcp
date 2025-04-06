import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";
import { minutesBetween } from "../../utils/date.js";

/**
 * イベント関連のインテリジェント機能ツールを登録する
 * @param server MCPサーバーインスタンス
 * @param authClient 認証済みのOAuth2クライアント
 */
export function registerEventSmartTools(
  server: McpServer,
  authClient: OAuth2Client
): void {
  // Google Calendar APIクライアント初期化
  const calendarClient = google.calendar({ version: "v3", auth: authClient });

  // スマートクエリ機能
  server.tool(
    "smartEventQuery",
    {
      query: z.string(), // 例: "今週の会議", "プロジェクトXに関連するイベント"
      timeZone: z.string().optional(),
    },
    async ({ query, timeZone }) => {
      try {
        // 注: 実際の実装では、自然言語クエリを解析して適切なパラメータに変換する処理が必要
        // ここでは簡易的な実装例を示す

        // クエリからキーワードを抽出
        const keywords = query.toLowerCase().split(/\s+/);

        // 時間範囲の判定
        let timeMin: string | undefined;
        let timeMax: string | undefined;

        const now = new Date();

        if (keywords.includes("今日") || keywords.includes("today")) {
          timeMin = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          ).toISOString();
          timeMax = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + 1
          ).toISOString();
        } else if (
          keywords.includes("今週") ||
          keywords.includes("this_week") ||
          keywords.includes("this-week")
        ) {
          const dayOfWeek = now.getDay();
          const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          timeMin = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - daysSinceMonday
          ).toISOString();
          timeMax = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - daysSinceMonday + 7
          ).toISOString();
        } else if (
          keywords.includes("今月") ||
          keywords.includes("this_month") ||
          keywords.includes("this-month")
        ) {
          timeMin = new Date(
            now.getFullYear(),
            now.getMonth(),
            1
          ).toISOString();
          timeMax = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            1
          ).toISOString();
        }

        // イベント一覧取得
        const response = await calendarClient.events.list({
          calendarId: "primary",
          timeMin,
          timeMax,
          timeZone,
          q: keywords
            .filter(
              (k) =>
                ![
                  "今日",
                  "today",
                  "今週",
                  "this_week",
                  "this-week",
                  "今月",
                  "this_month",
                  "this-month",
                ].includes(k)
            )
            .join(" "),
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  query: query,
                  interpretation: {
                    timeRange:
                      timeMin && timeMax
                        ? { start: timeMin, end: timeMax }
                        : "指定なし",
                    keywords: keywords.filter(
                      (k) =>
                        ![
                          "今日",
                          "today",
                          "今週",
                          "this_week",
                          "this-week",
                          "今月",
                          "this_month",
                          "this-month",
                        ].includes(k)
                    ),
                  },
                  results: response.data.items,
                },
                null,
                2
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
    }
  );

  // 空き時間検出ツール
  server.tool(
    "findFreeTimeSlots",
    {
      startDate: z.string(), // 検索開始日時（RFC 3339形式）
      endDate: z.string(), // 検索終了日時（RFC 3339形式）
      minDuration: z.number().optional().default(30), // 最小所要時間（分）
      maxResults: z.number().optional().default(5), // 最大結果数
      calendarIds: z.array(z.string()).optional().default(["primary"]), // 検索対象のカレンダーID
      timeZone: z.string().optional(),
    },
    async ({
      startDate,
      endDate,
      minDuration,
      maxResults,
      calendarIds,
      timeZone,
    }) => {
      try {
        const freeSlots = [];

        // 各カレンダーのイベントを取得
        const allEvents = [];
        for (const calendarId of calendarIds) {
          const response = await calendarClient.events.list({
            calendarId,
            timeMin: startDate,
            timeMax: endDate,
            timeZone,
            singleEvents: true, // 繰り返しイベントを展開
            orderBy: "startTime",
          });

          if (response.data.items) {
            allEvents.push(...response.data.items);
          }
        }

        // イベントを開始時刻でソート
        allEvents.sort((a, b) => {
          const aStart = a.start?.dateTime || a.start?.date || "";
          const bStart = b.start?.dateTime || b.start?.date || "";
          return aStart.localeCompare(bStart);
        });

        // 空き時間を検出
        let currentTime = new Date(startDate);
        const endTime = new Date(endDate);

        for (const event of allEvents) {
          const eventStart = new Date(
            event.start?.dateTime || event.start?.date || ""
          );

          // 現在時刻からイベント開始時刻までの間に空き時間があるか確認
          if (eventStart > currentTime) {
            const duration = minutesBetween(
              currentTime.toISOString(),
              eventStart.toISOString()
            );

            if (duration >= minDuration) {
              freeSlots.push({
                start: currentTime.toISOString(),
                end: eventStart.toISOString(),
                duration: duration,
              });

              if (freeSlots.length >= maxResults) {
                break;
              }
            }
          }

          // 現在時刻をイベント終了時刻に更新
          const eventEnd = new Date(
            event.end?.dateTime || event.end?.date || ""
          );
          if (eventEnd > currentTime) {
            currentTime = eventEnd;
          }
        }

        // 最後のイベント終了時刻から検索終了時刻までの間に空き時間があるか確認
        if (currentTime < endTime && freeSlots.length < maxResults) {
          const duration = minutesBetween(
            currentTime.toISOString(),
            endTime.toISOString()
          );

          if (duration >= minDuration) {
            freeSlots.push({
              start: currentTime.toISOString(),
              end: endTime.toISOString(),
              duration: duration,
            });
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  freeTimeSlots: freeSlots,
                  searchParams: {
                    startDate,
                    endDate,
                    minDuration,
                    calendarIds,
                  },
                },
                null,
                2
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
    }
  );
}
