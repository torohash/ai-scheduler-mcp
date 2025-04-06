import { CalendarEvent } from "./types.js";

/**
 * 拡張されたイベントモデルの型定義
 * 改善提案に基づく追加フィールドを含む
 */
export interface EnhancedCalendarEvent extends CalendarEvent {
  // 既存のGoogle Calendar APIフィールドはCalendarEventから継承

  // 拡張フィールド
  tags?: string[]; // タグ付け
  category?: string; // カテゴリ分類
  priority?: "low" | "medium" | "high" | "urgent"; // 優先度
  isFlexible?: boolean; // 時間調整可能かどうか
  bufferBefore?: number; // 前の予定との間隔（分）
  bufferAfter?: number; // 次の予定との間隔（分）
}

/**
 * 時間範囲プリセットの型定義
 */
export interface TimeRangePreset {
  preset: "today" | "tomorrow" | "this_week" | "next_week" | "this_month";
}

/**
 * カスタム時間範囲の型定義
 */
export interface CustomTimeRange {
  start: string;
  end: string;
}

/**
 * 時間範囲の型定義（プリセットまたはカスタム）
 */
export type TimeRange = TimeRangePreset | CustomTimeRange;

/**
 * バルクイベント更新の型定義
 */
export interface BulkEventUpdates {
  timeShift?: number; // 分単位での時間シフト
  summary?: string;
  description?: string;
  location?: string;
  colorId?: string;
}
