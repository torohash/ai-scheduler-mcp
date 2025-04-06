# AI-Scheduler MCP サーバー 改善提案

## 1. 現状の問題点と背景

### 1.1 データ取得の粒度と関連性

**問題点**:

- イベント一覧取得時に数年分のすべてのイベントが取得され、ノイズが多い
- タスク取得が ID 指定に限定されており、柔軟性に欠ける
- 関連データの取得が複数の API コールを必要とする

**背景**:
現在の API は基本的な CRUD 操作を提供していますが、実際のユーザーの思考プロセスやワークフローに合わせた設計になっていません。ユーザーは通常、「今日何をすべきか」「このプロジェクトに関連する作業は何か」といった文脈で考えます。

### 1.2 バルク操作の欠如

**問題点**:

- 複数のイベントやタスクに対する一括操作ができない
- スケジュール変更時に関連するすべてのアイテムを個別に更新する必要がある

**背景**:
実際の業務では、「会議が延期になったので関連するすべての予定を 1 時間後ろにずらす」「プロジェクトの締め切りが変更になったので関連するすべてのタスクの期限を調整する」といった一括操作のニーズが頻繁に発生します。

### 1.3 コンテキスト管理の不足

**問題点**:

- タスクやイベントをプロジェクト、カテゴリ、タグなどでグループ化する機能がない
- 関連するタスクとイベントを一元的に把握する手段が限られている

**背景**:
効率的な時間管理とタスク管理には、関連するアイテムをコンテキスト（プロジェクト、目標、役割など）でグループ化し、必要な情報に素早くアクセスできることが重要です。

## 2. 改善提案

### 2.1 コンテキスト指向のデータ取得

#### 2.1.1 時間範囲ベースのフィルタリング強化

```typescript
// 改善案: 時間範囲プリセットの追加
interface TimeRangePreset {
  preset: "today" | "tomorrow" | "this_week" | "next_week" | "this_month";
}

// 使用例
server.tool(
  "listEventsInTimeRange",
  {
    timeRange: z.union([
      z.object({
        preset: z.enum([
          "today",
          "tomorrow",
          "this_week",
          "next_week",
          "this_month",
        ]),
      }),
      z.object({
        start: z.string(),
        end: z.string(),
      }),
    ]),
    calendarId: z.string().optional().default("primary"),
    includeLinkedTasks: z.boolean().optional().default(false),
  },
  async ({ timeRange, calendarId, includeLinkedTasks }) => {
    // 実装...
  },
);
```

#### 2.1.2 タグ・カテゴリシステムの導入

```typescript
// 改善案: タグ・カテゴリによるフィルタリング
interface TaskExtended extends Task {
  tags?: string[];
  category?: string;
}

// 使用例
server.tool(
  "listTasksByTag",
  {
    tags: z.array(z.string()),
    matchAll: z.boolean().optional().default(false),
    includeCompleted: z.boolean().optional().default(false),
    includeLinkedEvents: z.boolean().optional().default(false),
  },
  async ({ tags, matchAll, includeCompleted, includeLinkedEvents }) => {
    // 実装...
  },
);
```

#### 2.1.3 スマートクエリ機能

```typescript
// 改善案: 自然言語に近いクエリ構文
server.tool(
  "smartQuery",
  {
    query: z.string(), // 例: "今週の会議", "プロジェクトXに関連するタスク"
    includeEvents: z.boolean().optional().default(true),
    includeTasks: z.boolean().optional().default(true),
  },
  async ({ query, includeEvents, includeTasks }) => {
    // 実装...
  },
);
```

### 2.2 バルク操作の実装

#### 2.2.1 複数アイテムの一括更新

```typescript
// 改善案: 複数イベントの一括更新
server.tool(
  "bulkUpdateEvents",
  {
    eventIds: z.array(z.string()),
    updates: z.object({
      timeShift: z.number().optional(), // 分単位での時間シフト
      summary: z.string().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
      colorId: z.string().optional(),
    }),
    calendarId: z.string().optional().default("primary"),
  },
  async ({ eventIds, updates, calendarId }) => {
    // 実装...
  },
);
```

#### 2.2.2 関連アイテムの連動更新

```typescript
// 改善案: イベント更新時に関連タスクも連動して更新
server.tool(
  "updateEventWithLinkedTasks",
  {
    eventId: z.string(),
    updates: z.object({
      // イベント更新情報
      summary: z.string().optional(),
      start: z
        .object({
          /*...*/
        })
        .optional(),
      end: z
        .object({
          /*...*/
        })
        .optional(),
      // その他のフィールド
    }),
    taskUpdates: z
      .object({
        // タスク更新情報
        updateDueDate: z.boolean().optional().default(false),
        updateTitle: z.boolean().optional().default(false),
      })
      .optional(),
  },
  async ({ eventId, updates, taskUpdates }) => {
    // 実装...
  },
);
```

### 2.3 インテリジェントな提案と自動化

#### 2.3.1 空き時間検出と最適化提案

