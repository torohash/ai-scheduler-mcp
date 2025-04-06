/**
 * Google Calendar APIから取得するイベントの型定義
 */
export interface CalendarEvent {
  id: string; // イベントの一意識別子
  summary: string; // イベントのタイトル
  description?: string; // イベントの詳細説明
  location?: string; // 場所
  start: {
    // 開始日時
    dateTime: string; // RFC 3339形式
    timeZone: string; // タイムゾーン（例: "Asia/Tokyo"）
  };
  end: {
    // 終了日時
    dateTime: string; // RFC 3339形式
    timeZone: string; // タイムゾーン（例: "Asia/Tokyo"）
  };
  recurrence?: string[]; // 繰り返しルール
  attendees?: Array<{
    // 参加者
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  reminders?: {
    // リマインダー設定
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  status?: string; // イベントのステータス
  colorId?: string; // 色分け用ID
  etag?: string; // エンティティタグ
  created?: string; // 作成日時 (RFC 3339形式)
  updated?: string; // 更新日時 (RFC 3339形式)
}
