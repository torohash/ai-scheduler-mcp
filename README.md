# AI Scheduler MCP サーバー

Google Tasks API と Google Calendar API を統合したタスク管理システムの MCP サーバーです。このサーバーは、SSE（Server-Sent Events）を利用して LLM アプリケーションとの通信を行います。

## プロジェクト構造

```
ai-scheduler-mcp/
├── src/
│   ├── index.ts           # メインエントリーポイント
│   ├── auth.ts            # 認証関連の処理
│   ├── tools/             # ツール定義
│   │   ├── tasks.ts       # タスク関連のツール定義
│   │   ├── events.ts      # イベント関連のツール定義
│   │   └── links.ts       # 紐付け関連のツール定義
│   └── models/            # モデル定義
│       ├── task.ts        # タスクモデル
│       ├── event.ts       # イベントモデル
│       └── link.ts        # 紐付けモデル
├── package.json           # パッケージ設定
├── tsconfig.json          # TypeScript設定
├── .gitignore             # Git除外設定
├── credentials.json       # Google API認証情報（gitignore対象）
└── token.json             # 認証トークン（gitignore対象）
```

## セットアップ手順

### 1. 必要なパッケージのインストール

```bash
# プロジェクトディレクトリに移動
cd ai-scheduler-mcp

# 必要なパッケージをインストール
npm install express @modelcontextprotocol/sdk googleapis google-auth-library zod

# 開発用パッケージをインストール
npm install --save-dev typescript ts-node ts-node-dev @types/node @types/express
```

### 2. Google API 認証情報の設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセスし、プロジェクトを作成します。
2. Google Tasks API と Google Calendar API を有効化します。
3. OAuth 2.0 クライアント ID を作成し、認証情報をダウンロードします。
4. ダウンロードした JSON ファイルを`credentials.json`という名前でプロジェクトのルートディレクトリに配置します。

### 3. 環境変数の設定

このプロジェクトでは、環境変数を使用して設定を行うことができます。開発環境では`.env`ファイルを使用し、本番環境では Docker の環境変数機能を利用します。

1. プロジェクトルートディレクトリにある`.env.example`ファイルを`.env`にコピーします：

```bash
cp .env.example .env
```

2. 必要に応じて`.env`ファイルの内容を編集します：

```
# サーバー設定
PORT=3003

# Google API認証設定
TOKEN_PATH=./token.json
CREDENTIALS_PATH=./credentials.json
```

3. Docker 環境での実行時は、以下のように環境変数を設定します：

```bash
docker run -e PORT=3003 -e TOKEN_PATH=/app/data/token.json -e CREDENTIALS_PATH=/app/data/credentials.json your-image-name
```

または、docker-compose.yml ファイルを使用する場合：

```yaml
services:
  app:
    image: your-image-name
    environment:
      - PORT=3003
      - TOKEN_PATH=/app/data/token.json
      - CREDENTIALS_PATH=/app/data/credentials.json
    volumes:
      - ./data:/app/data
```

### 4. サーバーの起動

```bash
# 開発モードで起動
npm run dev

# または、ビルドして起動
npm run build
npm start
```

初回起動時には、コンソールに表示される URL にアクセスして Google 認証を行い、表示された認証コードをコンソールに入力する必要があります。

## 使用方法

### MCP クライアントの設定

Claude Desktop などのクライアントで以下のように設定します：

```json
{
  "mcpServers": {
    "ai-scheduler": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/ai-scheduler-mcp"
    }
  }
}
```

### 利用可能なツール

#### タスク関連

- `listTasks`: タスク一覧を取得
- `getTask`: 特定のタスクを取得
- `createTask`: 新しいタスクを作成
- `updateTask`: タスクを更新
- `deleteTask`: タスクを削除

#### イベント関連

- `listEvents`: イベント一覧を取得
- `getEvent`: 特定のイベントを取得
- `createEvent`: 新しいイベントを作成
- `updateEvent`: イベントを更新
- `deleteEvent`: イベントを削除

#### 紐付け関連

- `listTaskEventLinks`: 紐付け一覧を取得
- `getTaskEventLink`: 特定の紐付けを取得
- `createTaskEventLink`: 新しい紐付けを作成
- `updateTaskEventLink`: 紐付けを更新
- `deleteTaskEventLink`: 紐付けを削除
- `getTaskEvents`: タスクに紐付けられたイベントを取得
- `getEventTasks`: イベントに紐付けられたタスクを取得

## 注意事項

- 認証情報（credentials.json, token.json）は絶対に Git リポジトリにコミットしないでください。
- 実際の運用では、紐付け情報の永続化のためにデータベースを使用することを推奨します。
