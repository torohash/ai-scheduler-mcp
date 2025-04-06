# ai-scheduler-mcp

Google Tasks と Calendar API を統合するための MCP（Model Context Protocol）サーバーです。このサーバーを使用することで、MCPクライアント（Roo Codeなど）から Google Tasks と Calendar の機能を利用することができます。

## 前提条件

- Dockerがインストールされていること
- docker-composeがインストールされていること（オプション）
- mcp-networkという名前のDockerネットワークが作成されていること（同一ネットワーク内で接続する場合）

mcp-networkが存在しない場合は、以下のコマンドで作成できます：

```bash
docker network create mcp-network
```

## セットアップと起動方法

### Dockerを使用する方法

1. リポジトリをクローンまたはダウンロードします
2. プロジェクトのルートディレクトリで以下のコマンドを実行します：

```bash
# イメージをビルド
docker build -t ai-scheduler-mcp .

# コンテナを起動（デフォルトポート: 3003, ネットワーク: mcp-network）
docker run -d --name ai-scheduler-mcp-server --network mcp-network -p 3003:3003 --restart unless-stopped -e PORT=3003 ai-scheduler-mcp
```

これにより、デフォルトの3003ポートでサーバーが起動します。起動が完了すると、ログで確認できます：

```bash
docker logs ai-scheduler-mcp-server
```

### シェルスクリプトを使用する方法

このプロジェクトには、サーバーのビルド・起動・停止・ログ表示・削除を簡単に行うためのシェルスクリプト (`scripts/ai-scheduler-mcp.sh`) が含まれています。

1. スクリプトに実行権限を付与します：

```bash
chmod +x scripts/ai-scheduler-mcp.sh
```

2. プロジェクトのルートディレクトリから以下のコマンドを使用して操作します：

```bash
# イメージをビルド
./scripts/ai-scheduler-mcp.sh build

# コンテナを起動（デフォルト設定: ポート3003, ネットワーク mcp-network, 再起動ポリシー unless-stopped）
./scripts/ai-scheduler-mcp.sh start

# カスタムポートと再起動ポリシーを指定して起動
./scripts/ai-scheduler-mcp.sh start -P 8080 -r always

# コンテナのログを表示
./scripts/ai-scheduler-mcp.sh logs

# コンテナを停止・削除
./scripts/ai-scheduler-mcp.sh stop

# コンテナを停止・削除し、イメージも削除 (確認あり)
./scripts/ai-scheduler-mcp.sh delete

# ヘルプを表示
./scripts/ai-scheduler-mcp.sh help
```

### カスタムポートの設定

デフォルトポート（3003）以外のポートでサーバーを起動したい場合は、`-P` オプションを使用します：

```bash
# 直接 docker run を使用する場合 (ポート 8080)
docker run -d --name ai-scheduler-mcp-server --network mcp-network -p 8080:8080 -e PORT=8080 --restart unless-stopped ai-scheduler-mcp

# シェルスクリプトを使用する場合 (ポート 8080)
./scripts/ai-scheduler-mcp.sh start -P 8080
```

## 使用方法

### 同じmcp-networkに参加しているコンテナからの接続

同じmcp-networkに参加している他のコンテナからは、以下のURLでサーバーに接続できます（`PORT` はサーバーの起動ポート）：

```
http://ai-scheduler-mcp-server:${PORT}/sse
```

デフォルトポートを使用している場合：

```
http://ai-scheduler-mcp-server:3003/sse
```

### ホスト側からの接続

ホストマシンからは、以下のURLでサーバーに接続できます（`PORT` はサーバーの起動ポート）：

```
http://localhost:${PORT}/sse
```

デフォルトポートを使用している場合：

```
http://localhost:3003/sse
```

### Roo Codeからの接続

MCP Servers -> MCP設定を編集 -> 以下を記入します（`PORT` はサーバーの起動ポート）：

```json
{
  "mcpServers": {
    "ai-scheduler-mcp-server": {
      "url": "http://localhost:${PORT}/sse"
    }
  }
}
```

デフォルトポートを使用している場合：

```json
{
  "mcpServers": {
    "ai-scheduler-mcp-server": {
      "url": "http://localhost:3003/sse"
    }
  }
}
```

#### コンテナ環境でのRoo Codeからの接続

同じDocker Network内で実行されているRoo Codeコンテナからは、以下のようにMCP設定を行います：

```json
{
  "mcpServers": {
    "ai-scheduler-mcp-server": {
      "url": "http://ai-scheduler-mcp-server:3003/sse"
    }
  }
}
```

**docker-compose.yml設定例**：

```yaml
services:
  # Roo Code コンテナ
  roo-code:
    # 略

  # ai-scheduler-mcp コンテナ
  ai-scheduler-mcp:
    build: .
    container_name: ai-scheduler-mcp-server
    restart: unless-stopped
    ports:
      - "3003:3003" # ホスト側のポートも合わせる場合は 3003:3003
    environment:
      - PORT=3003
    networks:
      - mcp-network

networks:
  mcp-network:
    external: true
```

