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

## 認証

このMCPサーバーはGoogle TasksとCalendar APIを利用するため、Google Cloud Platformでの認証設定と、初回起動時の認証プロセスが必要です。

### 1. Google Cloud Platformでの認証情報設定

1.  **Google Cloud Console** にアクセスし、プロジェクトを作成または選択します。
2.  **APIとサービス > 有効なAPIとサービス** で、以下のAPIが有効になっていることを確認します（有効でない場合は有効化します）：
    - Google Tasks API
    - Google Calendar API
3.  **APIとサービス > 認証情報** に移動します。
4.  **認証情報を作成 > OAuthクライアントID** を選択します。
5.  アプリケーションの種類として「**デスクトップアプリ**」または「**ウェブ アプリケーション**」を選択します。
    - **デスクトップアプリ**: 名前を入力して作成します。
    - **ウェブ アプリケーション**:
      - 名前を入力します。
      - 「承認済みのリダイレクト URI」に `http://localhost` と `http://localhost:3000` (またはサーバーを実行するポート) を追加します。
      - 作成をクリックします。
6.  作成されたOAuthクライアントIDの認証情報（JSON形式）をダウンロードし、ファイル名を `credentials.json` として、このプロジェクトのルートディレクトリ (`ai-scheduler-mcp/`) に保存します。

**重要:** `credentials.json` ファイルには機密情報が含まれています。**絶対にGitリポジトリにコミットしないでください。** このファイルは `.gitignore` に含まれているため、通常はGitの追跡対象外となります。

### 2. 初回認証 (token.json の生成)

`credentials.json` を配置した後、MCPサーバーを初めて起動する際に、Googleアカウントでの認証プロセスを実行する必要があります。これにより、APIアクセスに必要なトークン情報が `token.json` ファイルに保存されます。

1.  **インタラクティブモードでコンテナを起動:**
    通常の起動コマンド (`docker run -d ...` や `./scripts/ai-scheduler-mcp.sh start`) はバックグラウンドで実行されるため、コンソールでの認証コード入力ができません。初回認証時は、以下のコマンドを使用してコンテナを**インタラクティブモード**で起動します。

    ```bash
    # プロジェクトルートディレクトリ (ai-scheduler-mcp/) で実行
    # 事前に docker build -t ai-scheduler-mcp . でイメージをビルドしておく必要があります
    docker run -it --rm --name ai-scheduler-mcp-auth \
      --network mcp-network \
      -p 3003:3003 \
      -v "$(pwd)/token.json:/app/token.json" \
      -v "$(pwd)/credentials.json:/app/credentials.json:ro" \
      -e PORT=3003 \
      ai-scheduler-mcp
    ```

    - `-it`: コンテナと対話するためのフラグです。
    - `--rm`: 認証完了後にコンテナを自動的に削除します。
    - `-v "$(pwd)/token.json:/app/token.json"`: ホストの `token.json` をコンテナの `/app/token.json` にマウントします。認証成功時にここにトークンが書き込まれます。（初回は存在しなくてもOK）
    - `-v "$(pwd)/credentials.json:/app/credentials.json:ro"`: ホストの `credentials.json` をコンテナに読み取り専用でマウントします。
    - `-e PORT=3003`: ポート番号を指定します（必要に応じて変更）。
    - `ai-scheduler-mcp`: ビルド済みのイメージ名です。

2.  **認証URLへのアクセス:**
    コンテナが起動すると、コンソールに以下のようなメッセージと認証URLが表示されます。

    ```
    Authorize this app by visiting this url: https://accounts.google.com/o/oauth2/v2/auth?....
    ```

    表示されたURLをコピーし、Webブラウザで開きます。

3.  **Googleアカウントでの承認:**
    ブラウザでGoogleアカウントへのログインと、要求された権限（TasksとCalendarへのアクセス）の承認を行います。

4.  **認証コードの取得と入力:**
    承認後、ブラウザに認証コードが表示されるか、リダイレクト先のURLに含まれます (`?code=認証コード&...` の形式)。この認証コードをコピーします。
    コンテナを実行しているターミナルに戻り、以下のように認証コードの入力を求められるので、コピーしたコードを貼り付けてEnterキーを押します。

    ```
    Enter the authorization code from that page here: ここに認証コードを貼り付け
    ```

5.  **`token.json` の生成:**
    認証が成功すると、コンテナの `/app/token.json` にトークン情報が書き込まれます。ホスト側にマウントしているため、プロジェクトルートディレクトリ (`ai-scheduler-mcp/`) に `token.json` ファイルが生成または更新されます。コンテナは自動的に終了・削除されます (`--rm` オプションのため)。

**重要:** 生成された `token.json` ファイルにも機密情報が含まれています。**絶対にGitリポジトリにコミットしないでください。** このファイルも `.gitignore` に含まれています。

### 3. 通常の起動

初回認証が完了し `token.json` が生成された後は、通常の起動コマンドを使用してサーバーを実行できます。

```bash
# シェルスクリプトを使用する場合 (スクリプト内で認証ファイルのマウントが必要になる場合があります)
# ./scripts/ai-scheduler-mcp.sh start

# docker run を直接使用する場合 (認証ファイルをマウント)
docker run -d --name ai-scheduler-mcp-server --network mcp-network -p 3003:3003 \
  -v "$(pwd)/token.json:/app/token.json:ro" \
  -v "$(pwd)/credentials.json:/app/credentials.json:ro" \
  --restart unless-stopped -e PORT=3003 ai-scheduler-mcp
```

_注意: 通常起動時も `-v` で `token.json` と `credentials.json` をコンテナにマウントする必要があります。読み取り専用 (`:ro`) でマウントすることを推奨します。シェルスクリプトを使用する場合、スクリプト自体がこれらのボリュームマウントをサポートするように変更が必要になる可能性があります。_

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
