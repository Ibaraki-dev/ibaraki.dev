# connpass API 同期

公式 API v2 のイベント一覧を、ibaraki.dev のサブドメインに限定して毎日09:15 JSTに取得します。毎時の開催レポート処理とは独立しています。

APIキーは `CONNPASS_API_KEY` というCloudflare Worker Secretに保存します。Git、設定ファイル、ログには保存しません。登録はプロジェクトディレクトリで `npx wrangler secret put CONNPASS_API_KEY` を実行し、対話入力してください。

100件単位・最大1000件、リクエスト間隔1.1秒。D1で同時実行と同日中の再試行を防ぎます。ページごとの総件数変化・不足・重複・別グループ・不正日時を検出した場合、既存イベントを保持します。認証失敗・レート制限時もその日の処理を終了します。

タイトル、日時、会場、住所、人数、定員など必要な公開項目だけを保存します。画像は形式・サイズ・配信元を検証してR2に保存し、ダウンロード失敗時は既存画像を保持します。画像URLやAPIレスポンス全文は公開DBに保存しません。

Secret未設定時は同期しません。`jobs`テーブルの`connpass`行で`last_success`・`last_error`を確認できます。既存の過去イベントはAPI失敗や一時的な検索結果の変化では削除しません。

仕様: https://connpass.com/about/api/v2/

## 接続検証（2026-10-23）

登録済みのSecretを用いてCloudflare上で比較した結果:

| 条件 | 結果 |
| --- | --- |
| 手元のPythonと同じURL（count=1）、User-Agent明示なし | CloudFront HTML 403 |
| 通常のWorker URL（count=100、start=1）、User-Agent明示なし | CloudFront HTML 403 |
| 同じSecret・count=1、実際のアプリを示すUser-Agentを明示 | JSON 200、総数81件 |

手元のPythonは標準で `Python-urllib/3.9` を付ける。一方、以前のWorkerコードにはUser-Agent指定がなかった。現在は `scripts/connpass-client.mjs` の `ibaraki.dev-event-sync/1.0` をAPI・画像取得に付ける。ブラウザや他クライアントの偽装は行わない。

修正後に81イベントをD1に同期し、81件の画像参照（重複を除き4画像）と最新イベントの申込人数5人を確認。以前の「CloudflareからのAPIアクセス全般が制限される」という推測は、この結果により訂正する。キーは有効で、接続元変更やconnpassへの許可依頼は不要だった。

Workersのfetchは`redirect: 'manual'`を使用し、3xxをエラーとして扱う。APIキーをリダイレクト先へ送信しない。
