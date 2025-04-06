/**
 * 日付操作ユーティリティ関数
 */

/**
 * 時間範囲プリセットから実際の時間範囲を計算する
 * @param preset 時間範囲プリセット
 * @returns 開始時刻と終了時刻を含むオブジェクト
 */
export function getTimeRangeFromPreset(
  preset: "today" | "tomorrow" | "this_week" | "next_week" | "this_month",
): { start: string; end: string } {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (preset) {
    case "today":
      // 今日の0時0分0秒
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // 明日の0時0分0秒 - 1ミリ秒
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      end.setMilliseconds(-1);
      break;

    case "tomorrow":
      // 明日の0時0分0秒
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      // 明後日の0時0分0秒 - 1ミリ秒
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2);
      end.setMilliseconds(-1);
      break;

    case "this_week": {
      // 今週の月曜日の0時0分0秒（日曜始まりの場合は日曜日）
      const dayOfWeek = now.getDay(); // 0: 日曜, 1: 月曜, ..., 6: 土曜
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 月曜始まりに調整
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - daysSinceMonday,
      );
      // 来週の月曜日の0時0分0秒 - 1ミリ秒
      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - daysSinceMonday + 7,
      );
      end.setMilliseconds(-1);
      break;
    }

    case "next_week": {
      // 来週の月曜日の0時0分0秒
      const nextWeekDayOfWeek = now.getDay(); // 0: 日曜, 1: 月曜, ..., 6: 土曜
      const daysUntilNextMonday =
        nextWeekDayOfWeek === 0 ? 1 : 8 - nextWeekDayOfWeek; // 月曜始まりに調整
      start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + daysUntilNextMonday,
      );
      // 再来週の月曜日の0時0分0秒 - 1ミリ秒
      end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + daysUntilNextMonday + 7,
      );
      end.setMilliseconds(-1);
      break;
    }

    case "this_month":
      // 今月の1日の0時0分0秒
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      // 来月の1日の0時0分0秒 - 1ミリ秒
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      end.setMilliseconds(-1);
      break;

    default:
      throw new Error(`Unknown preset: ${preset}`);
  }

  // RFC 3339形式に変換
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

/**
 * 日付をRFC 3339形式に変換する
 * @param date 日付オブジェクト
 * @returns RFC 3339形式の日付文字列
 */
export function toRFC3339(date: Date): string {
  return date.toISOString();
}

/**
 * 分単位で時間をシフトする
 * @param dateString RFC 3339形式の日付文字列
 * @param minutes シフトする分数（正の値で未来、負の値で過去）
 * @returns シフト後のRFC 3339形式の日付文字列
 */
export function shiftTime(dateString: string, minutes: number): string {
  const date = new Date(dateString);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

/**
 * 2つの日付の間の分数を計算する
 * @param start 開始日時（RFC 3339形式）
 * @param end 終了日時（RFC 3339形式）
 * @returns 分数
 */
export function minutesBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.floor(diffMs / (1000 * 60));
}
