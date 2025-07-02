import { PlaywrightCrawler } from "crawlee";
import { router } from "./routes.ts";

const crawler = new PlaywrightCrawler({
  // 20リクエストを超えたら停止する
  maxRequestsPerCrawl: 50,

  requestHandler: router,
});

await crawler.run(["https://warehouse-theme-metal.myshopify.com/collections"]);
