import fs from "fs";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getTokenPath, getCredentialsPath } from "./paths.js";

/**
 * 保存された認証情報を読み込む
 * @returns OAuth2Client | null
 */
export async function loadSavedCredentialsIfExist(): Promise<OAuth2Client | null> {
  try {
    const TOKEN_PATH = getTokenPath();
    if (!fs.existsSync(TOKEN_PATH)) {
      return null;
    }
    const content = fs.readFileSync(TOKEN_PATH, "utf8");
    const credentials = JSON.parse(content);
    // 'google.auth.fromJSON' が OAuth2Client を返すことを期待
    const client = google.auth.fromJSON(credentials);
    // 型アサーションの代わりに型ガードを使用する方が安全な場合がある
    if (client instanceof OAuth2Client) {
      return client;
    }
    // 予期しない型の場合はエラーまたはnullを返す
    console.error("Loaded credentials are not an instance of OAuth2Client.");
    return null;
  } catch (err) {
    console.error("Error loading saved credentials:", err);
    const TOKEN_PATH = getTokenPath();
    if (fs.existsSync(TOKEN_PATH)) {
      console.log(
        "token.jsonファイルが不完全または不正な形式です。削除して再認証してください。",
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
export async function saveCredentials(client: OAuth2Client): Promise<void> {
  try {
    const CREDENTIALS_PATH = getCredentialsPath();
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error(
        `Credentials file not found at ${CREDENTIALS_PATH}. Please ensure it exists.`,
      );
    }

    const content = fs.readFileSync(CREDENTIALS_PATH, "utf8");
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    if (!key) {
      throw new Error(
        "Invalid credentials file format: Missing 'installed' or 'web' key.",
      );
    }

    // refresh_tokenが存在するか確認
    if (!client.credentials.refresh_token) {
      console.warn(
        "Refresh token not found in credentials. Skipping save to token.json.",
      );
      // refresh_tokenがない場合、保存処理をスキップするか、エラーを投げるか選択
      // ここでは警告を出してスキップする
      return;
      // throw new Error("Refresh token is missing, cannot save credentials.");
    }

    const TOKEN_PATH = getTokenPath();
    const payload = JSON.stringify({
      type: "authorized_user",
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    fs.writeFileSync(TOKEN_PATH, payload);
    console.log(`Credentials saved successfully to ${TOKEN_PATH}`);
  } catch (error) {
    console.error("Error saving credentials:", error);
    // エラーを再スローして呼び出し元で処理できるようにする
    throw error;
  }
}
