# Google Tasks APIとGoogle Calendar APIを使用したタスク管理システム設計

## 概要

このドキュメントでは、Google Tasks APIとGoogle Calendar APIを使用したタスク管理システムのAPIエンドポイント設計について説明します。このシステムでは、タスクとカレンダーイベントを紐付けて管理することができ、ユーザーは既存のGoogle Tasksの機能をそのまま利用しながら、タスクとイベントの紐付けを自由に行うことができます。

## ドメインモデル

タスク管理システムのドメインモデルとして、以下の3つの主要なエンティティを考えます：

### 1. Task (Google Tasks APIから取得)

```typescript
interface Task {
  id: string;            // タスクの一意識別子
  title: string;         // タスクのタイトル
  notes?: string;        // タスクの詳細説明
  status: 'needsAction' | 'completed'; // タスクのステータス
  due?: string;          // 期限日時 (RFC 3339形式)
  completed?: string;    // 完了日時 (RFC 3339形式)
  deleted?: boolean;     // 削除されたかどうか
  hidden?: boolean;      // 非表示かどうか
  links?: Array<{        // 関連リンク
    type: string;
    description: string;
    link: string;
  }>;
  position?: string;     // タスクリスト内での位置
  parent?: string;       // 親タスクのID（階層構造の場合）
  etag?: string;         // エンティティタグ
  updated?: string;      // 更新日時 (RFC 3339形式)
  selfLink?: string;     // 自己参照リンク
}
```

### 2. CalendarEvent (Google Calendar APIから取得)

```typescript
interface CalendarEvent {
  id: string;            // イベントの一意識別子
  summary: string;       // イベントのタイトル
  description?: string;  // イベントの詳細説明
  location?: string;     // 場所
  start: {               // 開始日時
    dateTime: string;    // RFC 3339形式
    timeZone: string;    // タイムゾーン（例: "Asia/Tokyo"）
  };
  end: {                 // 終了日時
    dateTime: string;    // RFC 3339形式
    timeZone: string;    // タイムゾーン（例: "Asia/Tokyo"）
  };
  recurrence?: string[]; // 繰り返しルール
  attendees?: Array<{    // 参加者
    email: string;
    displayName?: string;
    responseStatus?: string;
  }>;
  reminders?: {          // リマインダー設定
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  status?: string;       // イベントのステータス
  colorId?: string;      // 色分け用ID
  etag?: string;         // エンティティタグ
  created?: string;      // 作成日時 (RFC 3339形式)
  updated?: string;      // 更新日時 (RFC 3339形式)
}
```

### 3. TaskEventLink (独自に管理する紐付け情報)

```typescript
interface TaskEventLink {
  id: string;            // リンクの一意識別子
  taskId: string;        // タスクのID
  eventId: string;       // イベントのID
  userId: string;        // ユーザーのID
  createdAt: string;     // 作成日時 (RFC 3339形式)
  updatedAt: string;     // 更新日時 (RFC 3339形式)
  notes?: string;        // リンクに関する追加メモ（オプション）
}
```

## APIエンドポイント設計

以下に、必要なAPIエンドポイントを設計します：

### 1. タスク関連エンドポイント

#### タスク一覧の取得

```
GET /api/tasks
```

- **説明**: ユーザーのすべてのタスクを取得
- **パラメータ**:
  - `status` (オプション): フィルタリング用のステータス
  - `dueMin`, `dueMax` (オプション): 期限による範囲フィルタリング
  - `maxResults` (オプション): 返す結果の最大数
  - `pageToken` (オプション): ページネーション用のトークン
- **レスポンス**: タスクのリスト

```typescript
interface TasksResponse {
  items: Task[];
  nextPageToken?: string;
}
```

#### 特定のタスクの取得

```
GET /api/tasks/{taskId}
```

- **説明**: 特定のタスクの詳細を取得
- **パラメータ**:
  - `taskId`: タスクのID
- **レスポンス**: タスクの詳細情報

