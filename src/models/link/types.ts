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
