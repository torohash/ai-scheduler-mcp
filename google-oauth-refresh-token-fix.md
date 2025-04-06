# Google OAuth Refresh Token 問題の解決

## 問題の概要

アプリケーション起動時に以下のエラーが発生していました：

```
Error loading saved credentials: Error: The incoming JSON object does not contain a refresh_token field
```

これは`token.json`ファイルに`refresh_token`フィールドが含まれていないことが原因でした。

## 原因

1. Google OAuth2 認証プロセスで`refresh_token`が正しく取得されていなかった
2. 認証リクエストに`prompt: "consent"`パラメータが含まれていなかったため、ユーザーが既に認証済みの場合に`refresh_token`が発行されなかった

## 実施した修正

1. `token.json`ファイルを削除して、新しい認証プロセスを開始
2. `auth.ts`ファイルの`generateAuthUrl`メソッドに`prompt: "consent"`パラメータを追加
   ```typescript
   const authUrl = oAuth2Client.generateAuthUrl({
     access_type: "offline",
     prompt: "consent", // 常に同意画面を表示し、refresh_tokenを確実に取得
     scope: SCOPES,
   });
   ```
3. トークン取得プロセスにデバッグログを追加
   ```typescript
   console.log(
     "取得したトークン情報:",
     JSON.stringify({
       access_token: tokens.access_token ? "取得済み" : "未取得",
       refresh_token: tokens.refresh_token ? "取得済み" : "未取得",
       expiry_date: tokens.expiry_date,
     }),
   );
   ```
4. エラーハンドリングを改善して、具体的なエラー内容と対処方法を表示

## 結果

修正後、アプリケーションは正常に認証プロセスを完了し、`refresh_token`を取得・保存できるようになりました。2 回目以降の起動では、保存された認証情報を使用して再認証なしでアプリケーションが起動します。

## 技術的背景

Google OAuth2 認証では、以下の条件を満たす必要があります：

1. `access_type: "offline"`パラメータを指定して、オフラインアクセスを要求する
2. `prompt: "consent"`パラメータを指定して、ユーザーに毎回同意画面を表示する

特に 2 つ目の条件が重要で、これがないと以下の場合に`refresh_token`が発行されません：

- ユーザーが既に同じスコープでアプリケーションを承認している場合
- 前回の認証から短時間しか経過していない場合

## 今後の対策

1. 認証エラーが発生した場合は、`token.json`ファイルを削除して再認証を試みる
2. 認証パラメータに`prompt: "consent"`を常に含める
3. トークン取得時のデバッグログを確認して、`refresh_token`が正しく取得されているか確認する

## 参考情報

- [Google OAuth2 ドキュメント](https://developers.google.com/identity/protocols/oauth2)
- [Refresh Token の取得方法](https://developers.google.com/identity/protocols/oauth2/web-server#offline)
