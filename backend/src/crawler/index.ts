import { PlaywrightCrawler } from "crawlee";
import { router } from "../routes.ts";
import { generateVueFlowData } from "./helpers/generate-vueflow.ts";

export const crawler = new PlaywrightCrawler({
  requestHandler: router,

  /************************
   *オプションを設定
   ************************/
  // 20リクエストを超えたら停止する
  maxRequestsPerCrawl: 20,
  headless: true,
});

// メイン実行
export async function CrawlAndCreateVueFlowFile() {
  try {
    // 1. クローラーを実行
    await crawler.run(["https://www.marsflag.com/ja/"]);

    // 2. クローリング後にデータを統合してVueFlowデータを生成
    const vueFlowData = await generateVueFlowData();

    console.log("Process completed successfully!");
    console.log(`- Nodes: ${vueFlowData.nodes.length}`);
    console.log(`- Edges: ${vueFlowData.edges.length}`);
    console.log(`- Max depth: ${vueFlowData.metadata.maxDepth}`);
  } catch (error) {
    console.error("Error:", error);
  }
}
