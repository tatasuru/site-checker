import { PlaywrightCrawler } from "crawlee";
import { router } from "../routes.ts";
import { Dataset } from "crawlee";
import fs from "fs/promises";
import path from "path";
import type { VueFlowNode, VueFlowEdge } from "../types/vueflow.ts";

/************************************
 * 0. ストレージをクリアする関数
 *************************************/
export async function clearStorage() {
  try {
    const storagePath = "./storage";

    // datasets をクリア
    const datasetsPath = path.join(storagePath, "datasets", "default");
    try {
      await fs.rm(datasetsPath, { recursive: true, force: true });
      console.log("Datasets cleared");
    } catch (error) {
      console.log("No datasets to clear");
    }

    // request_queues の中身のみクリア（ディレクトリは保持）
    const requestQueuesPath = path.join(
      storagePath,
      "request_queues",
      "default"
    );
    try {
      const files = await fs.readdir(requestQueuesPath);
      for (const file of files) {
        await fs.unlink(path.join(requestQueuesPath, file));
        console.log(`Cleared request queue file: ${file}`);
      }
    } catch (error) {
      console.log("No request queues to clear");
    }

    // key_value_stores の特定ファイルのみクリア（セッションプール状態は保持）
    const keyValueStoresPath = path.join(
      storagePath,
      "key_value_stores",
      "default"
    );
    try {
      const files = await fs.readdir(keyValueStoresPath);
      for (const file of files) {
        // セッションプール状態ファイルは保持
        if (file !== "SDK_SESSION_POOL_STATE.json") {
          await fs.unlink(path.join(keyValueStoresPath, file));
          console.log(`Cleared key-value store file: ${file}`);
        }
      }
    } catch (error) {
      console.log("No key-value stores to clear");
    }

    // merged files をクリア
    const mergedFiles = [
      path.join(storagePath, "merged-crawl-data.json"),
      path.join(storagePath, "vueflow-data.json"),
    ];

    for (const file of mergedFiles) {
      try {
        await fs.unlink(file);
        console.log(`Cleared: ${file}`);
      } catch (error) {
        // File doesn't exist, ignore
      }
    }

    console.log("Storage cleared successfully");
  } catch (error) {
    console.error("Error clearing storage:", error);
    throw error;
  }
}

// 全てqueueのジョブを実行するための関数
/************************************
 * 1. クローラーを実行する関数
 *************************************/
export async function executeCrawler(
  siteUrl: string,
  numberOfCrawlPage: string | undefined
) {
  // 0. ストレージをクリア（新しいクロールのため）
  await clearStorage();

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

  const result = await crawler.run([siteUrl]);

  if (result.requestsFailed) {
    throw new Error("No pages were crawled. Please check the site URL.");
  }

  return {
    message: "Crawling completed successfully!",
    siteUrl,
    numberOfCrawlPage: Number(numberOfCrawlPage) || 20,
  };
}

/************************************
 * 2. データセットファイルをマージする関数
 *************************************/
export async function mergeDatasetFiles() {
  try {
    // Crawlee の Dataset.getData() を使用
    const dataset = await Dataset.open();
    const allData = await dataset.getData();

    console.log(`Total items: ${allData.items.length}`);

    // 統合データを保存
    await fs.writeFile(
      "./storage/merged-crawl-data.json",
      JSON.stringify(allData.items, null, 2)
    );

    return allData.items;
  } catch (error) {
    console.error("Error merging dataset:", error);

    // 手動でファイルを読み込み（フォールバック）
    return await manualMerge();
  }
}

async function manualMerge() {
  const datasetDir = "./storage/datasets/default";
  const files = await fs.readdir(datasetDir);
  const jsonFiles = files.filter((file) => file.endsWith(".json"));

  const allData = [];

  for (const file of jsonFiles) {
    const filePath = path.join(datasetDir, file);
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    allData.push(data);
  }

  console.log(
    `Merged ${jsonFiles.length} files with ${allData.length} total items`
  );

  // 統合データを保存
  await fs.writeFile(
    "./storage/merged-crawl-data.json",
    JSON.stringify(allData, null, 2)
  );

  return allData;
}

/************************************
 * 3. VueFlowデータ生成する関数
 *************************************/
export async function generateVueFlowData(allData: any) {
  const nodes: VueFlowNode[] = [];
  const edges: VueFlowEdge[] = [];
  const nodeMap = new Map<string, VueFlowNode>();

  // 重複URLを除去
  const uniqueData = allData.reduce((acc: any[], current: { url: any }) => {
    const existing = acc.find((item: { url: any }) => item.url === current.url);
    if (!existing) {
      acc.push(current);
    }
    return acc;
  }, []);

  console.log(
    `Unique pages: ${uniqueData.length} (removed ${
      allData.length - uniqueData.length
    } duplicates)`
  );

  // ノード作成
  uniqueData.forEach(
    (item: { depth: number; title: string; url: string }, index: number) => {
      const nodeId = `node-${index}`;

      const node: VueFlowNode = {
        id: nodeId,
        type: "default",
        position: {
          x: (item.depth || 0) * 300,
          y: index * 80,
        },
        data: {
          label: item.title || "No Title",
          url: item.url,
          title: item.title,
          depth: item.depth || 0,
        },
      };

      nodes.push(node);
      nodeMap.set(item.url, node);
    }
  );

  // エッジ作成
  uniqueData.forEach((item: { parentUrl: string; url: string }) => {
    if (item.parentUrl && nodeMap.has(item.parentUrl)) {
      const parentNode = nodeMap.get(item.parentUrl)!;
      const currentNode = nodeMap.get(item.url)!;

      edges.push({
        id: `edge-${parentNode.id}-${currentNode.id}`,
        source: parentNode.id,
        target: currentNode.id,
        type: "default",
      });
    }
  });

  const vueFlowData = {
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      maxDepth: Math.max(
        ...uniqueData.map((item: { depth: any }) => item.depth || 0)
      ),
    },
  };

  await fs.writeFile(
    "./storage/vueflow-data.json",
    JSON.stringify(vueFlowData, null, 2)
  );

  console.log(
    `VueFlow data generated: ${nodes.length} nodes, ${edges.length} edges`
  );
  return vueFlowData;
}
