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
