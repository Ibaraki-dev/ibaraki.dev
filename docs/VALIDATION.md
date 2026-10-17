# 検証記録

2026-10-17

## 公開

- URL: https://ibaraki-dev-website.ba068082.workers.dev
- Worker: `ibaraki-dev-website`
- Version: `96a97be2-3469-4f3e-b9e8-8890cb3d26a2`
- 既存Botや他のWorkerは変更していない。

## チェック

- `npm run test`: 5/5成功。API v2データの正規化、個人情報フィールドの除外、別グループ/不正URL/不正日付の拒否、IDマージ、近い開催の選択と終了境界。
- `npm run check`: 14ファイル、errors 0 / warnings 0 / hints 0。
- `npm run build`: 成功。5 HTMLページとrobots.txt / sitemap.xmlを生成。
- `wrangler deploy --dry-run`: 成功。
- `wrangler deploy`: 成功。

## ブラウザ確認

Playwright Chromium、1440×1000 / 390×844。

- トップの実表示を確認し、ロゴ画像の縦横比とステッカー文字のコントラストを修正。
- モバイル：横方向のはみ出しなし。
- イベント検索 `#20`：1件。
- 存在しない検索語：0件表示。
- 2025年選択：3件。
- FAQクリック：detailsが開く。
- 本番トップを表示し、画面撮影。
- 公開HTTP応答：`/`, `/events/`, `/guidelines/`, `/privacy/`, `/logo.png`, `/robots.txt`, `/sitemap.xml` は200。`/not-a-page` は404。
- 公開直後の最初のHTTP確認は403。その後、ブラウザとcurl両方で上記正常応答を確認。

スクリーンショット：`output/playwright/live-desktop.png`, `output/playwright/live-mobile.png`。

## 未実施・制限

- connpass APIキーが未提供のため、実APIとの認証付き結合テストは未実施。スクリプトはキーがなければ明示的に失敗する。
- API更新ワークフローはファイル作成まで。GitHubリポジトリ・Secretsを設定していないためスケジュールは未稼働。
- Discord本番データの取得・AI要約は未実装。既存Botの公開ソースに基づいて仕様検討済み。
- connpass公開HTMLの直接取得は403。初版の情報は検索で確認できる公開ページに基づく。各情報のリンクを保存し、未確認の実施内容を捏造していない。
- ガイドラインは既存ポリシーの要約と参加時の案内、プライバシーページは初版の実装を反映。運営上の変更時に更新する。

## ロゴ・内容更新（2026-10-17）

- ロゴを元画像の色・形をトレースしたSVGに変更。PNG原本を保持。
- Chromeで公開connpassのグループ・開催ページを読み取り、#21の会場を会議室305に訂正。
- 主催者、一日の流れ、FAQ3件を追加。公開資料3件は資料本体にリンク。
- Astro check：14ファイル、エラー・警告0。ビルド成功。
- ChromeでSVG3画像の正常読込、横はみ出しなし、会場表記と追加コンテンツを確認。
- 更新後の本番ページでSVG、会議室305、主催者、6項目のタイムテーブルを確認。ブラウザに旧HTMLが残ってもスタイルが失われないよう、前版のハッシュ付きCSSも静的アセットとして保持した。

## White/WebGL redesign — 2026-10-17
- astro check: 0 errors / warnings / hints; tests 5/5; build passed.
- Desktop 1440×1024 and mobile390px inspected. Year filter and empty search verified.
- Live homepage: WebGL ready=true, no browser console errors. Evidence docs/design/live.png.
- Deployment: 53b56788-49be-4ef6-b0c3-4bc785f59562.
- Three.js dynamic bundle exceeds Vite 500KB warning threshold; only homepage requests it, reduced-motion skips it. No claim of performance benchmark or OS preference browser test.

## Organizer page — 2026-10-17
astro check: 0 errors/warnings/hints. Build: 6 pages. Desktop1280px/mobile375px visually checked, mobile no horizontal overflow. Public /organizers/ shows both local profile images fully loaded and correct X/connpass links; no console errors. Screenshot: docs/design/organizers-live.png. Deploy version: 82d28718-e0b4-41b7-be35-8452b294f5e2.

## Typography and gloss revision — 2026-10-17
Inter Variable + Noto Sans JP Variable self-hosted. Typecheck 0 errors/warnings/hints; build passed. Desktop1440×1024 and mobile390×844 inspected, including resize. Mobile blank-canvas issue with transmission/reflection fixed by disabling both for narrow canvas. Public WebGL ready=true, no console errors. Evidence docs/design/gloss-live.png, gloss-mobile.png, gloss-comparison.png. Latest deployed version5721e133-942c-48ca-b543-9a0a56439518. No pixel-identical claim versus generated reference.

## Spacing and backward tilt
Shared event/archive x=401.273px at1440px confirmed. Home mobile390px no horizontal overflow, organizer mobile visually inspected. Settled logo top leans backward14deg. Public screenshot docs/design/tilt-spacing-live.png. Typecheck0 errors/warnings/hints. Deployment da905171-c204-4a59-8110-5768f2fad126.

## Dark mode
Typecheck0 errors/warnings/hints, build passed. Desktop1440×1024 dark homepage visually verified with WebGL. Manual dark→reload persisted; navigation to organizer retained dark. Mobile390px organizer inspected; archive search field verified; manual light and system selections verified. OS setting change not simulated; listener implementation reviewed. Screenshot docs/design/dark-desktop.png. No browser console errors.
Public dark mode verified; WebGL ready=true. Theme restored to system after QA. Deployment fe6dcd25-efeb-4f3a-8c6c-d8449a5d45a8.

