import { OAuth2Client } from "google-auth-library";
import {
  loadSavedCredentialsIfExist,
  authenticate,
  saveCredentials,
} from "./client.js";

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

// クライアント関連の関数をエクスポート
export * from "./client.js";

// パス関連の関数をエクスポート
export * from "./paths.js";
