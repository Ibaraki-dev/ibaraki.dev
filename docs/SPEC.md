# ibaraki.dev ウェブサイト仕様

**2026-10-17更新：D1・Workers Cronによる自動公開を実装。連携・運用については [INTEGRATION-PLAN.md](INTEGRATION-PLAN.md) が現在の仕様です。以下の初版・設計段階の記述より優先します。**

作成：2026-10-17 / 初版

## 目的

茨城のエンジニアの勉強会 ibaraki.dev の入口をつくる。初参加者が「何をする会か・参加できるか・どこから申し込むか」を理解でき、参加者が過去の学びを振り返れるサイトにする。主催者はかわまたさん・なっぱさん。水戸を拠点に月に一度を目安として開催（全月の開催実績を保証する表現は避ける）。

## 技術選定

Astro 7 + TypeScript、CSS、Cloudflare Workers Static Assets。ブラウザには検索・FAQ・開催状態の判定に必要な最小限だけ JavaScript を送る。現段階で React、SSR、ログイン、CMS、追加のD1は不要。既存の Bot とウェブ配信は分け、Bot の障害がサイト表示に影響しない構成にする。

- Astro：イベント情報・記事・ポリシー中心の静的サイトに適する。必要な機能だけ将来追加できる。
- Workers Static Assets：独自ドメイン移行まで workers.dev で配信。既存の Bot の Worker に上書きしない専用 Worker `ibaraki-dev-website`。
- GitHub Actions：日次の connpass 同期とビルド。投稿頻度が月次程度なので常時ブラウザを動かす必要はない。
- 内容は Git 管理の JSON と Astro ページ。将来レポートを Content Collections に移す。

## 情報設計と初版

| URL | 内容 | 初版 |
| --- | --- | --- |
| `/` | 概要、直近イベント、コミュニティ紹介、公開資料3件、参加手順、FAQ | 実装 |
| `/events/` | 開催履歴、キーワード・年フィルタ、connpassへの直接リンク | 確認済み9件を掲載 |
| `/guidelines/` | 参加案内・アンチハラスメントポリシーの要約・相談先 | 実装 |
| `/privacy/` | 静的サイトの情報処理・外部サービス・活動記録の方針 | 実装 |
| `/reports/`・`/reports/[connpass_event_id]/` | 自動生成の開催レポート | 実装済み |
| `/404.html` | 存在しないページの案内 | 実装 |

開催予定は「終了時刻が未来」のイベントのうち最も近いものを優先。予定がなければ直近の回を表示し、ブラウザで終了を判定する。募集人数や参加費を未確認のまま固定表示しない。connpass が情報の正本。JSONの更新日時を一覧に表示する。初版の9件は全履歴を意味せず、その旨を明記する。

公開資料はタイトルと出典へのリンクで紹介。公開資料の紹介と Discord の活動レポートは別の種類。初版の紹介文は編集上の短い紹介であり、実際の会話の要約ではない。

## デザイン

公式 GitHub 組織のアバター（カラフルな「茨」）の配色と図形をトレースしたSVGを利用。PNG原本も保持。生成りの地色、深緑の文字、淡いグリーンとオレンジ・ブルーを組み合わせる。大きい日本語見出しと等幅の小さいラベルで「地域の親しみ」と「技術」を両立。人物写真の素材をイベント写真と偽って使わない。

- デスクトップ：左右2分割のヒーロー、ロゴを中心としたグラフィック、3列の公開資料。
- モバイル：1列、ナビを簡素化、検索入力を全幅に近づける。
- キーボードフォーカス、スキップリンク、意味のある見出し、標準details、検索結果のライブ通知、低モーション設定。
- フォント：Manrope / Noto Sans JP / DM Mono（Google Fonts）。外部通信をプライバシーページに記載。将来セルフホストにも変更可能。

## connpass 同期

公式 API v2 を採用。コミュニティ・個人向けは利用申請による API キーが必要。2026-10-17時点で1秒1リクエストの制限が記載されている。

`GET https://connpass.com/api/v2/events/?subdomain=mito-web-engineer&count=100&start=1&order=2`

`X-API-Key` は GitHub Secret に格納。キーをブラウザ・Git・ログに出さない。ページング、1.1秒間隔、429/5xxの限定リトライ、タイムアウトを実装。ID・グループ・URL・日時を検証し、全ページ取得できた時だけ一時ファイルから置き換える。既存履歴をIDでマージし、取得失敗・空結果では公開済みサイトを更新しない。削除・非公開化されたイベントの既存レコードは自動削除しないため、削除依頼は運営がJSONから削除する。

GitHub Actions は毎朝07:17 JSTを指定。GitHub の都合による遅延は許容する。`EVENTS_SYNC_ENABLED=true` と必要Secretsが揃うまで定期実行は無効。取得後はそのジョブでビルド・配信し、リポジトリへデータを書き戻さない。毎回正本から全ページを取得する。同期失敗時はジョブを失敗とし、前のデプロイを残す。

