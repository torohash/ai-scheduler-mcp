# Google OAuth 認証エラー解決計画

## 問題の分析

エラーメッセージを確認すると、`invalid_grant` と `Malformed auth code` というエラーが発生しています。これは認証コードに問題があることを示しています。

### エラーの詳細

```
Error during authentication: GaxiosError: invalid_grant
...
error: 'invalid_grant',
error_description: 'Malformed auth code.'
```

### 考えられる原因

1. **認証コードの形式が不正**:

   - ユーザーが入力した認証コードに `%` が含まれており、これは URL エンコードされた状態のままになっています。
   - 例: `4%2F0Ab_5qlkQS_PTe1Yi3tNNuqisSbLt99uWPKt70BTqgsKAiQnVd51ITq9Q-Fk6UGSaEwp9gA`

2. **redirect_uri の不一致**:

   - credentials.json には `http://localhost` と `http://localhost:3000` が設定されていますが、認証 URL では `http://localhost` が使用されています。

3. **認証コードの有効期限切れ**:
   - 認証コードは通常、短時間で有効期限が切れます。

## 解決策

### 1. 認証コードのデコード処理を追加する

auth.ts ファイルの`getAuthorizationCode`関数を修正して、入力された認証コードを URL デコードするようにします。

```typescript
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
        // URLデコードを行う
        const decodedCode = decodeURIComponent(code.trim());
        resolve(decodedCode);
      }
    );
  });
}
```

### 2. redirect_uri を明示的に指定する

authenticate 関数内の getToken 呼び出しで、redirect_uri を明示的に指定します。

```typescript
const { tokens } = await oAuth2Client.getToken({
  code: code,
  redirect_uri: key.redirect_uris[0], // 明示的にredirect_uriを指定
});
```

### 3. 認証プロセスの改善

認証プロセスをより明確にするために、ユーザーへの指示を改善します。

```typescript
console.log("Authorize this app by visiting this url:", authUrl);
console.log(
  "After authorization, you will be redirected to a page with an error message."
);
console.log(
  "Copy the authorization code from the URL (after '?code=' and before '&')"
);
```

## 実装計画

1. auth.ts ファイルを修正して、認証コードのデコード処理を追加します。
2. getToken 呼び出しで redirect_uri を明示的に指定します。
3. ユーザーへの指示を改善します。

これらの変更により、認証プロセスがより堅牢になり、「invalid_grant」エラーが解決される可能性が高くなります。