```typescript
// Task型のオブジェクト
```

#### タスクの作成

```
POST /api/tasks
```

- **説明**: 新しいタスクを作成
- **リクエストボディ**: タスク情報

```typescript
interface CreateTaskRequest {
  title: string;
  notes?: string;
  due?: string;
  status?: 'needsAction' | 'completed';
  parent?: string;
}
```

- **レスポンス**: 作成されたタスク

```typescript
// Task型のオブジェクト
```

#### タスクの更新

```
PUT /api/tasks/{taskId}
```

- **説明**: 既存のタスクを更新
- **パラメータ**:
  - `taskId`: タスクのID
- **リクエストボディ**: 更新するタスク情報

```typescript
interface UpdateTaskRequest {
  title?: string;
  notes?: string;
  due?: string;
  status?: 'needsAction' | 'completed';
  completed?: string;
}
```

- **レスポンス**: 更新されたタスク

```typescript
// Task型のオブジェクト
```

#### タスクの削除

```
DELETE /api/tasks/{taskId}
```

- **説明**: タスクを削除
- **パラメータ**:
  - `taskId`: タスクのID
- **レスポンス**: 削除結果

```typescript
interface DeleteTaskResponse {
  success: boolean;
  message?: string;
}
```

### 2. カレンダーイベント関連エンドポイント

#### イベント一覧の取得

```
GET /api/events
```

- **説明**: ユーザーのすべてのカレンダーイベントを取得
- **パラメータ**:
  - `timeMin`, `timeMax` (オプション): 時間範囲によるフィルタリング
  - `calendarId` (オプション): 特定のカレンダーのみ取得
  - `maxResults` (オプション): 返す結果の最大数
  - `pageToken` (オプション): ページネーション用のトークン
  - `timeZone` (オプション): 結果を表示するタイムゾーン（デフォルトはユーザーのタイムゾーン）
- **レスポンス**: イベントのリスト

```typescript
interface EventsResponse {
  items: CalendarEvent[];
  nextPageToken?: string;
  timeZone: string; // レスポンスで使用されているタイムゾーン
}
```

#### 特定のイベントの取得

```
GET /api/events/{eventId}
```

- **説明**: 特定のイベントの詳細を取得
- **パラメータ**:
  - `eventId`: イベントのID
  - `calendarId` (オプション): カレンダーのID
  - `timeZone` (オプション): 結果を表示するタイムゾーン（デフォルトはユーザーのタイムゾーン）
- **レスポンス**: イベントの詳細情報

```typescript
// CalendarEvent型のオブジェクト
```

#### イベントの作成

```
POST /api/events
```

- **説明**: 新しいイベントを作成
- **リクエストボディ**: イベント情報

```typescript
interface CreateEventRequest {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;    // RFC 3339形式
    timeZone: string;    // タイムゾーン（例: "Asia/Tokyo"）
  };
  end: {
    dateTime: string;    // RFC 3339形式
    timeZone: string;    // タイムゾーン（例: "Asia/Tokyo"）
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
```

- **レスポンス**: 作成されたイベント

```typescript
// CalendarEvent型のオブジェクト
```

#### イベントの更新

```
PUT /api/events/{eventId}
```

- **説明**: 既存のイベントを更新
- **パラメータ**:
  - `eventId`: イベントのID
  - `calendarId` (オプション): カレンダーのID
- **リクエストボディ**: 更新するイベント情報

```typescript
interface UpdateEventRequest {
  summary?: string;
  description?: string;
  location?: string;
  start?: {
    dateTime: string;    // RFC 3339形式
    timeZone: string;    // タイムゾーン（例: "Asia/Tokyo"）
  };
  end?: {
    dateTime: string;    // RFC 3339形式
    timeZone: string;    // タイムゾーン（例: "Asia/Tokyo"）
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
```

- **レスポンス**: 更新されたイベント

```typescript
// CalendarEvent型のオブジェクト
```

#### イベントの削除

```
DELETE /api/events/{eventId}
```

