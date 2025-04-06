import { TaskEventLink } from "./types.js";

/**
 * 拡張されたタスクイベントリンクモデルの型定義
 * 改善提案に基づく追加フィールドを含む
 */
export interface EnhancedTaskEventLink extends TaskEventLink {
  // 既存のフィールドはTaskEventLinkから継承

  // 拡張フィールド
  linkType?: "preparation" | "execution" | "followup"; // リンクの種類
  autoSync?: boolean; // 自動同期するかどうか
  syncFields?: Array<"title" | "description" | "time" | "status">; // 同期するフィールド
}

/**
 * リンクフィルタリングオプションの型定義
 */
export interface LinkFilterOptions {
  taskId?: string;
  eventId?: string;
  linkType?: "preparation" | "execution" | "followup";
  createdAfter?: string;
  createdBefore?: string;
}

/**
 * 同期設定の型定義
 */
export interface SyncSettings {
  autoSync: boolean;
  syncFields: Array<"title" | "description" | "time" | "status">;
  primarySource: "task" | "event"; // 同期の主体となるソース
}

/**
 * バルクリンク更新の型定義
 */
export interface BulkLinkUpdates {
  linkType?: "preparation" | "execution" | "followup";
  notes?: string;
  autoSync?: boolean;
  syncFields?: Array<"title" | "description" | "time" | "status">;
}
