#!/usr/bin/env python3
"""Check connpass API from this PC; never store credentials or event data."""
import getpass
import json
import sys
import urllib.error
import urllib.request

URL = 'https://connpass.com/api/v2/events/?subdomain=mito-web-engineer&count=1&order=2'
MAX_BODY = 256 * 1024


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Do not forward X-API-Key to a redirected destination.
        return None


def check(key):
    request = urllib.request.Request(URL, headers={'X-API-Key': key})
    opener = urllib.request.build_opener(NoRedirect)
    try:
        response = opener.open(request, timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    except (urllib.error.URLError, TimeoutError, OSError, ValueError):
        print('接続できませんでした。ネットワーク・TLS・タイムアウトを確認してください。')
        return 2

    with response:
        status = response.code
        kind = response.headers.get_content_type()
        body = response.read(MAX_BODY + 1)
    print(f'HTTP {status}')
    print('応答形式: ' + ('JSON' if kind == 'application/json' else 'HTML' if kind == 'text/html' else 'その他'))
    if len(body) > MAX_BODY:
        print('応答サイズが上限を超えたため、解析を中止しました。')
        return 2
    if status == 200:
        try:
            data = json.loads(body)
            total = data['results_available']
            rows = data['events']
            if type(total) is not int or total < 0 or not isinstance(rows, list):
                raise ValueError()
        except (ValueError, KeyError, TypeError, UnicodeError):
            print('HTTP 200ですが、想定するイベントAPIの応答ではありません。')
            return 2
        print(f'取得成功: 全{total}件中{len(rows)}件を取得しました。')
        print('このPCからはキーを使ってアクセスできています。')
        return 0
    if status == 401:
        print('認証失敗です。キーのコピー間違い・失効・有効化状況を確認してください。')
    elif status == 403:
        if kind == 'text/html' and b'cloudfront' in body.lower():
            print('CloudFrontのHTML形式の拒否応答です。キーの正否はこの結果だけでは判断できません。')
        else:
            print('アクセス拒否です。キーの利用条件や配信側の制限を確認してください。')
    elif status == 429:
        print('リクエスト制限です。時間をおいて再確認してください。')
    elif 300 <= status < 400:
        print('リダイレクトを拒否しました。キーは転送していません。')
    else:
        print('API取得に失敗しました。上記HTTPステータスで問い合わせできます。')
    return 1


def main():
    if not sys.stdin.isatty():
        print('通常のターミナルで実行してください。キーをコマンド引数やパイプで渡す必要はありません。')
        return 2
    print('connpass API接続確認（1リクエストのみ／ファイル・Cloudflareへの書き込みなし）')
    key = getpass.getpass('APIキーを入力してEnter（画面には表示されません）: ')
    if not key or any(char.isspace() for char in key) or not key.isascii():
        print('キーが空、または空白・改行・非ASCII文字を含んでいます。キーの値だけを入力してください。')
        return 2
    return check(key)


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (KeyboardInterrupt, EOFError):
        print('\n中止しました。')
        sys.exit(130)
    except Exception:
        # Never print exception text: HTTP libraries may include sensitive input.
        print('確認中にエラーが発生しました。キーや応答本文は表示しません。')
        sys.exit(2)
