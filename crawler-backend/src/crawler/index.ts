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

    return sortedAllDataByDepth;
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
//TODO: 後でリファクタリングする
// export async function generateVueFlowData(allData: any) {
//   const nodes: VueFlowNode[] = [];
//   const edges: VueFlowEdge[] = [];
//   const nodeMap = new Map<string, VueFlowNode>();

//   // データが空の場合の処理
//   if (!allData || allData.length === 0) {
//     const emptyVueFlowData = {
//       nodes: [],
//       edges: [],
//       metadata: {
//         totalNodes: 0,
//         totalEdges: 0,
//         maxDepth: 0,
//       },
//     };

//     await fs.writeFile(
//       "./storage/vueflow-data.json",
//       JSON.stringify(emptyVueFlowData, null, 2)
//     );

//     console.log("No data to generate VueFlow data from");
//     return emptyVueFlowData;
//   }

//   // 重複URLを除去
//   const uniqueData = allData.reduce((acc: any[], current: { url: any }) => {
//     const existing = acc.find((item: { url: any }) => item.url === current.url);
//     if (!existing) {
//       acc.push(current);
//     }
//     return acc;
//   }, []);

//   // まず全ノードを作成（仮の位置で）
//   uniqueData.forEach(
//     (item: { depth: number; title: string; url: string }, index: number) => {
//       const nodeId = `node-${index}`;
//       const currentDepth = item.depth || 0;

//       const node: VueFlowNode = {
//         id: nodeId,
//         type: "custom",
//         position: { x: 0, y: 0 }, // 仮の位置
//         data: {
//           label: item.title || "No Title",
//           url: item.url,
//           title: item.title,
//           depth: currentDepth,
//         },
//       };

//       nodes.push(node);
//       nodeMap.set(item.url, node);
//     }
//   );

//   // エッジ作成
//   uniqueData.forEach((item: { parentUrl: string; url: string }) => {
//     if (item.parentUrl && nodeMap.has(item.parentUrl)) {
//       const parentNode = nodeMap.get(item.parentUrl)!;
//       const currentNode = nodeMap.get(item.url)!;

//       edges.push({
//         id: `edge-${parentNode.id}-${currentNode.id}`,
//         source: parentNode.id,
//         target: currentNode.id,
//         type: "custom",
//       });
//     }
//   });

//   // 位置調整
//   adjustNodesPosition(nodes, edges);

//   const maxDepth = Math.max(
//     ...uniqueData.map((item: { depth: number }) => item.depth || 0)
//   );

//   // VueFlowデータを保存
//   const vueFlowData = {
//     nodes,
//     edges,
//     metadata: {
//       totalNodes: nodes.length,
//       totalEdges: edges.length,
//       maxDepth,
//     },
//   };

//   await fs.writeFile(
//     "./storage/vueflow-data.json",
//     JSON.stringify(vueFlowData, null, 2)
//   );

//   console.log(
//     `VueFlow data generated: ${nodes.length} nodes, ${edges.length} edges`
//   );
//   return vueFlowData;
// }

// ノードの位置を調整する関数
// function adjustNodesPosition(nodes: VueFlowNode[], edges: VueFlowEdge[]) {
//   const nodeWidth = 250;
//   const nodeSpacing = 50;
//   const levelSpacing = 300;

//   // 親子関係をマップ化
//   const parentChildrenMap = new Map<string, string[]>();
//   const childParentMap = new Map<string, string>();

//   edges.forEach((edge) => {
//     const parentId = edge.source;
//     const childId = edge.target;

//     if (!parentChildrenMap.has(parentId)) {
//       parentChildrenMap.set(parentId, []);
//     }
//     parentChildrenMap.get(parentId)!.push(childId);
//     childParentMap.set(childId, parentId);
//   });

//   // ルートノードを見つける
//   const rootNodes = nodes.filter((node) => !childParentMap.has(node.id));

//   // 各ノードの必要幅を再帰的に計算
//   function calculateRequiredWidth(nodeId: string): number {
//     const children = parentChildrenMap.get(nodeId) || [];

//     if (children.length === 0) {
//       return nodeWidth;
//     }

