# connpass の日次同期

Cloudflare Browser Run（旧 Browser Rendering）+ Playwright (`@cloudflare/playwright`) で公開 DOM を取得する。
対象は `https://mito-web-engineer.connpass.com/event/` の一覧と、そこに掲載されたイベント詳細だけ。Chrome のログアウト状態で確認した DOM セレクタを使用する。

- 毎日 09:15 JST。D1 の原子的な取得権確保で UTC 日ごとに最大1回。失敗時も同日中は再試行しない。
- 2秒間隔、最大20一覧ページ・200イベント・10分。件数、重複、日時、DOM を検証し、全件取得成功後に D1 の公開情報を一括更新。
- 保存するのはタイトル・日時・人数・定員・場所・住所・画像。参加者名、プロフィール、参加者限定情報、HTML 本文は保存しない。
- 画像は既存のホスト制限・サイズ制限・形式検証を通して R2 に保存。SHA-256 キーで重複を避ける。
- Cookie、ログイン、ID・パスワードは使用しない。公開 HTTP 経由の実行入口は作らない。
- ブラウザのサブリソースと JavaScript を無効化。対象以外への遷移を遮断。403、202/challenge、DOM 変更、画像取得失敗で公開データを更新しない。ブラウザは finally で閉じる。
- `jobs` の `connpass-browser` 行に最終成功時刻・定型エラーを記録。エラー本文、HTML、認証情報をログに出さない。

## 現在の状態（2026-10-22）

Chrome では公開ページを閲覧できるが、Cloudflare Browser Run からは HTTP 202 と `x-amzn-waf-action: challenge` が返った。このため `CONNPASS_BROWSER_ENABLED=false` として停止している。WAF 回避は実装しない。

connpass 側で Cloudflare Browser Run からの対象ページアクセスが許可された後、公開一覧・詳細の取得検証を行い、`wrangler.jsonc` の同変数を文字列 `true` にしてデプロイする。既存の毎時レポート処理は継続する。Browser binding がある構成では旧 API 同期は実行しない。

## 実装

Cloudflare 公式の Playwright `launch(env.BROWSER)` を使用。BrowserContext で JavaScript と Service Worker を無効化し、`context.route()` で対象以外の通信を遮断する。取得後の HTML の検証・公開項目の抽出は既存の共通パーサーを利用する。

Puppeteer と、それに付随していた ZIP 展開・FTP 用の間接依存は削除した。
