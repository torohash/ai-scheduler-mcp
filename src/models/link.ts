import type { CalendarEvent } from "./event/types.js"; // typeインポートで循環参照を回避
import type { Task } from "./task/types.js"; // typeインポートで循環参照を回避

/**
 * タスクとイベントの紐付け情報の型定義
 */
export interface TaskEventLink {
  id: string; // リンクの一意識別子
  taskId: string; // タスクのID
  eventId: string; // イベントのID
  userId: string; // ユーザーのID
  createdAt: string; // 作成日時 (RFC 3339形式)
  updatedAt: string; // 更新日時 (RFC 3339形式)
  notes?: string; // リンクに関する追加メモ（オプション）
}

/**
 * 紐付け作成リクエストの型定義
 */
export interface CreateLinkRequest {
  taskId: string;
  eventId: string;
  notes?: string;
}

/**
 * 紐付け更新リクエストの型定義
 */
export interface UpdateLinkRequest {
  notes?: string;
}

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
 * タスクとイベントの紐付けリクエストの型定義
 */
export interface LinkTaskEventRequest {
  notes?: string;
}

/**
 * タスクとイベントの紐付け解除レスポンスの型定義
 */
export interface UnlinkTaskEventResponse {
  success: boolean;
  message?: string;
}