## Branded loader
Typecheck/build passed. Light/dark loading screenshots: docs/design/loading-light.png and loading.png. Normal path: loader attribute removed, WebGL ready=true, main visible, no console errors. Local fault-injection server returned503 for the Three.js module: loader removed, ready=false, main heading visible and static SVG rendered. Temporary failure server stopped after QA. Timeout guard6500ms reviewed in source.
Public deployment d1923624-d1db-4c40-b307-1459f37d5a70 verified: branded loader shown, then loading attribute removed, WebGL ready=true and main heading visible.

2026-10-17: Supporting copy changed to 茨城でつくる。つながる。 beneath wordmark (16–22px). Glass material revision: separate faces/bevels, tinted reflections, contour highlights and floor reflection. Astro check: zero diagnostics. Build succeeded. Mobile390px: WebGL ready, no horizontal overflow. Cloudflare version cb8e8a5a-04ba-4ca8-9b50-36ac7d2863d2.

2026-10-17: Lucide icon system deployed. @lucide/astro 1.58.0, no client runtime. Typecheck passed. Mobile homepage/archive/organizers show no horizontal overflow; archive search still filters. Version 06222d74-9cde-4544-b3a6-5e84b9393f32.

Icon theme switch: auto/light/dark buttons, selection feedback, reload persistence, mobile layout verified. Astro check clean. Cloudflare version 73cd28c4-e4d8-4a4b-abb6-4f9af5888479.

2026-10-17 glass rebuild: desktop1487×1058 / mobile390×844, both themes, no overflow, WebGL ready, loader released, browser error/warning logs empty. Astro check clean. Reflection/transmission now enabled on mobile. Compared full and focused captures to attached reference; see design-qa.md. Published Cloudflare version09521cce-c00d-48ac-9cf3-51676757ba7f. Performance on low-end physical phones is not benchmarked.

2026-10-17 entrance motion: distant lateral/depth launch paths, staggered 2.2-second assembly with critically damped easing. Loader reveal starts the animation clock; background/offscreen pauses it. Astro check clean; build passed. Recorded 48 frames and inspected desktop/mobile390px. Public page assembly=settled, loader released, no overflow or browser errors/warnings. Evidence docs/design/assembly-preview.gif, assembly-sequence.png, assembly-live.png. Cloudflare version b9fb0377-20dd-48a0-841d-71cec6903248.

2026-10-17 pointer interaction: Astro check zero diagnostics; build passed. Actual mouse input across hero verified left/right tilts, reflection updates, and return to rest outside hero. Browser errors/warnings empty. Public version51e3a517-4ecf-4fd8-a2ac-8588a59ff295 verified with mouse at right side. Evidence docs/design/pointer-left.png, pointer-right.png, pointer-live.png. Touch/reduced-motion exclusions reviewed in source.

2026-10-17 SEO/OGP: 1200×630 PNG474KB exported and visually checked live. Astro check0diagnostics; build passed; scripts/check-seo.mjs passed all5public page metadata, unique descriptions, JSON-LD, sitemap/robots, noindex404, image signature/dimensions/size and excluded artwork route. Twitterbot user-agent public fetch returned200 for home/image/sitemap/robots and404 for missing path, image/png and correct PNG bytes/dimensions. X posting/cache refresh and Google indexing not tested or claimed. Version2e62a745-c01a-4c53-9381-5e34243531f6.

2026-10-17 wider assembly: 12distinct launch lanes including lower diagonals and near/far depth; 180% hero render width. 65-frame real-browser recording docs/design/assembly-wide.gif. Desktop settled pose and mobile390×844 inspected; no horizontal overflow, no console warnings/errors. Astro check zero diagnostics; build passed. Cloudflare version8ca0b56f-e28f-4d5e-ac07-c84ebd575cc2.

2026-10-17 newcomer Q&A: source connpass406885 inspected in browser. Eight concise questions from published Q&A/overview/preparation. Native details first open, mouse opens and Enter closes verified;390px mobile no overflow; desktop light/dark inspected. Astro check0diagnostics, build passed. Published version6f6a3ea7-40e5-4a3d-b18b-ba382cdee01b.

2026-10-17 friendly Q&A revision: removed introductory description, softened questions/answers without changing participation policies; added small muted blue Q badges aligned with answer text. Desktop light/mobile390px visually checked, no overflow, removed text absent. Astro check zero diagnostics/build passed. Published version5db83689-1635-45e7-944c-7aa5666754b9.

2026-10-17 exact Q&A + kerning: restored all7connpass406885 Q&A entries in original order and wording, including past activity examples/link; removed added preparation question and paraphrases. Hero tracking changed from-.075em to-.02em with native font kerning enabled. Astro check clean, build passed. Mobile390px hero and expanded long question verified, no overflow.
Deployment2482dd22-6d68-4778-add5-22771f0314f0.

2026-10-17 dedicated anti-harassment page: connpass406885 policy text, seven prohibited-conduct bullets, organizer/contact link. Linked from homepage FAQ, guidelines and global footer; added to sitemap and SEO checks. Astro check0diagnostics, build passed, six public pages metadata validation passed. Desktop/mobile390px inspected; no overflow; heading wraps at semantic word boundary.