この設定により、Roo Codeコンテナからai-scheduler-mcpコンテナに接続し、Google Tasks と Calendar の機能を利用できます。コンテナ名（`ai-scheduler-mcp-server`）をホスト名として使用することで、Docker Network内での名前解決が可能になります。

#### 開発コンテナ環境でのRoo Codeからの接続（ホスト経由）

開発コンテナ内でRoo Codeを実行し、`mcp-network` に参加せずにホストマシン経由でこのMCPサーバーに接続する場合、以下のようにMCP設定を行います。

**Docker Desktop (Mac/Windows) の場合:**

```json
{
  "mcpServers": {
    "ai-scheduler-mcp-server": {
      "url": "http://host.docker.internal:3003/sse"
    }
  }
}
```

**Linux の場合 (例: ブリッジゲートウェイIPを使用):**

```json
{
  "mcpServers": {
    "ai-scheduler-mcp-server": {
      "url": "http://172.17.0.1:3003/sse"
    }
  }
}
```

**注意:**

- `3003` は、MCPサーバーがホスト上で公開しているポート番号（デフォルト: 3003）に置き換えてください。
- Linuxの場合は、`172.17.0.1` の部分を実際のホストIPアドレスまたはDockerブリッジネットワークのゲートウェイIPアドレスに置き換えてください。

### 開発コンテナからの接続（ホスト経由）

`mcp-network` に参加していない開発コンテナからこのMCPサーバーにアクセスする必要がある場合（例：既存プロジェクトとの兼ね合いでネットワーク変更が難しい場合）、ホストマシン経由で接続できます。

この方法では、開発コンテナから見て「ホストマシン」にあたるIPアドレスまたは特別なDNS名と、MCPサーバーがホスト上で公開しているポート（デフォルトは3003）を指定します。

**接続先URL:**

```
http://<host_ip_or_dns_name>:3003/sse
```

**`<host_ip_or_dns_name>` の特定方法:**

- **Docker Desktop (Mac/Windows):** 特別なDNS名 `host.docker.internal` を使用できます。

  - 例: `http://host.docker.internal:3003/sse`

- **Linux:**
  - **ホストのIPアドレス:** ホストマシンのネットワークインターフェースに割り当てられているIPアドレスを使用します（例：`ifconfig` や `ip addr` コマンドで確認）。
    - 例: `http://192.168.1.10:3003/sse`（IPアドレスは環境によって異なります）
  - **Dockerブリッジネットワークのゲートウェイ:** Dockerのデフォルトブリッジネットワーク (`bridge`) のゲートウェイIPアドレス（通常 `172.17.0.1`）を使用できます。`docker network inspect bridge` コマンドで確認できます。
    - 例: `http://172.17.0.1:3003/sse`

**注意点:**

- ホストのファイアウォール設定によっては、開発コンテナからホストのポートへのアクセスが許可されていない場合があります。
- 使用するポート番号は、`docker ps` コマンドや起動時の設定で確認してください。

## 便利な使用方法 (コマンドの簡略化)

毎回 `./scripts/ai-scheduler-mcp.sh` と入力するのは面倒な場合があります。以下のいずれかの方法で、より短いコマンドでスクリプトを実行できます。

### 方法1: PATHを通す

`scripts` ディレクトリを環境変数 `PATH` に追加します。シェルの設定ファイル (`~/.bashrc`, `~/.zshrc` など) に以下を追加します。

```bash
export PATH="/path/to/your/project/ai-scheduler-mcp/scripts:$PATH" # <- 実際のパスに変更
```

設定ファイルを再読み込み (`source ~/.bashrc` など) すると、どこからでも以下のように実行できます。

```bash
ai-scheduler-mcp.sh build
ai-scheduler-mcp.sh start
# ...など
```

### 方法2: エイリアスを作成する

シェルの設定ファイル (`~/.bashrc`, `~/.zshrc` など) にエイリアスを定義します。

```bash
alias ai_scheduler_mcp="/path/to/your/project/ai-scheduler-mcp/scripts/ai-scheduler-mcp.sh" # <- 実際のパスに変更
```

設定ファイルを再読み込み (`source ~/.bashrc` など) すると、どこからでも以下のように実行できます。

```bash
ai_scheduler_mcp build
ai_scheduler_mcp start
ai_scheduler_mcp start -P 8080 -r always
# ...など
```

これにより、プロジェクトディレクトリ外からでも簡単にコンテナを管理できます。

## 注意事項

- このサーバーはSSE（Server-Sent Events）を使用してMCPクライアントと通信します
- Google APIを使用するには、適切な認証情報（クライアントIDやシークレットなど）が必要です
- 環境変数は `.env` ファイルまたはコンテナ起動時に指定することができます