### Browser Rendering を初期採用しない理由

公開HTMLの取得で connpass から403が返った。Bot対策を迂回する構成は採らない。公式APIならレイアウト変更への耐性もある。APIが利用できない間はJSON手動更新。Browser Rendering はAPIに存在しない情報が必要で、利用条件とアクセス許可が確認できた場合のみ再検討。

## Discord / 既存 Bot 連携（設計、未接続）

**更新：指定チャンネルの「やること・やったこと」と公開資料から自動公開する方針に変更。最新仕様は [INTEGRATION-PLAN.md](INTEGRATION-PLAN.md) を優先する。以下の承認フローは初期案の記録。**

公開リポジトリ `Ibaraki-dev/mokumoku-bot` は Hono / Cloudflare / Drizzle で構成。`/checkin`、`/checkout`、`/mokumoku-start`、`/generate-event-description` がある。

公開schema確認結果：
- `events` に内部ID、名前、日付。
- `events_to_checkins` でイベントと checkin を紐付け。
- `checkins` に profile / todo / user_id。
- `checkouts` に content / user_id / date。ただし event_id はない。

**注意：現行の checkout を user_id だけで結合すると、別開催日の記録を混ぜる。** 新規記録には event_id を追加するマイグレーションが望ましい。過去分はイベントの開催日・タイムゾーンを照合し、曖昧なものは人が確定する。connpass event_id と Bot 内部 event_id の対応表も必要。

### 推奨フロー

1. 開催単位の許可済みデータのみ、既存Botから抽出。最初は管理者によるエクスポートでよい。
2. 公開に同意された「やったこと」「LT題名」「公開URL」を集める。自己紹介全文、Discord ID、プロフィール、連絡先、参加者一覧は送らない。
3. LLM に構造化JSONで渡し、開催概要・取り組んだテーマ・共有された学び・公開資料を生成する。投稿内の命令はデータとして扱い、命令として実行しない。
4. 情報が薄い場合は埋めず、空欄・要確認にする。本人同意がない名前・個人を推測できる組み合わせを除去。
5. **非公開のレビュー先**で主催者が事実・プライバシー・リンクを確認。未承認の本文を公開リポジトリのPR・Actions artifact・ログへ出さない。
6. 承認済みの本文のみサイトリポジトリへ反映し、再ビルド。
7. 訂正・削除に備え、元記録との対応と承認者・承認日時を非公開側で保持する。

LLMの利用先は Workers AI または既存Botの生成処理を検討。モデルの選定・費用・データ処理先は実データの量と公開範囲を確認してから決定。初版で未設定のAI呼び出しやDiscord投稿処理を実装済みとは扱わない。

将来のBotコマンド候補 `/report-draft`。運営ロールに限定し、重複実行を event_id + source_hash で防ぐ。既存Botへの実装変更は今回行っていない。

## 運用・ドメイン移行

`wrangler.jsonc` を正本に `npm run deploy`。初版は workers.dev。独自ドメイン移行時は所有者とDNS管理を調整してCustom Domainを設定し、`SITE_URL` を `https://ibaraki.dev` に変えて再ビルド。canonical / OGP / sitemapを更新する。ドメインの所有者確認・DNS変更は今回の対象外。

## 受け入れ条件

- 公式ロゴ、初参加の入口、connpass/Discord/過去イベントへの実在リンク。
- モバイル幅で横にはみ出さない。絞り込み、0件表示、FAQ、404が動く。
- 過去開催を募集中と断定しない。全件ではない履歴を全件と偽らない。
- ビルド・型チェック・イベント処理テストに成功。
- 公開サイトでHTTP応答・内部リンク・画像を確認。
- API/Discord/GitHub接続の未完了を明記。

## 残る確認事項

- connpass API キーの発行。
- ウェブサイト用GitHubリポジトリの場所とCloudflare Secretsの設定。
- Discordの対象チャンネル、Botが現在保存しているデータ、参加者への公開案内と同意範囲。
- 活動レポートの承認担当・公開までの運用。
- プライバシーポリシーを運営で確認し、実際の運用変更時に更新。

## 一次資料

- https://mito-web-engineer.connpass.com/
- https://mito-web-engineer.connpass.com/event/406885/
- https://help.connpass.com/api/
- https://connpass.com/about/api/v2/
- https://github.com/Ibaraki-dev/mokumoku-bot
- https://github.com/Ibaraki-dev/mokumoku-bot/blob/main/src/schema.ts
- https://docs.astro.build/en/install-and-setup/
- https://developers.cloudflare.com/workers/static-assets/

