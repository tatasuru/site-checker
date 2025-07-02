import { createPlaywrightRouter, Dataset } from "crawlee";
import path from "path";

interface SiteData {
  url: string;
  title: string;
  depth: number;
  parentUrl?: string;
  path: string;
  timestamp: string;
}

export const router = createPlaywrightRouter();
router.addDefaultHandler(async ({ request, page, enqueueLinks, log }) => {
  log.info(`Request ${request.loadedUrl} `);

  // ページが読み込まれるまで待機
  await page.waitForLoadState("networkidle");

  // 基本情報を取得
  const title = await page.title();
  const url = request.loadedUrl;
  const htmlContent = await page.content();
  const links = await page.$$eval("a[href]", (elements) =>
    elements.map((el) => ({
      text: el.textContent?.trim(),
      href: el.getAttribute("href"),
    }))
  );
  const parsedUrl = new URL(url);

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

  // サイトデータを構築
  const siteData: SiteData = {
    url,
    title,
    depth,
    parentUrl: depth > 0 ? parentUrl : undefined,
    path: parsedUrl.pathname,
    timestamp: new Date().toISOString(),
  };

  // データを保存
  log.info(`Processing: ${url} (depth: ${depth})`);
  await Dataset.pushData(siteData);

  await enqueueLinks({
    strategy: "same-domain",
    exclude: [/\.(pdf|jpg|png|gif)$/i],
  });
});
