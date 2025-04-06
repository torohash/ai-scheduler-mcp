import { Task } from "./types.js";

/**
 * タスク削除レスポンスの型定義
 */
export interface DeleteTaskResponse {
  success: boolean;
  message?: string;
}

/**
 * タスク一覧レスポンスの型定義
 */
export interface TasksResponse {
  items: Task[];
  nextPageToken?: string;
}
