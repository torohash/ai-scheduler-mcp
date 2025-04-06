# ai-scheduler-mcp

Google Tasks と Calendar API を統合するための MCP（Model Context Protocol）サーバーです。MCPクライアント（Roo Codeなど）から Google Tasks と Calendar の機能を利用できます。

## 前提条件

- Docker がインストールされていること。
- `mcp-network` という名前の Docker ネットワークが存在すること。
  ```bash
  # 存在しない場合、以下のコマンドで作成
  docker network create mcp-network
  ```

## セットアップ

1.  **リポジトリの準備:**
    このリポジトリをクローンまたはダウンロードします。

2.  **認証情報 (`credentials.json`) の準備:**

    - Google Cloud Console で OAuth 2.0 クライアント ID (「デスクトップアプリ」または「ウェブ アプリケーション」タイプ) を作成します。その際、Google Tasks API と Google Calendar API を有効にしてください。
    - 作成した認証情報を JSON 形式でダウンロードし、ファイル名を `credentials.json` として、このプロジェクトのルートディレクトリ (`ai-scheduler-mcp/`) に保存します。
    - **重要:** `credentials.json` は機密情報です。**絶対に Git リポジトリにコミットしないでください。** (`.gitignore` に含まれています)

3.  **Docker イメージのビルド:**
    プロジェクトの管理には `scripts/ai-scheduler-mcp.sh` スクリプトを使用します。コマンドを簡略化するために、[便利な使い方 (エイリアス)](#便利な使い方-エイリアス) セクションを参照してエイリアス (`ai_scheduler_mcp` など) を設定することを推奨します。
    以下のコマンドで Docker イメージをビルドします (エイリアス設定後):
    ```bash
    ai_scheduler_mcp build
    ```

## 初回認証 (`token.json` の生成)

サーバーを初めて使用する前に、Google アカウントでの認証を行い、API アクセスに必要な `token.json` を生成する必要があります。

1.  以下のコマンドを実行します:

    ```bash
    ai_scheduler_mcp start-auth
    ```

    (ポートを変更する場合は `-P <ポート番号>` オプションを追加します)

2.  コンソールに認証 URL が表示されるので、Web ブラウザでアクセスし、Google アカウントでログインして要求された権限を承認します。

3.  承認後に表示される認証コードをコピーし、コンソールの指示に従って貼り付け、Enter キーを押します。

4.  認証が成功すると、プロジェクトルートに `token.json` が生成されます。
    - **重要:** `token.json` も機密情報です。**絶対に Git リポジトリにコミットしないでください。** (`.gitignore` に含まれています)

## 通常起動

初回認証が完了し `token.json` が生成された後は、以下のコマンドでサーバーを起動できます。

```bash
# デフォルト設定で起動
ai_scheduler_mcp start

# ポート 8080、再起動ポリシー always で起動
ai_scheduler_mcp start -P 8080 -r always
```

サーバーはバックグラウンドで起動します。

## 基本的な使い方 (エイリアス使用)

```bash
# サーバー (コンテナ) の停止・削除
ai_scheduler_mcp stop

# サーバーのログを表示 (Ctrl+C で終了)
ai_scheduler_mcp logs

# コンテナを停止・削除し、イメージも削除 (確認あり)
ai_scheduler_mcp delete

# ヘルプを表示
ai_scheduler_mcp help
```

## MCPクライアントからの接続 (Roo Code 例)

ホストマシンから接続する場合、Roo Code の MCP 設定 (MCP Servers -> MCP設定を編集) に以下のように追記します (`PORT` はサーバーの起動ポート):

```json
{
  "mcpServers": {
    "ai-scheduler-mcp-server": {
      "url": "http://localhost:${PORT}/sse"
    }
  }
}
```

デフォルトポート (3003) の場合は `http://localhost:3003/sse` となります。

### 開発コンテナからの接続 (ホスト経由)

開発コンテナなど、この MCP サーバーと同じ Docker ネットワーク (`mcp-network`) に参加していないコンテナから接続する必要がある場合は、ホストマシン経由で接続します。

接続先 URL は `http://<host_ip_or_dns_name>:<PORT>/sse` となります。

- **Docker Desktop (Mac/Windows):** 特別な DNS 名 `host.docker.internal` を使用します。
  - 例: `http://host.docker.internal:3003/sse`
- **Linux:** ホストマシンの IP アドレスや Docker ブリッジネットワークのゲートウェイ IP (通常 `172.17.0.1`) を使用します。
  - 例: `http://172.17.0.1:3003/sse`

Roo Code の MCP 設定例 (Docker Desktop):

```json
{
  "mcpServers": {
    "ai-scheduler-mcp-server": {
      "url": "http://172.17.0.1:3003/sse"
    }
  }
}
```

_注意: `<PORT>` は実際にサーバーがホスト上で公開しているポート番号に置き換えてください。Linux の IP アドレスは環境によって異なります。ホストのファイアウォール設定も確認してください。_

## 便利な使い方 (エイリアス)

毎回 `./scripts/ai-scheduler-mcp.sh` と入力する代わりに、シェルの設定ファイル (`~/.bashrc`, `~/.zshrc` など) にエイリアスを定義すると便利です。

```bash
# 例: ai_scheduler_mcp というエイリアスを作成
alias ai_scheduler_mcp="/path/to/your/project/ai-scheduler-mcp/scripts/ai-scheduler-mcp.sh" # <- 実際のパスに変更
```

設定ファイルを再読み込み (`source ~/.bashrc` など) すると、`ai_scheduler_mcp build` のように短いコマンドでスクリプトを実行できます。

## TIPS / その他の情報

- **Docker 直接操作:** `docker build`, `docker run` コマンドを直接使用することも可能です。詳細は `scripts/ai-scheduler-mcp.sh` の内容や Docker のドキュメントを参照してください。
- **コンテナ間接続:** 同じ `mcp-network` に参加している他のコンテナからは `http://ai-scheduler-mcp-server:${PORT}/sse` で接続できます。
- **通信プロトコル:** このサーバーは SSE (Server-Sent Events) を使用します。
- **環境変数:** ポート番号などは環境変数 (`PORT`) でも設定可能です。
