/**
 * Google Tasks APIから取得するタスクの型定義
 */
export interface Task {
  id: string; // タスクの一意識別子
  title: string; // タスクのタイトル
  notes?: string; // タスクの詳細説明
  status: "needsAction" | "completed"; // タスクのステータス
  due?: string; // 期限日時 (RFC 3339形式)
  completed?: string; // 完了日時 (RFC 3339形式)
  deleted?: boolean; // 削除されたかどうか
  hidden?: boolean; // 非表示かどうか
  links?: Array<{
    // 関連リンク
    type: string;
    description: string;
    link: string;
  }>;
  position?: string; // タスクリスト内での位置
  parent?: string; // 親タスクのID（階層構造の場合）
  etag?: string; // エンティティタグ
  updated?: string; // 更新日時 (RFC 3339形式)
  selfLink?: string; // 自己参照リンク
}

/**
 * タスク作成リクエストの型定義
 */
export interface CreateTaskRequest {
  title: string;
  notes?: string;
  due?: string;
  status?: "needsAction" | "completed";
  parent?: string;
}

/**
 * タスク更新リクエストの型定義
 */
export interface UpdateTaskRequest {
  title?: string;
  notes?: string;
  due?: string;
  status?: "needsAction" | "completed";
  completed?: string;
}

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
