import { createPlaywrightRouter, Dataset } from "crawlee";
import { createClient } from "@supabase/supabase-js";
import { load } from "ts-dotenv";

const env = load(
  {
    SUPABASE_URL: String,
    SUPABASE_KEY: String,
  },
  { path: ".env.local" }
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

interface SiteData {
  url: string;
  title: string;
  depth: number;
  statusCode: number; // レスポンスステータスコード
  parentUrl?: string;
  path: string;
  timestamp: string;
}

export const router = createPlaywrightRouter();
router.addDefaultHandler(async ({ request, page, enqueueLinks, log }) => {
  // リクエスト間に1秒の遅延
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // リクエストのURLを取得
  const originalUrl = request.loadedUrl;
  log.info(`Request ${originalUrl} `);

  // ハッシュの有無を確認
  const hasHash = originalUrl.includes("#");
  const urlForNavigation = hasHash ? originalUrl.split("#")[0] : originalUrl;

  if (hasHash) {
    log.info(
      `Hash detected, using base URL for navigation: ${originalUrl} -> ${urlForNavigation}`
    );
  }

  // ハッシュを除去したURLでページにアクセス
  const response = await page.goto(urlForNavigation, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  // 認証ページやエラーページをスキップ
  if (response?.status() === 401 || response?.status() === 403) {
    log.info(`Skipping protected page: ${urlForNavigation}`);
    return;
  }

  // 基本情報を取得
  const title = await page.title();
  const url = response?.url().replace(/\/$/, "") || urlForNavigation;
  // レスポンスで帰ってきた生のHTMLを取得
  // TODO: ここでのrawHtmlはjsなどが実行される前の状態のHTML
  // TODO: ここでのjs実行後のHTMLを取得する方法はawait response?.text()だが、これを使うとページの読み込みが完了するまで待機してしまう
  const rawHtml = await response?.text();
  const links = await page.$$eval("a[href]", (elements) =>
    elements.map((el) => ({
      text: el.textContent?.trim(),
      href: el.getAttribute("href"),
    }))
  );
  const parsedUrl = new URL(originalUrl);

  // 階層を計算
  const pathSegments = parsedUrl.pathname
    .split("/")
    .filter((s) => s.length > 0);
  const depth = pathSegments.length;

  // 親URLを推定（一階層上）
  const parentPath = pathSegments.slice(0, -1).join("/");
  const parentUrl = parentPath
    ? `${parsedUrl.origin}/${parentPath}`
    : parsedUrl.origin;

  // supabaseのcrawl_dataテーブルへpage_urlごとの結果を保存
  const crawlResultsId = request.userData.crawlResultsId;
  const { data: crawlData, error: crawlError } = await supabase
    .from("crawl_data")
    .insert([
      {
        crawl_results_id: crawlResultsId,
        page_url: url,
        raw_html: rawHtml,
        status_code: response?.status(),
        error_message: null,
      },
    ])
    .select()
    .single();

  if (crawlError) {
    log.error(`Failed to save crawl data for ${url}: ${crawlError.message}`);
    throw crawlError;
  }

  // サイトデータを構築
  const siteData: SiteData = {
    url,
    title,
    depth,
    statusCode: response?.status() || 200,
    parentUrl: depth > 0 ? parentUrl : undefined,
    path: parsedUrl.pathname,
    timestamp: new Date().toISOString(),
  };

  // データを保存
  log.info(`Processing: ${url} (depth: ${depth})`);
  await Dataset.pushData(siteData);

  const userId = request.userData.userId;
  const projectId = request.userData.projectId;
  await enqueueLinks({
    strategy: "same-domain",
    exclude: [/\.(pdf|jpg|png|gif)$/i],
    userData: { userId, projectId, crawlResultsId }, // クロール結果IDを渡す
  });
});