```typescript
// 改善案: 空き時間検出とタスク実行提案
server.tool(
  "suggestTaskSchedule",
  {
    taskId: z.string(),
    preferredTimeRange: z
      .object({
        start: z.string().optional(), // 開始日時
        end: z.string().optional(), // 終了日時
        minDuration: z.number().optional(), // 分単位での最小所要時間
        maxDuration: z.number().optional(), // 分単位での最大所要時間
      })
      .optional(),
    maxSuggestions: z.number().optional().default(3),
  },
  async ({ taskId, preferredTimeRange, maxSuggestions }) => {
    // 実装...
  },
);
```

#### 2.3.2 バッチ処理とスケジュール最適化

```typescript
// 改善案: 複数タスクの最適スケジューリング
server.tool(
  "optimizeSchedule",
  {
    taskIds: z.array(z.string()),
    timeConstraints: z.object({
      startDate: z.string(),
      endDate: z.string(),
      workingHours: z
        .array(
          z.object({
            dayOfWeek: z.number(), // 0-6 (日曜-土曜)
            startTime: z.string(), // "HH:MM" 形式
            endTime: z.string(), // "HH:MM" 形式
          }),
        )
        .optional(),
    }),
    priorities: z
      .object({
        respectDueDates: z.boolean().optional().default(true),
        minimizeContextSwitching: z.boolean().optional().default(true),
        balanceWorkload: z.boolean().optional().default(true),
      })
      .optional(),
  },
  async ({ taskIds, timeConstraints, priorities }) => {
    // 実装...
  },
);
```

## 3. データモデルの拡張

### 3.1 タスクモデルの拡張

```typescript
interface EnhancedTask extends Task {
  // 既存のGoogle Tasks APIフィールド
  id: string;
  title: string;
  notes?: string;
  status: "needsAction" | "completed";
  due?: string;
  completed?: string;

  // 拡張フィールド
  tags?: string[]; // タグ付け
  category?: string; // カテゴリ分類
  priority?: "low" | "medium" | "high" | "urgent"; // 優先度
  estimatedDuration?: number; // 見積所要時間（分）
  recurrence?: string; // 繰り返しルール
  dependencies?: string[]; // 依存タスクのID
}
```

### 3.2 イベントモデルの拡張

```typescript
interface EnhancedCalendarEvent extends CalendarEvent {
  // 既存のGoogle Calendar APIフィールド
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };

  // 拡張フィールド
  tags?: string[]; // タグ付け
  category?: string; // カテゴリ分類
  priority?: "low" | "medium" | "high" | "urgent"; // 優先度
  isFlexible?: boolean; // 時間調整可能かどうか
  bufferBefore?: number; // 前の予定との間隔（分）
  bufferAfter?: number; // 次の予定との間隔（分）
}
```

### 3.3 リンクモデルの拡張

```typescript
interface EnhancedTaskEventLink extends TaskEventLink {
  // 既存のフィールド
  id: string;
  taskId: string;
  eventId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;

  // 拡張フィールド
  linkType?: "preparation" | "execution" | "followup"; // リンクの種類
  autoSync?: boolean; // 自動同期するかどうか
  syncFields?: Array<"title" | "description" | "time" | "status">; // 同期するフィールド
}
```

## 4. 実装上の考慮事項

### 4.1 パフォーマンスとスケーラビリティ

- **キャッシング戦略**: 頻繁にアクセスされるデータ（今日/今週のイベントなど）をキャッシュ
- **ページネーションの最適化**: 大量のデータを効率的に取得するための改善
- **バックグラウンド処理**: バルク操作や最適化処理を非同期で実行

### 4.2 拡張性と互換性

- **プラグイン機構**: 新しい機能やインテグレーションを容易に追加できる設計
- **バージョニング**: API の変更を管理し、後方互換性を維持
- **マイグレーション戦略**: データモデルの拡張に伴うデータ移行計画

### 4.3 ユーザーエクスペリエンス

- **エラーハンドリングの改善**: より詳細で有用なエラーメッセージ
- **レスポンスタイムの最適化**: 重要な操作の応答時間を短縮
- **段階的な機能導入**: 複雑な機能を段階的に導入し、ユーザーが適応できるようにする

## 5. ロードマップ提案

### フェーズ 1: 基本機能の強化（短期）

1. 時間範囲ベースのフィルタリング強化
2. 基本的なバルク操作の実装
3. パフォーマンス最適化

### フェーズ 2: 高度な機能の導入（中期）

1. タグ・カテゴリシステムの実装
2. スマートクエリ機能の開発
3. 関連アイテムの連動更新機能

### フェーズ 3: インテリジェンス機能の追加（長期）

1. 空き時間検出と最適化提案
2. バッチ処理とスケジュール最適化
3. 機械学習を活用した予測と提案

## 6. まとめ

この改善提案は、ユーザーの実際のワークフローに合わせた API を提供し、より効率的なタスク管理とスケジュール管理を実現することを目指しています。特に、コンテキスト指向のデータ取得、バルク操作、インテリジェントな提案機能は、ユーザーの生産性向上に大きく貢献するでしょう。

実装にあたっては、段階的なアプローチを取り、ユーザーフィードバックを積極的に取り入れながら機能を拡充していくことが重要です。また、Google API の制限や仕様変更にも柔軟に対応できる設計を心がける必要があります。
