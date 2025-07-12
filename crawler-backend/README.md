# setup

[TypeScript で始める Node.js 入門](https://ics.media/entry/4682/)
[crawlee](https://crawlee.dev/js/docs/quick-start)

## チュートリアル

```js
import { CheerioCrawler } from "crawlee";

const crawler = new CheerioCrawler({
  // 1回のクロールで最大20リクエストを処理する
  // 20リクエストを超えた時点でクロールを終了するので、実際のクロールは20件以上になる
  maxRequestsPerCrawl: 20,
  // 実行処理を定義する
  async requestHandler({ $, request, enqueueLinks }) {
    const title = $("title").text();
    console.log(`The title of "${request.url}" is: ${title}.`);
    //　新しく発見したリンクをキューに追加
    // またこれにより同一のドメイン内のリンクのみをクロールする
    // 重複するリンクは自動的に除外される
    await enqueueLinks({
      // クロールするURLのパターンを指定
      globs: ["https://crawlee.dev/*"],
      // リクエストキューに追加する前にリクエストを変換する関数
      transformRequestFunction(req) {
        // pdfリンクはクロールしない
        if (req.url.endsWith(".pdf")) return false;
        return req;
      },
    });
  },
});

await crawler.run(["https://crawlee.dev"]);
```

## メモ

- クロールするときは目的に近い URL から始める
- routes.ts に処理大部分を入れておく。(helper とかはまた別だけど。)
- log は crawlee の log を利用する。
- クローラでは html 全体をとってる。
  - Doctype
  - html の構造で判断している。
  - MQ はブラウザからとってきてないのでそこは注意。
    - ブラウザからとってくると勝手にタグとかを保管してしまうので
  - カスタマイズテストを設定できる
    - サイトにあってはいけないキーワードとかを検出できる
  - どこからもリンクされてないページの検出もできる
  - 除外 URL
    - 検索結果ページとかクエリが追加になってしまうページを場外したい。
  - depth 指定
  - 同時接続数
  - 各接続毎のインターバル時間

## お客様ができること

- 過去からの分析など
- HTML contents からの分析
- クローラの詳細な設定
