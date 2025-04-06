import { CalendarEvent } from "./types.js";

/**
 * イベント削除レスポンスの型定義
 */
export interface DeleteEventResponse {
  success: boolean;
  message?: string;
}

/**
 * イベント一覧レスポンスの型定義
 */
export interface EventsResponse {
  items: CalendarEvent[];
  nextPageToken?: string;
  timeZone: string; // レスポンスで使用されているタイムゾーン
}
