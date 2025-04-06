import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { config } from "dotenv";
import { initializeAuth } from "./auth/index.js";
import { registerAllTools } from "./tools/index.js"; // registerAllToolsをインポート

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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("SSE接続確立エラー:", message);
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    // レスポンスがまだ送信されていない場合のみエラーレスポンスを送信
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: { message: "Failed to establish SSE connection" },
      });
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("メッセージ処理エラー:", message);
      if (error instanceof Error && error.stack) {
        console.error("Stack trace:", error.stack);
      }
      // レスポンスがまだ送信されていない場合のみエラーレスポンスを送信
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: { message: "Error processing message" },
        });
      }
    }
  } else {
    res.status(400).json({
      success: false,
      error: { message: "No transport found for sessionId" },
    });
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
        registerAllTools(server, authClient); // registerAllToolsを呼び出す
        console.log("ツール登録完了");

        // サーバー起動
        app.listen(port, () => {
          console.log(`MCP server running at http://localhost:${port}`);
          console.log("Use this URL in your MCP client configuration");
        });
      } catch (toolError: unknown) {
        const message =
          toolError instanceof Error ? toolError.message : String(toolError);
        console.error("ツール登録中にエラーが発生しました:", message);
        if (toolError instanceof Error && toolError.stack) {
          console.error("Stack trace:", toolError.stack);
        }
        // ツール登録エラーは致命的ではないと判断し、サーバー起動は試みる
        // ただし、エラーが発生したことをログに残す
        console.warn("一部のツールが利用できない可能性があります。");
        // サーバー起動処理はこの try...catch ブロックの外に移動する方が良いかもしれないが、
        // 今回は authClient が有効な場合のみ起動するロジックを維持
        app.listen(port, () => {
          console.log(
            `MCP server running with potential tool registration issues at http://localhost:${port}`,
          );
          console.log("Use this URL in your MCP client configuration");
        });
      }
    } else {
      console.error("認証クライアントの初期化に失敗しました");
      process.exit(1);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("サーバー初期化中に致命的なエラーが発生しました:", message);
    if (error instanceof Error && error.stack) {
      console.error("Stack trace:", error.stack);
    }
    process.exit(1); // 初期化の主要部分でのエラーは致命的と判断
  }
}

// サーバー初期化と起動
initializeServer().catch((error: unknown) => {
  // initializeServer内でキャッチされなかった予期せぬエラー
  const message = error instanceof Error ? error.message : String(error);
  console.error("サーバー起動プロセスで予期せぬエラー:", message);
  if (error instanceof Error && error.stack) {
    console.error("Stack trace:", error.stack);
  }
  process.exit(1); // 起動シーケンスでの未捕捉エラーも致命的
});
