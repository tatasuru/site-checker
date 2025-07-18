import { PlaywrightCrawler, Configuration } from "crawlee";
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

    // datasets を完全削除
    await fs.rm(path.join(storagePath, "datasets"), {
      recursive: true,
      force: true,
    });

    // request_queues を完全削除
    await fs.rm(path.join(storagePath, "request_queues"), {
      recursive: true,
      force: true,
    });

    // key_value_stores は選択的削除
    const kvPath = path.join(storagePath, "key_value_stores", "default");
    try {
      const files = await fs.readdir(kvPath);
      const protectedFiles = ["SDK_SESSION_POOL_STATE.json", "INPUT.json"];

      for (const file of files) {
        if (!protectedFiles.includes(file)) {
          await fs.unlink(path.join(kvPath, file));
        }
      }
    } catch (error) {
      // ディレクトリが存在しない場合は無視
    }

    // カスタムファイル削除
    const customFiles = [
      path.join(storagePath, "merged-crawl-data.json"),
      path.join(storagePath, "vueflow-data.json"),
    ];

    await Promise.all(
      customFiles.map((file) => fs.unlink(file).catch(() => {}))
    );

    console.log("Storage cleared successfully (SDK state preserved)");
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
  siteUrl: string, // クロールするサイトURL
  maxPages: string | null, // クロールするページ数
  userId: string, // ユーザーID
  projectId: string, // プロジェクトID
  crawlResultsId: string // クロール結果データID
) {
  // ストレージをクリア
  await clearStorage();

  // 毎回新しいConfigurationを作成
  const config = new Configuration({
    purgeOnStart: true, // 開始時に自動パージ
    persistStorage: true, // データは保存
  });

  // TODO: ここのsessionPoolOptionsは50くらいいけるはずだけど、、、、
  // cheerioに切り替えてもいいかも。
  const crawler = new PlaywrightCrawler(
    {
      requestHandler: router,
      maxRequestsPerCrawl: Number(maxPages) || 20,
      headless: true, // ヘッドレスモードで実行
      maxRequestRetries: 2, // リトライ回数
      maxConcurrency: 4, // 同時実行数を4に設定
      useSessionPool: true, // セッションプールを使用
      requestHandlerTimeoutSecs: 60, // リクエストハンドラーのタイムアウト
      minConcurrency: 1, // 最小同時実行数を1に設定
      sessionPoolOptions: {
        maxPoolSize: 4, // 4つのブラウザのみで並列処理
        sessionOptions: {
          maxUsageCount: 100, // セッションの最大使用回数
          maxErrorScore: 5, // エラー許容度
        },
      },
      autoscaledPoolOptions: {
        minConcurrency: 1, // 最小同時実行数を1に設定
        maxConcurrency: 4, // 最大同時実行数を4に設定
        systemStatusOptions: {
          maxEventLoopOverloadedRatio: 0.4,
          maxCpuOverloadedRatio: 0.4,
          maxMemoryOverloadedRatio: 0.8,
        },
      },
    },
    config
  );

  console.log(`Starting crawler for ${siteUrl} with max ${maxPages || 20}`);

  try {
    const result = await crawler.run([
      {
        url: siteUrl,
        userData: {
          userId,
          projectId,
          crawlResultsId,
        },
      },
    ]);
    console.log("Crawler result:", result);

    if (result.requestsFinished === 0) {
      throw new Error("No pages were crawled. Please check the site URL.");
    }

    return {
      message: "Crawling completed successfully!",
      siteUrl,
      numberOfCrawlPage: Number(maxPages) || 20,
    };
  } finally {
    // 重要: リソースを明示的に解放
    await crawler.teardown();
  }
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

    if (allData.items.length === 0) {
      console.log("No dataset items found");
      // 空のデータを保存
      await fs.writeFile(
        "./storage/merged-crawl-data.json",
        JSON.stringify([], null, 2)
      );
      return [];
    }

    // 全てのデータをdepth順でソート
    const sortedAllDataByDepth = allData.items.sort(
      (a, b) => (a.depth || 0) - (b.depth || 0)
    );

    // 統合データを保存
    await fs.writeFile(
      "./storage/merged-crawl-data.json",
      JSON.stringify(sortedAllDataByDepth, null, 2)
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

  try {
    const files = await fs.readdir(datasetDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    const allData = [];

    for (const file of jsonFiles) {
      const filePath = path.join(datasetDir, file);
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      allData.push(data);
    }

    // 全てのデータをdepth順でソート
    const sortedAllDataByDepth = allData.sort(
      (a, b) => (a.depth || 0) - (b.depth || 0)
    );

    console.log(
      `Merged ${jsonFiles.length} files with ${sortedAllDataByDepth.length} total items`
    );

    // 統合データを保存
    await fs.writeFile(
      "./storage/merged-crawl-data.json",
      JSON.stringify(sortedAllDataByDepth, null, 2)
    );

    return allData;
  } catch (error) {
    console.log("No dataset directory found or no data scraped");

    // 空のデータを保存
    await fs.writeFile(
      "./storage/merged-crawl-data.json",
      JSON.stringify([], null, 2)
    );

    return [];
  }
}

/************************************
 * 3. VueFlowデータ生成する関数
 *************************************/
//TODO: 理解が半分しかできてないので、後でリファクタリングする
export async function generateVueFlowData(allData: any) {
  const nodes: VueFlowNode[] = [];
  const edges: VueFlowEdge[] = [];
  const nodeMap = new Map<string, VueFlowNode>();

  // データが空の場合の処理
  if (!allData || allData.length === 0) {
    const emptyVueFlowData = {
      nodes: [],
      edges: [],
      metadata: {
        totalNodes: 0,
        totalEdges: 0,
        maxDepth: 0,
      },
    };

    await fs.writeFile(
      "./storage/vueflow-data.json",
      JSON.stringify(emptyVueFlowData, null, 2)
    );

    console.log("No data to generate VueFlow data from");
    return emptyVueFlowData;
  }

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

  // 各深さでのインデックスを管理するMapを用意
  const depthIndexMap = new Map<number, number>();

  // まず全ノードを作成（位置調整前）
  uniqueData.forEach(
    (item: { depth: number; title: string; url: string }, index: number) => {
      const nodeId = `node-${index}`;
      const currentDepth = item.depth || 0;

      // その深さでのインデックスを取得・更新
      const depthIndex = depthIndexMap.get(currentDepth) || 0;
      depthIndexMap.set(currentDepth, depthIndex + 1);

      // nodeを作成（仮の位置で）
      const node: VueFlowNode = {
        id: nodeId,
        type: "custom",
        position: {
          x: depthIndex * 350, // 同じ深さ内での横方向位置
          y: currentDepth * 300, // 深さによる縦方向位置
        },
        data: {
          label: item.title || "No Title",
          url: item.url,
          title: item.title,
          depth: currentDepth,
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
        type: "custom",
      });
    }
  });

  // 位置調整：深さごとに親ノードの中央に配置
  const maxDepth = Math.max(
    ...uniqueData.map((item: { depth: any }) => item.depth || 0)
  );

  for (let depth = 0; depth <= maxDepth; depth++) {
    // その階層のノードたちを取得
    const nodesAtDepth = nodes.filter((node) => node.data.depth === depth);

    if (depth === 0) {
      // ルートノードは画面中央に配置
      if (nodesAtDepth.length > 0) {
        nodesAtDepth[0].position.x = 0;
        nodesAtDepth[0].position.y = 0;
      }
    } else {
      // 子ノードたちを親ノードの中央に配置
      adjustChildNodesPosition(nodesAtDepth, nodes, edges);
    }
  }

  // VueFlowデータを保存
  const vueFlowData = {
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      maxDepth,
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

function adjustChildNodesPosition(
  childNodes: VueFlowNode[],
  allNodes: VueFlowNode[],
  edges: VueFlowEdge[]
) {
  // 親ノード別に子ノードをグループ化
  const parentGroups = new Map<string, VueFlowNode[]>();

  childNodes.forEach((childNode) => {
    // この子ノードの親を見つける
    const parentEdge = edges.find((edge) => edge.target === childNode.id);
    if (parentEdge) {
      const parentNode = allNodes.find((node) => node.id === parentEdge.source);
      if (parentNode) {
        const parentId = parentNode.id;
        if (!parentGroups.has(parentId)) {
          parentGroups.set(parentId, []);
        }
        parentGroups.get(parentId)!.push(childNode);
      }
    }
  });

  // 各親ノードの子ノードたちを中央配置
  parentGroups.forEach((children, parentId) => {
    const parentNode = allNodes.find((node) => node.id === parentId);
    if (!parentNode) return;

    const nodeWidth = 250; // ノードの幅を想定
    const spacing = 350; // ノード間のスペース

    // 子ノードの総幅を計算
    const totalWidth = (children.length - 1) * spacing;

    // 親ノードの中央を基準とした開始位置
    const startX = parentNode.position.x - totalWidth / 2;

    // 子ノードを配置
    children.forEach((childNode, index) => {
      childNode.position.x = startX + index * spacing;
    });
  });
}
