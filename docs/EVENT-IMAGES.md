# イベント一覧とサムネイル

2026-10-19、connpassの公開イベント一覧9ページ・全81件をブラウザで確認。日時、申込人数・定員、掲載場所、中止状態、当時のサムネイルを取り込んだ。参加者名や参加者限定情報は保存しない。会場名が未確認の回は、一覧に掲載されている住所または「オンライン」を表示する。

画像は専用R2バケット `ibaraki-dev-event-images` に保存。内容のSHA-256をキーにして重複を避ける。5種類の取得元URLは4種類の画像データになった。旧Mito.dev・水戸エンジニア勉強会の画像も維持する。

サイトの `/media/events/<hash>.<extension>` から配信する。バケットの公開一覧やアップロード用HTTPエンドポイントは設けない。取得はHTTPSの `media.connpass.com` のみに限定し、リダイレクトを拒否。5MiB以下のPNG/JPEG/WebP/GIFのみ受け付ける。SVGやHTMLは保存しない。

connpass APIキー設定後は既存の定期同期が全ページを取得し、画像をR2へ保存してから公開イベント情報を更新する。URLの署名・クエリは公開データに保存しない。画像取得に失敗した場合は前の画像を維持し、次回同期で再試行する。未取得の画像は公式ロゴを表示する。内容が同じなら画像URLは変わらず、内容が変われば別キーになる。

申込人数は補欠を含むconnpass一覧の表示に合わせる。実際の来場人数ではない。確認日を併記し、最新状況はconnpassへのリンクで確認できる。APIキー未設定時は自動更新されない。

Sources:
- https://mito-web-engineer.connpass.com/event/
- https://connpass.com/about/api/v2/
- https://developers.cloudflare.com/r2/api/workers/workers-api-reference/
