import { PlaywrightCrawler } from "crawlee";
import { router } from "../routes.ts";
import { generateVueFlowData } from "./helpers/generate-vueflow.ts";

// メイン実行
export async function CrawlAndCreateVueFlowFile(
  siteUrl: string,
  userId: string,
  numberOfCrawlPage: string | undefined
) {
  try {
    // 1. クローラーを実行
    const crawler = new PlaywrightCrawler({
      requestHandler: router,

      /************************
       *オプションを設定
       ************************/
      // 20リクエストを超えたら停止する
      maxRequestsPerCrawl: Number(numberOfCrawlPage) || 20,
      headless: true,
    });
    await crawler.run([siteUrl]);

    // 2. クローリング後にデータを統合してVueFlowデータを生成
    const vueFlowData = await generateVueFlowData();

    console.log("Process completed successfully!");
    console.log(`- Nodes: ${vueFlowData.nodes.length}`);
    console.log(`- Edges: ${vueFlowData.edges.length}`);
    console.log(`- Max depth: ${vueFlowData.metadata.maxDepth}`);
    return vueFlowData;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Failed to create VueFlow data.");
  }
}