- **説明**: イベントを削除
- **パラメータ**:
  - `eventId`: イベントのID
  - `calendarId` (オプション): カレンダーのID
- **レスポンス**: 削除結果

```typescript
interface DeleteEventResponse {
  success: boolean;
  message?: string;
}
```

### 3. タスクとイベントの紐付け関連エンドポイント

#### 紐付け一覧の取得

```
GET /api/links
```

- **説明**: すべてのタスクとイベントの紐付け情報を取得
- **パラメータ**:
  - `taskId` (オプション): 特定のタスクに関連する紐付けのみ取得
  - `eventId` (オプション): 特定のイベントに関連する紐付けのみ取得
  - `maxResults` (オプション): 返す結果の最大数
  - `pageToken` (オプション): ページネーション用のトークン
- **レスポンス**: 紐付け情報のリスト

```typescript
interface LinksResponse {
  items: TaskEventLink[];
  nextPageToken?: string;
}
```

#### 特定の紐付けの取得

```
GET /api/links/{linkId}
```

- **説明**: 特定の紐付けの詳細を取得
- **パラメータ**:
  - `linkId`: 紐付けのID
- **レスポンス**: 紐付けの詳細情報

```typescript
// TaskEventLink型のオブジェクト
```

#### 紐付けの作成

```
POST /api/links
```

- **説明**: 新しいタスクとイベントの紐付けを作成
- **リクエストボディ**:

```typescript
interface CreateLinkRequest {
  taskId: string;
  eventId: string;
  notes?: string;
}
```

- **レスポンス**: 作成された紐付け情報

```typescript
// TaskEventLink型のオブジェクト
```

#### 紐付けの更新

```
PUT /api/links/{linkId}
```

- **説明**: 既存の紐付けを更新
- **パラメータ**:
  - `linkId`: 紐付けのID
- **リクエストボディ**: 更新する紐付け情報

```typescript
interface UpdateLinkRequest {
  notes?: string;
}
```

- **レスポンス**: 更新された紐付け情報

```typescript
// TaskEventLink型のオブジェクト
```

#### 紐付けの削除

```
DELETE /api/links/{linkId}
```

- **説明**: 紐付けを削除
- **パラメータ**:
  - `linkId`: 紐付けのID
- **レスポンス**: 削除結果

```typescript
interface DeleteLinkResponse {
  success: boolean;
  message?: string;
}
```

### 4. 便利な複合エンドポイント

#### タスクに紐付けられたイベントの取得

```
GET /api/tasks/{taskId}/events
```

- **説明**: 特定のタスクに紐付けられたすべてのイベントを取得
- **パラメータ**:
  - `taskId`: タスクのID
  - `maxResults` (オプション): 返す結果の最大数
  - `pageToken` (オプション): ページネーション用のトークン
  - `timeZone` (オプション): 結果を表示するタイムゾーン（デフォルトはユーザーのタイムゾーン）
- **レスポンス**: イベントのリスト

```typescript
interface TaskEventsResponse {
  items: CalendarEvent[];
  nextPageToken?: string;
  timeZone: string; // レスポンスで使用されているタイムゾーン
}
```

#### イベントに紐付けられたタスクの取得

```
GET /api/events/{eventId}/tasks
```

- **説明**: 特定のイベントに紐付けられたすべてのタスクを取得
- **パラメータ**:
  - `eventId`: イベントのID
  - `maxResults` (オプション): 返す結果の最大数
  - `pageToken` (オプション): ページネーション用のトークン
- **レスポンス**: タスクのリスト

```typescript
interface EventTasksResponse {
  items: Task[];
  nextPageToken?: string;
}
```

#### タスクとイベントの紐付け

```
POST /api/tasks/{taskId}/events/{eventId}
```

- **説明**: 特定のタスクと特定のイベントを紐付ける
- **パラメータ**:
  - `taskId`: タスクのID
  - `eventId`: イベントのID
- **リクエストボディ**:

