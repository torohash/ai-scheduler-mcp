import type { CalendarEvent } from "../event/types.js"; // typeインポートで循環参照を回避
import type { Task } from "../task/types.js"; // typeインポートで循環参照を回避
import { TaskEventLink } from "./types.js";

/**
 * 紐付け削除レスポンスの型定義
 */
export interface DeleteLinkResponse {
  success: boolean;
  message?: string;
}

/**
 * 紐付け一覧レスポンスの型定義
 */
export interface LinksResponse {
  items: TaskEventLink[];
  nextPageToken?: string;
}

/**
 * タスクに紐付けられたイベント一覧レスポンスの型定義
 */
export interface TaskEventsResponse {
  items: CalendarEvent[];
  nextPageToken?: string;
  timeZone: string; // レスポンスで使用されているタイムゾーン
}

/**
 * イベントに紐付けられたタスク一覧レスポンスの型定義
 */
export interface EventTasksResponse {
  items: Task[];
  nextPageToken?: string;
}

/**
 * タスクとイベントの紐付け解除レスポンスの型定義
 */
export interface UnlinkTaskEventResponse {
  success: boolean;
  message?: string;
}
