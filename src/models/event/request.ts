/**
 * イベント作成リクエストの型定義
 */
export interface CreateEventRequest {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string; // RFC 3339形式
    timeZone: string; // タイムゾーン（例: "Asia/Tokyo"）
  };
  end: {
    dateTime: string; // RFC 3339形式
    timeZone: string; // タイムゾーン（例: "Asia/Tokyo"）
  };
  recurrence?: string[];
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  colorId?: string;
  calendarId?: string;
}

/**
 * イベント更新リクエストの型定義
 */
export interface UpdateEventRequest {
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime: string; // RFC 3339形式
    timeZone: string; // タイムゾーン（例: "Asia/Tokyo"）
  };
  end?: {
    dateTime: string; // RFC 3339形式
    timeZone: string; // タイムゾーン（例: "Asia/Tokyo"）
  };
  recurrence?: string[];
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  colorId?: string;
}
