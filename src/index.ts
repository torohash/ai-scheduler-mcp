import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { initializeAuth } from "./auth.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerEventTools } from "./tools/events.js";
import { registerLinkTools } from "./tools/links.js";

// MCPサーバー初期化
const server = new McpServer({
  name: "Google Tasks & Calendar Manager",
  version: "1.0.0",
});

// Expressアプリケーション
const app = express();
const port = 3003;

// セッション管理用オブジェクト
const transports: { [sessionId: string]: SSEServerTransport } = {};

// SSEエンドポイント
app.get("/sse", async (_: Request, res: Response) => {
  const transport = new SSEServerTransport("/messages", res);
  transports[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports[transport.sessionId];
  });

  await server.connect(transport);
});

// メッセージ受信エンドポイント
app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];

  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

// 認証とツール登録
async function initializeServer() {
  try {
    // 認証クライアント初期化
    const authClient = await initializeAuth();

    if (authClient) {
      // ツール登録
      registerTaskTools(server, authClient);
      registerEventTools(server, authClient);
      registerLinkTools(server, authClient);

      // サーバー起動
      app.listen(port, () => {
        console.log(`MCP server running at http://localhost:${port}`);
        console.log("Use this URL in your MCP client configuration");
      });
    } else {
      console.error("Failed to initialize authentication");
    }
  } catch (error) {
    console.error("Error initializing server:", error);
  }
}

// サーバー初期化と起動
initializeServer().catch(console.error);
