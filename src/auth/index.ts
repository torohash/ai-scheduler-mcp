import { OAuth2Client } from "google-auth-library";
import { loadSavedCredentialsIfExist, saveCredentials } from "./credentials.js";
import { authenticate } from "./authenticate.js";

export { getTokenPath, getCredentialsPath } from "./paths.js";
export { loadSavedCredentialsIfExist, saveCredentials } from "./credentials.js";
export { authenticate } from "./authenticate.js";

/**
 * 認証クライアントを初期化する
 * @returns OAuth2Client | null
 */
export async function initializeAuth(): Promise<OAuth2Client | null> {
  try {
    console.log("保存された認証情報の読み込みを試行...");
    let client = await loadSavedCredentialsIfExist();
    if (client) {
      console.log("保存された認証情報が見つかりました。");
      // トークンの有効期限を確認し、必要であればリフレッシュ
      // 注: google-auth-library は通常、自動的にリフレッシュを試みますが、
      // 明示的なチェックやリフレッシュが必要な場合もあります。
      // 必要に応じて client.getRequestMetadata() や client.refreshAccessToken() を使用
      return client;
    }

    console.log("保存された認証情報が見つかりません。新規認証を開始します...");
    client = await authenticate();
    console.log("新規認証が完了しました。");

    // 認証情報を保存（refresh_tokenがある場合のみ）
    if (client.credentials.refresh_token) {
      console.log("認証情報を保存しています...");
      await saveCredentials(client);
      console.log("認証情報の保存が完了しました。");
    } else {
      console.warn(
        "Refresh tokenが取得できなかったため、認証情報は保存されませんでした。",
      );
    }

    return client;
  } catch (error) {
    console.error("認証クライアントの初期化中にエラーが発生しました:", error);
    // エラーの詳細を出力
    if (error instanceof Error) {
      console.error("エラーメッセージ:", error.message);
      if (error.stack) {
        console.error("スタックトレース:", error.stack);
      }
    }
    return null; // 初期化失敗時はnullを返す
  }
}
