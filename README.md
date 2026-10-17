# ibaraki.dev website

茨城のエンジニアコミュニティのウェブサイト。Astro + Cloudflare Workers / D1 / Workers AI。

## 開発・検証

Node.js 24 推奨。プロジェクト内にも Node 24 を開発依存として同梱しています。

```sh
npm ci
npm run dev          # 静的ページの開発
npm run dev:worker   # 動的ページ・ローカルD1。AIはCloudflareへ接続
npm test
npm run check
npm run check:worker
npm run build
node scripts/check-seo.mjs
```

- [連携仕様・運用手順](docs/INTEGRATION-PLAN.md)
- [サイト仕様](docs/SPEC.md)
- [出典](docs/SOURCES.md)
- [検証記録](docs/VALIDATION.md)

## 開催情報とレポート

- `src/data/events.json` は確認済みの開催情報。公開資料は `src/data/community.ts`。
- Workers Cronが毎時35分に実行。mokumoku-bot の既存D1から「やること・やったこと」を読み、開催終了30分後以降に自動で要約・公開します。対象は2026-10-17以降。
- `非公開` を含む記録は除外。投稿の編集・削除は次回チェックで反映します。プロフィールやDiscord IDは取得しません。
- `公開資料: URL` の明示がある資料のみ、許可ホスト・匿名アクセスの確認後に掲載。
- レポートは専用D1に保存し、`/reports/` で配信。生成本文や生投稿はGitに保存しません。Botコード・記録DBの構造は変更していません。
- connpass APIキーは未取得。取得後に `npx wrangler secret put CONNPASS_API_KEY` で登録すると、6時間ごとに公開開催情報を同期します。新しい開催はリビルドせず反映されます。
- 手動で静的データを更新する場合だけ `CONNPASS_API_KEY` を環境変数に設定して `npm run sync:events` を使用します。

```sh
npm run reports:status -- --remote
npm run reports:withdraw -- 406885 --remote
npm run reports:restore -- 406885 --remote
```

## 配信

```sh
npx wrangler d1 migrations apply ibaraki-dev-reports --remote
npm run deploy
node scripts/check-worker.mjs https://ibaraki-dev-website.ba068082.workers.dev
```

公開先は `https://ibaraki-dev-website.ba068082.workers.dev/`、Worker名は `ibaraki-dev-website`。
独自ドメインへ移行するときはビルド環境変数 `SITE_URL` と `wrangler.jsonc` の `SITE_URL` を揃えます。

ソース管理：[Ibaraki-dev/ibaraki.dev](https://github.com/Ibaraki-dev/ibaraki.dev)。
GitHub Actionsは未登録。`docs/github-actions/deploy.yml` は将来のコード配信用テンプレートです。データの自動更新はCloudflare Cronで動作し、ActionsやGitHub書き込みトークンを必要としません。