//     const childrenWidths = children.map((childId) =>
//       calculateRequiredWidth(childId)
//     );
//     const totalChildrenWidth =
//       childrenWidths.reduce((sum, width) => sum + width, 0) +
//       (children.length - 1) * nodeSpacing;

//     return Math.max(nodeWidth, totalChildrenWidth);
//   }

//   // 各ノードの必要幅を計算
//   const nodeRequiredWidths = new Map<string, number>();
//   nodes.forEach((node) => {
//     nodeRequiredWidths.set(node.id, calculateRequiredWidth(node.id));
//   });

//   // ルートノードの位置を計算（横一列に配置）
//   let rootStartX = 0;

//   // 全ルートノードの総幅を計算
//   const totalRootWidth =
//     rootNodes.reduce((sum, node) => {
//       return sum + nodeRequiredWidths.get(node.id)!;
//     }, 0) +
//     (rootNodes.length - 1) * nodeSpacing;

//   // ルートノードを中央配置
//   rootStartX = -totalRootWidth / 2;

//   // 再帰的にノードの位置を設定
//   function positionNode(
//     nodeId: string,
//     parentX: number,
//     depth: number
//   ): number {
//     const node = nodes.find((n) => n.id === nodeId)!;
//     const children = parentChildrenMap.get(nodeId) || [];
//     const requiredWidth = nodeRequiredWidths.get(nodeId)!;

//     if (children.length === 0) {
//       // 葉ノードの場合
//       node.position.x = parentX;
//       node.position.y = depth * levelSpacing;
//       return requiredWidth;
//     }

//     // 子ノードがある場合
//     const childNodes = children.map(
//       (childId) => nodes.find((n) => n.id === childId)!
//     );

//     // 子ノードの総幅を計算
//     const childrenTotalWidth =
//       children.reduce((sum, childId) => {
//         return sum + nodeRequiredWidths.get(childId)!;
//       }, 0) +
//       (children.length - 1) * nodeSpacing;

//     // 子ノードの配置開始位置（親の中央を基準に）
//     let childStartX = parentX - childrenTotalWidth / 2;

//     // 各子ノードを配置
//     children.forEach((childId) => {
//       const childWidth = positionNode(
//         childId,
//         childStartX + nodeRequiredWidths.get(childId)! / 2,
//         depth + 1
//       );
//       childStartX += childWidth + nodeSpacing;
//     });

//     // 親ノードを配置（子ノードの中央）
//     node.position.x = parentX;
//     node.position.y = depth * levelSpacing;

//     return requiredWidth;
//   }

//   // 各ルートノードを配置
//   let currentRootX = rootStartX;
//   rootNodes.forEach((rootNode) => {
//     const rootWidth = nodeRequiredWidths.get(rootNode.id)!;
//     positionNode(rootNode.id, currentRootX + rootWidth / 2, 0);
//     currentRootX += rootWidth + nodeSpacing;
//   });

//   // 全体を正の座標に移動
//   const minX = Math.min(...nodes.map((node) => node.position.x));
//   if (minX < 0) {
//     const offset = -minX + nodeSpacing;
//     nodes.forEach((node) => {
//       node.position.x += offset;
//     });
//   }
// }

/************************************
 * 3. VueFlowデータ生成する関数（修正版）
 *************************************/
