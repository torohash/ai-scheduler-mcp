import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { config } from "dotenv";
import { initializeAuth } from "./auth/index.js";
import { registerTaskTools } from "./tools/tasks/index.js";
import { registerEventTools } from "./tools/events/index.js";
import { registerLinkTools } from "./tools/links/index.js";

// 環境変数の読み込み
config();

// MCPサーバー初期化
const server = new McpServer({
  name: "Google Tasks & Calendar Manager",
  version: "1.0.0",
});

// Expressアプリケーション
const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3003;

// セッション管理用オブジェクト
const transports: { [sessionId: string]: SSEServerTransport } = {};

// SSEエンドポイント
app.get("/sse", async (req: Request, res: Response) => {
  try {
    const transport = new SSEServerTransport("/messages", res);
    transports[transport.sessionId] = transport;

    console.log(`SSE接続確立: sessionId=${transport.sessionId}`);

    res.on("close", () => {
      console.log(`SSE接続終了: sessionId=${transport.sessionId}`);
      delete transports[transport.sessionId];
    });

    await server.connect(transport);
  } catch (error) {
    console.error("SSE接続確立エラー:", error);
    // レスポンスがまだ送信されていない場合のみエラーレスポンスを送信
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to establish SSE connection" });
    }
  }
});

// メッセージ受信エンドポイント
app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];

  if (transport) {
    try {
      await transport.handlePostMessage(req, res);
    } catch (error) {
      console.error("Error handling post message:", error);
      // レスポンスがまだ送信されていない場合のみエラーレスポンスを送信
      if (!res.headersSent) {
        res.status(500).json({ error: "Error processing message" });
      }
    }
  } else {
    res.status(400).json({ error: "No transport found for sessionId" });
  }
});

// 認証とツール登録
async function initializeServer() {
  try {
    console.log("環境変数:", {
      PORT: process.env.PORT,
      TOKEN_PATH: process.env.TOKEN_PATH,
      CREDENTIALS_PATH: process.env.CREDENTIALS_PATH,
    });

    // 認証クライアント初期化
    console.log("認証クライアント初期化開始...");
    const authClient = await initializeAuth();
    console.log("認証クライアント初期化完了:", !!authClient);

    if (authClient) {
      try {
        // ツール登録
        console.log("ツール登録開始...");
        registerTaskTools(server, authClient);
        registerEventTools(server, authClient);
        registerLinkTools(server, authClient);
        console.log("ツール登録完了");

        // サーバー起動
        app.listen(port, () => {
          console.log(`MCP server running at http://localhost:${port}`);
          console.log("Use this URL in your MCP client configuration");
        });
      } catch (toolError) {
        console.error("ツール登録エラー:", toolError);
      }
    } else {
      console.error("認証クライアントの初期化に失敗しました");
      process.exit(1);
    }
  } catch (error) {
    console.error("サーバー初期化エラー:", error);
    process.exit(1);
  }
}

// サーバー初期化と起動
initializeServer().catch(console.error);
