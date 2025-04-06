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
      scope: SCOPES,
    });
    console.log("Authorize this app by visiting this url:", authUrl);

    // ユーザーに認証コードを入力してもらう
    const code = await getAuthorizationCode();
    const { tokens } = await oAuth2Client.getToken(code);
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
        resolve(code);
      }
    );
  });
}