export async function generateVueFlowData(allData: any) {
  const nodes: VueFlowNode[] = [];
  const edges: VueFlowEdge[] = [];
  const nodeMap = new Map<string, VueFlowNode>();
  const existingUrls = new Set<string>();

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

  // 実在するURLのセットを作成
  uniqueData.forEach((item: { url: string }) => {
    existingUrls.add(item.url);
  });

  // 中間ノード（実在しないがパスの途中にあるページ）を特定して追加
  const intermediateNodes = new Set<string>();
  uniqueData.forEach((item: { url: string; parentUrl?: string }) => {
    if (item.parentUrl) {
      // 親URLが実在しない場合、中間ノードとして追加が必要かチェック
      if (!existingUrls.has(item.parentUrl)) {
        // URLパスを解析して中間パスを生成
        const childPath = new URL(item.url).pathname;
        const parentPath = new URL(item.parentUrl).pathname;

        // 親パスが子パスの途中にある場合、中間ノードとして追加
        if (childPath.startsWith(parentPath)) {
          intermediateNodes.add(item.parentUrl);
        }
      }
    }
  });

  // 中間ノードのdepthを計算する関数
  function calculateDepthFromUrl(url: string): number {
    try {
      const pathname = new URL(url).pathname;
      // パスの深さを計算（先頭と末尾のスラッシュを除く）
      const pathParts = pathname.split("/").filter((part) => part.length > 0);
      return pathParts.length - 1; // ベースパス（例：guide）を0として計算
    } catch (error) {
      return 0;
    }
  }

  // 中間ノードをnodes配列に追加
  let nodeIndex = uniqueData.length;
  intermediateNodes.forEach((url) => {
    const nodeId = `node-${nodeIndex}`;
    const depth = calculateDepthFromUrl(url);

    // URLから適切なタイトルを生成
    const urlPath = new URL(url).pathname;
    const pathParts = urlPath.split("/").filter((part) => part.length > 0);
    const title = pathParts[pathParts.length - 1] || "Intermediate Node";

    const node: VueFlowNode = {
      id: nodeId,
      type: "custom",
      position: { x: 0, y: 0 }, // 仮の位置
      data: {
        label: `${title} (intermediate)`,
        url: url,
        title: title,
        depth: depth,
        isIntermediate: true, // 中間ノードであることを示すフラグ
      },
    };

    nodes.push(node);
    nodeMap.set(url, node);
    nodeIndex++;
  });

  // 実在するノードを作成
  uniqueData.forEach(
    (item: { depth: number; title: string; url: string }, index: number) => {
      const nodeId = `node-${index}`;
      const currentDepth = item.depth || 0;

      const node: VueFlowNode = {
        id: nodeId,
        type: "custom",
        position: { x: 0, y: 0 }, // 仮の位置
        data: {
          label: item.title || "No Title",
          url: item.url,
          title: item.title,
          depth: currentDepth,
          isIntermediate: false,
        },
      };

      nodes.push(node);
      nodeMap.set(item.url, node);
    }
  );

  // エッジ作成（既存のデータから）
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

  // 中間ノードのエッジも作成
  intermediateNodes.forEach((intermediateUrl) => {
    // 中間ノードの親を見つける
    const intermediatePath = new URL(intermediateUrl).pathname;
    const pathParts = intermediatePath
      .split("/")
      .filter((part) => part.length > 0);

    if (pathParts.length > 1) {
      // 一つ上の階層のURLを構築
      const parentParts = pathParts.slice(0, -1);
      const baseUrl = new URL(intermediateUrl).origin;
      const parentUrl = baseUrl + "/" + parentParts.join("/");

      if (nodeMap.has(parentUrl)) {
        const parentNode = nodeMap.get(parentUrl)!;
        const intermediateNode = nodeMap.get(intermediateUrl)!;

        edges.push({
          id: `edge-${parentNode.id}-${intermediateNode.id}`,
          source: parentNode.id,
          target: intermediateNode.id,
          type: "custom",
        });
      }
    }
  });

  // 位置調整
  adjustNodesPosition(nodes, edges);

  const maxDepth = Math.max(...nodes.map((node) => node.data.depth || 0));

  // VueFlowデータを保存
  const vueFlowData = {
    nodes,
    edges,
    metadata: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      maxDepth,
      intermediateNodes: intermediateNodes.size,
    },
  };

  // VueFlowデータをid順にソート
  vueFlowData.nodes.sort((a, b) => a.id.localeCompare(b.id));
  vueFlowData.edges.sort((a, b) => a.id.localeCompare(b.id));

  await fs.writeFile(
    "./storage/vueflow-data.json",
    JSON.stringify(vueFlowData, null, 2)
  );

  console.log(
    `VueFlow data generated: ${nodes.length} nodes, ${edges.length} edges (${intermediateNodes.size} intermediate nodes)`
  );
  return vueFlowData;
}

