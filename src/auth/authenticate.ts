import fs from "fs";
import readline from "readline";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getCredentialsPath } from "./paths.js";

// OAuth2クライアント設定
const SCOPES = [
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/calendar",
];

/**
 * 認証を行う
 * @returns OAuth2Client
 */
export async function authenticate(): Promise<OAuth2Client> {
  try {
    const CREDENTIALS_PATH = getCredentialsPath();
    if (!fs.existsSync(CREDENTIALS_PATH)) {
      throw new Error(
        `Credentials file not found at ${CREDENTIALS_PATH}. Please download it from Google Cloud Console.`,
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
    if (!key.redirect_uris || key.redirect_uris.length === 0) {
      throw new Error(
        "Invalid credentials file format: Missing or empty 'redirect_uris'.",
      );
    }

    const oAuth2Client = new google.auth.OAuth2(
      key.client_id,
      key.client_secret,
      key.redirect_uris[0],
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
      "Copy the authorization code from the URL (after '?code=' and before '&' if present)",
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
      }),
    );

    // refresh_tokenが取得できたか確認
    if (!tokens.refresh_token) {
      console.warn(
        "Refresh token was not obtained. Ensure the consent screen was shown and you approved offline access.",
      );
      // 必要に応じてエラーを投げるか、処理を続行するか判断
      // throw new Error("Failed to obtain refresh token.");
    }

    oAuth2Client.setCredentials(tokens);

    return oAuth2Client;
  } catch (error) {
    console.error("Error during authentication:", error);
    // エラーを再スローして呼び出し元で処理できるようにする
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

  return new Promise((resolve, reject) => {
    rl.question(
      "Enter the authorization code from that page here: ",
      (code) => {
        rl.close();
        if (!code) {
          reject(new Error("Authorization code cannot be empty."));
          return;
        }
        try {
          // URLデコードを行い、余分な空白を削除
          const decodedCode = decodeURIComponent(code.trim());
          console.log("認証コードを処理しました");
          console.log("認証コードの長さ:", decodedCode.length);
          resolve(decodedCode);
        } catch (error: unknown) {
          // errorの型をunknownとして明示
          const message =
            error instanceof Error ? error.message : String(error); // 型チェック
          reject(new Error(`Error decoding authorization code: ${message}`));
        }
      },
    );
  });
}
