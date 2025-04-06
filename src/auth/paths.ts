import path from "path";

/**
 * トークンファイルのパスを取得する
 * @returns トークンファイルのパス
 */
export function getTokenPath(): string {
  // 環境変数からパスを取得、未設定の場合はデフォルト値を使用
  return process.env.TOKEN_PATH || path.join(process.cwd(), "token.json");
}

/**
 * 認証情報ファイルのパスを取得する
 * @returns 認証情報ファイルのパス
 */
export function getCredentialsPath(): string {
  // 環境変数からパスを取得、未設定の場合はデフォルト値を使用
  return (
    process.env.CREDENTIALS_PATH || path.join(process.cwd(), "credentials.json")
  );
}