// ノードの位置を調整する関数（修正版）
function adjustNodesPosition(nodes: VueFlowNode[], edges: VueFlowEdge[]) {
  const nodeWidth = 250;
  const nodeSpacing = 50;
  const levelSpacing = 300;

  // 親子関係をマップ化
  const parentChildrenMap = new Map<string, string[]>();
  const childParentMap = new Map<string, string>();

  edges.forEach((edge) => {
    const parentId = edge.source;
    const childId = edge.target;

    if (!parentChildrenMap.has(parentId)) {
      parentChildrenMap.set(parentId, []);
    }
    parentChildrenMap.get(parentId)!.push(childId);
    childParentMap.set(childId, parentId);
  });

  // ルートノードを見つける
  const rootNodes = nodes.filter((node) => !childParentMap.has(node.id));

  // 各ノードの深さを再計算（エッジベース）
  function calculateNodeDepth(
    nodeId: string,
    visited = new Set<string>()
  ): number {
    if (visited.has(nodeId)) {
      return 0; // 循環参照を避ける
    }
    visited.add(nodeId);

    const parentId = childParentMap.get(nodeId);
    if (!parentId) {
      return 0; // ルートノード
    }

    return calculateNodeDepth(parentId, visited) + 1;
  }

  // 各ノードの実際の深さを設定
  nodes.forEach((node) => {
    const actualDepth = calculateNodeDepth(node.id);
    node.data.depth = actualDepth;
  });

  // 各ノードの必要幅を再帰的に計算
  function calculateRequiredWidth(nodeId: string): number {
    const children = parentChildrenMap.get(nodeId) || [];

    if (children.length === 0) {
      return nodeWidth;
    }

    const childrenWidths = children.map((childId) =>
      calculateRequiredWidth(childId)
    );
    const totalChildrenWidth =
      childrenWidths.reduce((sum, width) => sum + width, 0) +
      (children.length - 1) * nodeSpacing;

    return Math.max(nodeWidth, totalChildrenWidth);
  }

  // 各ノードの必要幅を計算
  const nodeRequiredWidths = new Map<string, number>();
  nodes.forEach((node) => {
    nodeRequiredWidths.set(node.id, calculateRequiredWidth(node.id));
  });

  // ルートノードの位置を計算（横一列に配置）
  let rootStartX = 0;

  // 全ルートノードの総幅を計算
  const totalRootWidth =
    rootNodes.reduce((sum, node) => {
      return sum + nodeRequiredWidths.get(node.id)!;
    }, 0) +
    (rootNodes.length - 1) * nodeSpacing;

  // ルートノードを中央配置
  rootStartX = -totalRootWidth / 2;

  // 再帰的にノードの位置を設定
  function positionNode(
    nodeId: string,
    parentX: number,
    depth: number
  ): number {
    const node = nodes.find((n) => n.id === nodeId)!;
    const children = parentChildrenMap.get(nodeId) || [];
    const requiredWidth = nodeRequiredWidths.get(nodeId)!;

    if (children.length === 0) {
      // 葉ノードの場合
      node.position.x = parentX;
      node.position.y = depth * levelSpacing;
      return requiredWidth;
    }

    // 子ノードがある場合
    const childrenTotalWidth =
      children.reduce((sum, childId) => {
        return sum + nodeRequiredWidths.get(childId)!;
      }, 0) +
      (children.length - 1) * nodeSpacing;

    // 子ノードの配置開始位置（親の中央を基準に）
    let childStartX = parentX - childrenTotalWidth / 2;

    // 各子ノードを配置
    children.forEach((childId) => {
      const childWidth = positionNode(
        childId,
        childStartX + nodeRequiredWidths.get(childId)! / 2,
        depth + 1
      );
      childStartX += childWidth + nodeSpacing;
    });

    // 親ノードを配置（子ノードの中央）
    node.position.x = parentX;
    node.position.y = depth * levelSpacing;

    return requiredWidth;
  }

  // 各ルートノードを配置
  let currentRootX = rootStartX;
  rootNodes.forEach((rootNode) => {
    const rootWidth = nodeRequiredWidths.get(rootNode.id)!;
    positionNode(rootNode.id, currentRootX + rootWidth / 2, 0);
    currentRootX += rootWidth + nodeSpacing;
  });

  // 全体を正の座標に移動
  const minX = Math.min(...nodes.map((node) => node.position.x));
  if (minX < 0) {
    const offset = -minX + nodeSpacing;
    nodes.forEach((node) => {
      node.position.x += offset;
    });
  }
}
