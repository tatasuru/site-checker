import { createCheerioRouter, createPlaywrightRouter, Dataset } from "crawlee";
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

export const router = createCheerioRouter();
router.addDefaultHandler(
  async ({ request, $, response, enqueueLinks, log }) => {
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

    // 認証ページやエラーページをスキップ
    if (response?.statusCode === 401 || response?.statusCode === 403) {
      log.info(`Skipping protected page: ${urlForNavigation}`);
      return;
    }

    // 基本情報を取得
    const title = $("title").text() || "";
    const url = response?.url?.replace(/\/$/, "") || urlForNavigation;
    // レスポンスで帰ってきた生のHTMLを取得（CheerioRouterでは静的HTML）
    const rawHtml = $("html").html() || "";
    const links = $("a[href]")
      .map((i, el) => ({
        text: $(el).text().trim(),
        href: $(el).attr("href"),
      }))
      .get();
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
          status_code: response?.statusCode,
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
      statusCode: response?.statusCode || 200,
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
      // https://crawlee.dev/js/api/core/enum/EnqueueStrategy
      strategy: "same-hostname", //same-hostname or same-domain
      exclude: [/\.(pdf|jpg|png|gif)$/i],
      userData: { userId, projectId, crawlResultsId }, // クロール結果IDを渡す
    });
  }
);
