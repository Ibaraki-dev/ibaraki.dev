# connpass・mokumoku-bot 連携

2026-10-17 実装仕様。従来の GitHub Actions でレポートを書き戻す案を、Workers Cron + D1 配信へ変更する。GitHub はソースコード管理に使い、生成本文・元投稿はコミットしない。

## 構成

```text
mokumoku-bot → 既存D1（記録） ─ SELECT ─┐
                                      ├→ Workers Cron → Workers AI → 公開用D1
connpass API v2 ─ 開催情報 ────────────┘                      ↓
                                         Astro + Worker → 開催一覧・レポート
```

- 既存 Bot のコード、DBスキーマ、Discord通知処理は変更しない。
- サイト Worker に既存D1を BOT_DB として接続。アプリケーションは SELECT のみ使用する。D1 binding 自体が読み取り専用権限になるわけではない。
- 公開用 D1 `ibaraki-dev-reports` は開催情報と要約本文、実行状態を保存する。生投稿・プロフィール・氏名・Discord ID はコピーしない。
- 動的ページはサーバー側で HTML を生成。レポートごとに title、canonical、OGP、サイトマップを更新する。個別の画像は共通OGP画像を使用する。
- DBをブラウザへ公開するAPIは設けない。`/api/events` は公開開催情報と公開済みレポートのイベントIDのみ返す。

## 開催・投稿の対応

対象コミュニティは ibaraki.dev、投稿先は `#もくもく会`。スレッド分割はなし。読み取り元はユーザーが指定した mokumoku-bot のD1。

1. connpass開催の日本時間の日付と、Botの `events.date` を照合。
2. connpass側・Bot側ともその日に1件だけなら対応を確定。0件なら待機、複数件なら公開せずエラー状態にする。
3. todoは `events_to_checkins` で開催に紐付く checkinだけ。
4. checkoutは同じ日かつ上記checkinの参加者のものだけ。同日同一ユーザーの複数checkoutは、同じ本文だけ重複除去し、異なる内容を保持する。

現行Botにはchannel_idやcheckout.event_idがないため、チャンネルIDによる追加の絞り込みはできない。同日複数開催・別コミュニティでのBot共用を始める前に、Bot側へ明示的な開催ID・チャンネルIDを追加する。それまでは曖昧な日付を自動選択しない。

## 自動公開

- 開始日：2026-10-17。設定 `REPORTS_START_DATE` より前は対象外。過去開催を一括公開しない。
- 毎時35分に確認。connpass終了時刻から30分以上経過した開催を対象にする。たとえば18:00終了なら初回は18:35以降。Cronの実行時刻は厳密保証しない。
- 48時間で打ち切る旧案は採用せず、対象開始日以降の記録を継続確認する。後日の削除も反映できる。最大100開催・各種200記録を上限とし、超過時はエラーにして運営が分割・保守する。
- 正規化した内容と生成バージョンから source_hash を作成。変更がなければAIを呼ばない。
- 予定（やること）と実績（やったこと）を別々に要約。実績の投稿がない場合はその旨を表示する。参加者数や発表・会場の雰囲気を推測しない。
- `@cf/qwen/qwen3-30b-a3b-fp8`、低temperature、JSON形式で生成。出力形・長さ・危険な文字列を検証する。自動処理は意味の正確性や個人情報の完全除去を保証するものではない。
- 要約の直前と直後で元記録のハッシュを照合。変化した場合は公開せず次回再実行。
- D1の期限付きリースと所有トークンで同時実行・古い実行による上書きを防ぐ。
- 元記録が変わった場合は古い公開本文を消してから再生成。失敗時は古い内容を出し続けず非公開にして次回再試行。
- 全記録が削除・非公開になればページ・一覧・サイトマップから外す。取り下げ状態はCronでは解除しない。
- 元のDiscordメッセージだけの削除ではD1が消えるとは限らない。Botの記録の編集・削除、または運営のレポート取り下げが必要。

## 公開範囲と資料

AI入力はtodoとcheckoutの内容だけ。プロフィール・氏名・Discord IDのカラムは取得しない。文中のメンション、メールアドレス、URLなどを除去する。「非公開」「公開不可」「社外秘」や既知のシークレットパターンを含む記録は全体を除外する。一般の雑談は読まない。

資料はtodoまたはcheckoutに `公開資料: https://...` と明記する。現状は speakerdeck.com / zenn.dev / qiita.com / github.com / docs.google.com / docswell.com の固定ホストだけ。Google Docsは明示的な公開URL（`/d/e/.../pub`）のみ。認証情報・クエリ・fragment・別ポート付きURLは除外。匿名GETで直接200を返すことを確認し、リダイレクトは追わない。本文は読まず接続を閉じる。タイトルはホスト名から固定表示し、AIにURLを生成させない。

主催者は参加者に自動要約の範囲と「非公開」の指定方法を案内する。Discordへの自動通知は今回追加していない。案内用文面は末尾に記載。

## connpass

`CONNPASS_API_KEY` があれば6時間ごとに公式API v2から最大1,000件を取得。ページング、タイムアウト、レスポンスサイズ、開催URL・グループ・日時を検証してからD1へまとめて保存する。失敗時は既存情報を保持し、次のCronで再試行する。API一覧からの消失だけでは削除しない。キャンセル等の状態は募集ページで確認する。

キー未取得のため本番API同期は未有効。取得までは `src/data/events.json` の確認済み開催情報が基準。同期が有効になると新規募集・日時変更がリビルドなしでサイトに反映される。Q&A・ポリシー本文は自動上書きしない。

## 運用

```sh
npm ci
npm test
npm run check
npm run check:worker
npm run build
node scripts/check-seo.mjs
npx wrangler d1 migrations apply ibaraki-dev-reports --remote
npx wrangler deploy
```

キーは取得後に端末の対話入力で登録する。値をチャットやGitへ貼らない。Secretを登録した後のCronから同期が始まる。

```sh
npx wrangler secret put CONNPASS_API_KEY
```

運用状態、取り下げ、再公開予約（イベントIDはconnpassのID）：

```sh
npm run reports:status -- --remote
npm run reports:withdraw -- 406885 --remote
npm run reports:restore -- 406885 --remote
```

`restore` は次回Cronで再生成する。`withdraw` は本文とハッシュを消して取り下げ状態を保持する。新規APIイベントは公開開催D1へ同期済みである必要がある。`--local` ならローカルDBだけを操作する。

Cloudflare Workers LogsとD1の `jobs.last_error` で失敗を確認する。ログには投稿本文や生成本文を出さない。外部への失敗通知は未設定。

ドメイン切り替え時はAstroの SITE_URL と wrangler.jsonc の SITE_URL を揃えてビルド・再配信する。

## ローカル検証

`npm run dev:worker` でD1ローカル環境を使用。AIのみ実際のCloudflareへ接続するため、架空のデータを使う。Wranglerの `http://localhost:8787/cdn-cgi/handler/scheduled` でCronを実行できる。公開側Workerには手動実行・管理のHTTPエンドポイントを設けていない。

テストはSQLite上で実SQLを実行し、対応の曖昧性・重複・削除・再生成・取り下げ・リース・API失敗を確認する。実AIの動作確認は架空の作業記録で別途実施。

## 参加者への案内文案（未送信）

もくもく会の「やること・やったこと」は、個人名を載せずに要約して ibaraki.dev の開催レポートに掲載します。公開したくない記録には「非公開」と書いてください。資料を紹介したいときは「公開資料: URL」を添えてもらえると嬉しいです。訂正・削除は運営まで気軽に声をかけてください。
