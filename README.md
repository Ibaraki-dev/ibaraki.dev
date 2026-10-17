# ibaraki.dev website

茨城のエンジニアコミュニティのウェブサイト。Astro + Cloudflare Workers Static Assets。

## 起動

Node.js 24 推奨。プロジェクト内にも Node 24 を開発依存として同梱しているため、`npm run` は対応バージョンで実行されます。

```sh
npm ci
npm run dev
npm run test
npm run check
npm run build
npm run deploy
```

- [仕様書](docs/SPEC.md)：目的・情報設計・技術選定・Discord Bot連携・運用
- [出典](docs/SOURCES.md)
- [検証記録](docs/VALIDATION.md)

## 情報更新

開催情報：`src/data/events.json`。公開資料：`src/data/community.ts`。
公式APIキーを環境変数 `CONNPASS_API_KEY` に設定して `npm run sync:events`。キーはファイルにコミットしない。同期後はビルド・配信が必要。

ソース管理：[Ibaraki-dev/ibaraki.dev](https://github.com/Ibaraki-dev/ibaraki.dev)。

ワークフローは `docs/github-actions/deploy.yml` に保存しています。Actionsへの登録権限がある認証で `.github/workflows/deploy.yml` に配置すると検証・ビルドが有効になります。

自動デプロイを有効にする場合は、GitHub Actions用Secretsに `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`CONNPASS_API_KEY` を登録。Variablesに `DEPLOY_ENABLED=true` と `SITE_URL` を設定するとpush時に配信されます。`EVENTS_SYNC_ENABLED=true` も設定すると日次更新できます。ワークフローを登録済みでSecrets未設定の場合は検証・ビルドのみ実行します。Cloudflareトークンは対象アカウントのWorkers配信用に限定してください。

APIキー・Discordの本番データは未接続。ワークフローは用意していますが自動実行はまだ有効ではありません。Discord要約は仕様検討まで。公開レポートを捏造するダミーは入れていません。

## 公開先

Cloudflare Worker名：`ibaraki-dev-website`。独自ドメインを設定するときは `SITE_URL` を変更してビルドしてください。