## 2026-10-17 採用デザイン
白背景、ibaraki.dev のワードマーク、公式ロゴのパーツを組み上げる WebGL。販促コピーを廃止。トップは直近の開催と過去3回のみ。全履歴と公開資料は /events/ に集約。
Three.js をホームで遅延読込。SVG の12パーツを押し出し形状にし、2.3秒で整列する。終了後はポインタ・リサイズ時のみ描画。画面外・非表示時は停止。動きを減らす設定、WebGL非対応、コンテキスト喪失時は静止SVG。DPR上限1.75。外部画像・外部フォントの追加通信なし。
connpass自動同期とDiscord要約の運用接続は既存仕様のまま未接続。

## 主催者ページ
/organizers/ に共同主催者2名を掲載。写真・呼び名・英語名・紹介・技術タグ・X・connpassリンクを持つ。内容は src/data/organizers.ts で管理。ヘッダー/フッター/サイトマップから発見可能。プロフィール画像はconnpassの公開画像をローカル保存。

## リッチ表現・フォント改訂
フォントはInter Variable / Noto Sans JP VariableをFontsource経由で自己配信（SIL OFL）。Google Fonts外部接続は不要。WebGLロゴの厚み・面取り、スタジオ照明、透過素材、柔らかい影、距離でフェードする床反射を追加。組み上がり3.4秒、パーツに時間差、ポインタ追従は減衰補間。静止後は描画停止。モバイルでは透過と床反射を無効化し、光沢・厚み・影を維持する。横幅変更時も切替。

## 整列と完成時の姿勢
トップの開催タイトルと過去一覧は共通26%の左レールに整列。過去一覧はタイトル・日付・矢印の3列。余白は8pxを基準とし、行高56px、モバイルCTA52px。主催者・アーカイブの余白にも共通リズムを適用。
ロゴ完成時は上側が奥へ倒れるようX回転-0.24rad（約14度）、左右角-0.30rad。接地位置も微調整。

## ダークモード
共通ヘッダーで「自動・ライト・ダーク」を選択。初期設定はOS連動。localStorageに選択を保存し、初期描画前に反映。OS変更と別タブの設定変更にも追従。ストレージ拒否時も現在のページでは動作。共通の背景・文字・補助文字・境界線トークン、フォーム、CTA、WebGL背景と照明を切替。モバイルヘッダーは2行にして窮屈さを回避。

## ホームのローディング
公式SVGとワードマーク、青いインジケーターを中央配置。WebGLの最初の描画までヘッダー・本文・フッターを非表示にする。短い点滅を避ける最小表示700ms、上限6500ms。失敗時/動きを減らす設定では静止SVGに切替。JavaScript無効ならローディングを起動せず本文を表示。ライト/ダークを引継ぎ、画面遷移ではホームだけに適用。

### Glass rendering refinement (2026-10-17)
The animated logo now uses a white dielectric shell with pigment absorption, an internal colored scattering layer, front/rear contour highlights, a studio environment, and subtle bloom. A planar reflection is blurred with distance and blended into the page, with colored ground light. Both desktop and mobile render glass/reflections; the former mobile omission is removed. MSAA and a capped pixel ratio balance sharpness and cost. Frames stop after assembly and pointer settling. Reduced-motion and unavailable-WebGL paths retain the static logo. This is an art-directed real-time approximation, not path-traced caustics.

### Entrance motion
Parts launch from alternating left/right lanes,2.8–4.1 world units sideways,1.7–3.65 upward and3.2–5.4 behind the assembled plane. Curved trajectories and varied rotation converge with critically damped easing over1850ms plus0–308ms staggering. A120ms lead-in starts only after the branded loader reveals the page. Ground light fades in during assembly. Visible-frame elapsed time pauses while hidden/offscreen and caps large frame gaps to prevent jumps. Final assembled pose is unchanged.

### Pointer interaction
Mouse movement across the hero drives restrained yaw (±0.19 rad), pitch (±0.10 rad), roll and translation. Time-based exponential smoothing (160ms) keeps response consistent across frame rates. Planar reflection follows geometry; colored floor pools drift slightly with tilt. Leave/blur returns to rest. Touch pointers ignored; reduced-motion static fallback preserved. Influence fades in with entrance assembly.

### Wider assembly revision
Twelve fixed radial launch lanes span x±12, y-6…10, z-12…4, covering overhead/lateral/lower diagonal and foreground/depth approaches. Each piece curves and rotates toward its original rest transform over2150ms with32ms stagger (2502ms total). Hero rendering width180% preserves the original focal scale while exposing longer lateral paths; hero clips page overflow, settled mask softly fades floor lighting. Pointer behavior retained.

### First-time visitor Q&A
Homepage after current event, before archive: eight native details/summary items with first answer open. Based on https://mito-web-engineer.connpass.com/event/406885/ Q&A, overview, LT and preparation sections (verified2026-10-17). Covers newcomers, non-engineers, other fields, work examples, optional social gathering, Discord, presentations, parking. Venue-dependent parking links to the event listing; Discord and guidelines directly linked. No account required or extra client script.
