import { Task } from "./types.js";

/**
 * 拡張されたタスクモデルの型定義
 * 改善提案に基づく追加フィールドを含む
 */
export interface EnhancedTask extends Task {
  // 既存のGoogle Tasks APIフィールドはTaskから継承

  // 拡張フィールド
  tags?: string[]; // タグ付け
  category?: string; // カテゴリ分類
  priority?: "low" | "medium" | "high" | "urgent"; // 優先度
  estimatedDuration?: number; // 見積所要時間（分）
  recurrence?: string; // 繰り返しルール
  dependencies?: string[]; // 依存タスクのID
}

/**
 * タスクフィルタリングオプションの型定義
 */
export interface TaskFilterOptions {
  tags?: string[];
  matchAllTags?: boolean;
  category?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  dueRange?: {
    start?: string;
    end?: string;
  };
  includeCompleted?: boolean;
}

/**
 * バルクタスク更新の型定義
 */
export interface BulkTaskUpdates {
  title?: string;
  notes?: string;
  due?: string;
  status?: "needsAction" | "completed";
  tags?: string[];
  category?: string;
  priority?: "low" | "medium" | "high" | "urgent";
}

/**
 * タスクスケジュール提案の型定義
 */
export interface TaskScheduleSuggestion {
  taskId: string;
  suggestedStart: string;
  suggestedEnd: string;
  reason: string;
}