```typescript
interface LinkTaskEventRequest {
  notes?: string;
}
```

- **レスポンス**: 作成された紐付け情報

```typescript
// TaskEventLink型のオブジェクト
```

#### タスクとイベントの紐付け解除

```
DELETE /api/tasks/{taskId}/events/{eventId}
```

- **説明**: 特定のタスクと特定のイベントの紐付けを解除
- **パラメータ**:
  - `taskId`: タスクのID
  - `eventId`: イベントのID
- **レスポンス**: 削除結果

```typescript
interface UnlinkTaskEventResponse {
  success: boolean;
  message?: string;
}
```

### 5. タイムゾーン関連エンドポイント

#### ユーザーのタイムゾーン設定の取得

```
GET /api/settings/timezone
```

- **説明**: 現在のユーザーのタイムゾーン設定を取得
- **レスポンス**: タイムゾーン情報

```typescript
interface TimezoneResponse {
  timezone: string;      // タイムゾーン（例: "Asia/Tokyo"）
  displayName: string;   // 表示名（例: "日本標準時"）
  utcOffset: number;     // UTCからのオフセット（分単位）
}
```

#### ユーザーのタイムゾーン設定の更新

```
PUT /api/settings/timezone
```

- **説明**: ユーザーのタイムゾーン設定を更新
- **リクエストボディ**:

```typescript
interface UpdateTimezoneRequest {
  timezone: string;      // タイムゾーン（例: "Asia/Tokyo"）
}
```

- **レスポンス**: 更新されたタイムゾーン情報

```typescript
// TimezoneResponse型のオブジェクト
```

#### 利用可能なタイムゾーンの一覧取得

```
GET /api/settings/timezones
```

- **説明**: 利用可能なすべてのタイムゾーンの一覧を取得
- **レスポンス**: タイムゾーンのリスト

```typescript
interface TimezonesResponse {
  items: Array<{
    timezone: string;      // タイムゾーン（例: "Asia/Tokyo"）
    displayName: string;   // 表示名（例: "日本標準時"）
    utcOffset: number;     // UTCからのオフセット（分単位）
  }>;
}
```

## 実装上の考慮事項

1. **認証**: OAuth2.0を使用してGoogle APIへのアクセスを認証します。

2. **エラーハンドリング**: すべてのAPIエンドポイントは、適切なHTTPステータスコードとエラーメッセージを返すべきです。

3. **ページネーション**: 大量のデータを扱う場合は、ページネーションを実装して効率的なデータ取得を可能にします。

4. **キャッシング**: パフォーマンス向上のため、頻繁にアクセスされるデータをキャッシュすることを検討します。

5. **同期**: Google TasksとGoogle Calendarの変更をリアルタイムで反映するための同期メカニズムを実装します。

6. **タイムゾーン処理**:
   - すべての日時データはRFC 3339形式（例: "2025-04-04T10:00:00+09:00"）で扱います。
   - イベント作成・更新時には必ずタイムゾーンを明示的に指定します。
   - タイムゾーンが指定されていない場合は、ユーザーの設定したデフォルトタイムゾーンを使用します。
   - 日本のユーザーの場合は、デフォルトで "Asia/Tokyo" を使用します。
   - クライアント側とサーバー側の両方でタイムゾーン変換を適切に処理します。

## まとめ

この設計では、Google Tasks APIとGoogle Calendar APIを活用しながら、タスクとカレンダーイベントを柔軟に紐付けることができるAPIエンドポイントを提供します。多対多の関係を実現することで、一つのタスクを複数の時間に分割して設定したり、複数のタスクを一つの時間帯に割り当てたりすることが可能になります。

タイムゾーンの適切な処理により、国際的なユーザーや異なるタイムゾーンにまたがるチームでも正確な時間管理が可能になります。

ユーザーは既存のGoogle Tasksの機能をそのまま利用しながら、タスクとイベントの紐付けを自由に行うことができます。これにより、より効率的なタスク管理と時間管理が可能になります。