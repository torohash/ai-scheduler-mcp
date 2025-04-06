import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

/**
 * 日付関連のツールを登録する
 * @param server MCPサーバーインスタンス
 */
export function registerDateTools(server: McpServer): void {
  // 現在の日付を取得するツール
  server.tool(
    "getCurrentDate",
    "現在の日付と時刻を取得します。フォーマットを指定することで出力形式を変更できます。",
    {
      format: z
        .enum([
          "iso", // ISO 8601形式 (2023-04-06T14:26:38.123Z)
          "localeDate", // 地域に合わせた日付形式 (2023/4/6)
          "localeDateTime", // 地域に合わせた日付と時刻形式 (2023/4/6 14:26:38)
          "timestamp", // UNIXタイムスタンプ (ミリ秒)
          "year", // 年のみ (2023)
          "month", // 月のみ (4)
          "day", // 日のみ (6)
          "time", // 時刻のみ (14:26:38)
        ])
        .optional()
        .default("iso"),
      locale: z.string().optional().default("ja-JP"),
      timeZone: z.string().optional(),
    },
    async ({ format, locale, timeZone }) => {
      try {
        const now = new Date();
        let result: string | number;

        // タイムゾーンが指定されている場合の処理
        const options: Intl.DateTimeFormatOptions = {};
        if (timeZone) {
          options.timeZone = timeZone;
        }

        switch (format) {
          case "iso":
            result = now.toISOString();
            break;
          case "localeDate":
            options.dateStyle = "full";
            result = new Intl.DateTimeFormat(locale, options).format(now);
            break;
          case "localeDateTime":
            options.dateStyle = "full";
            options.timeStyle = "long";
            result = new Intl.DateTimeFormat(locale, options).format(now);
            break;
          case "timestamp":
            result = now.getTime();
            break;
          case "year":
            result = now.getFullYear();
            break;
          case "month":
            result = now.getMonth() + 1; // JavaScriptの月は0から始まるため+1
            break;
          case "day":
            result = now.getDate();
            break;
          case "time":
            options.timeStyle = "medium";
            result = new Intl.DateTimeFormat(locale, options).format(now);
            break;
          default:
            result = now.toISOString();
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  date: result,
                  format,
                  locale,
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

  // 日付の比較ツール
  server.tool(
    "compareDates",
    "2つの日付を比較し、その差分を計算します。",
    {
      date1: z.string(),
      date2: z.string(),
      unit: z
        .enum(["milliseconds", "seconds", "minutes", "hours", "days"])
        .optional()
        .default("days"),
    },
    async ({ date1, date2, unit }) => {
      try {
        const d1 = new Date(date1);
        const d2 = new Date(date2);

        // 日付が無効な場合はエラー
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
          throw new Error("Invalid date format");
        }

        // 差分をミリ秒で計算
        const diffMs = d2.getTime() - d1.getTime();

        // 指定された単位に変換
        let difference: number;
        let unitLabel: string;

        switch (unit) {
          case "milliseconds":
            difference = diffMs;
            unitLabel = "ミリ秒";
            break;
          case "seconds":
            difference = diffMs / 1000;
            unitLabel = "秒";
            break;
          case "minutes":
            difference = diffMs / (1000 * 60);
            unitLabel = "分";
            break;
          case "hours":
            difference = diffMs / (1000 * 60 * 60);
            unitLabel = "時間";
            break;
          case "days":
            difference = diffMs / (1000 * 60 * 60 * 24);
            unitLabel = "日";
            break;
          default:
            difference = diffMs / (1000 * 60 * 60 * 24);
            unitLabel = "日";
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  date1,
                  date2,
                  difference,
                  unit: unitLabel,
                  isBefore: diffMs < 0,
                  isAfter: diffMs > 0,
                  isEqual: diffMs === 0,
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
