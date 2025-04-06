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
 * タスクとイベントの紐付けリクエストの型定義
 */
export interface LinkTaskEventRequest {
  notes?: string;
}
