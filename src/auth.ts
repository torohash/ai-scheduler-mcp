import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// OAuth2クライアント設定
const SCOPES = [
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/calendar",
];
// 環境変数からパスを取得、未設定の場合はデフォルト値を使用
const TOKEN_PATH =
  process.env.TOKEN_PATH || path.join(process.cwd(), "token.json");
const CREDENTIALS_PATH =
  process.env.CREDENTIALS_PATH || path.join(process.cwd(), "credentials.json");

/**
 * 認証クライアントを初期化する
 * @returns OAuth2Client | null
 */
export async function initializeAuth(): Promise<OAuth2Client | null> {
  try {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
      return client;
    }
    client = await authenticate();
    if (client.credentials) {
      await saveCredentials(client);
    }
    return client;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

/**
 * 保存された認証情報を読み込む
 * @returns OAuth2Client | null
 */
async function loadSavedCredentialsIfExist(): Promise<OAuth2Client | null> {
  try {
    if (!fs.existsSync(TOKEN_PATH)) {
      return null;
    }
    const content = fs.readFileSync(TOKEN_PATH, "utf8");
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials) as OAuth2Client;
  } catch (err) {
    console.error("Error loading saved credentials:", err);
    // token.jsonが存在するが不完全な場合は削除を提案
    if (fs.existsSync(TOKEN_PATH)) {
      console.log(
        "token.jsonファイルが不完全です。削除して再認証してください。"
      );
      console.log(`削除コマンド: rm ${TOKEN_PATH}`);
    }
    return null;
  }
}

/**
 * 認証情報を保存する
 * @param client OAuth2Client
 */
async function saveCredentials(client: OAuth2Client): Promise<void> {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error("credentials.json file not found");
    }

    const content = fs.readFileSync(CREDENTIALS_PATH, "utf8");
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: "authorized_user",
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    fs.writeFileSync(TOKEN_PATH, payload);
  } catch (error) {
    console.error("Error saving credentials:", error);
    throw error;
  }
}

/**
 * 認証を行う
 * @returns OAuth2Client
 */
async function authenticate(): Promise<OAuth2Client> {
  try {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error(
        "credentials.json file not found. Please download it from Google Cloud Console."
      );
    }

    const content = fs.readFileSync(CREDENTIALS_PATH, "utf8");
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const oAuth2Client = new google.auth.OAuth2(
      key.client_id,
      key.client_secret,
      key.redirect_uris[0]
    );

    // 認証URLを生成
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent", // 常に同意画面を表示し、refresh_tokenを確実に取得
      scope: SCOPES,
    });
    console.log("Authorize this app by visiting this url:", authUrl);
    console.log("After authorization, you will be redirected to a page.");
    console.log(
      "Copy the authorization code from the URL (after '?code=' and before '&' if present)"
    );

    // ユーザーに認証コードを入力してもらう
    const code = await getAuthorizationCode();
    const { tokens } = await oAuth2Client.getToken({
      code: code,
      redirect_uri: key.redirect_uris[0], // 明示的にredirect_uriを指定
    });

    // トークン情報のデバッグログ
    console.log(
      "取得したトークン情報:",
      JSON.stringify({
        access_token: tokens.access_token ? "取得済み" : "未取得",
        refresh_token: tokens.refresh_token ? "取得済み" : "未取得",
        expiry_date: tokens.expiry_date,
      })
    );

    oAuth2Client.setCredentials(tokens);

    return oAuth2Client;
  } catch (error) {
    console.error("Error during authentication:", error);
    throw error;
  }
}

/**
 * ユーザーから認証コードを取得する
 * @returns string 認証コード
 */
function getAuthorizationCode(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      "Enter the authorization code from that page here: ",
      (code) => {
        rl.close();
        // URLデコードを行い、余分な空白を削除
        const decodedCode = decodeURIComponent(code.trim());
        console.log("認証コードを処理しました");
        console.log("認証コードの長さ:", decodedCode.length);
        resolve(decodedCode);
      }
    );
  });
}
