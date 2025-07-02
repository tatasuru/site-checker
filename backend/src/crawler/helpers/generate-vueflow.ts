import { mergeDatasetFiles } from "./merge-file.ts";
import type { VueFlowNode, VueFlowEdge } from "../../types/vueflow.ts";
import fs from "fs/promises";

// VueFlowデータ生成を更新
export async function generateVueFlowData() {
  // マージされたデータを使用
  const allData = await mergeDatasetFiles();

  const nodes: VueFlowNode[] = [];
  const edges: VueFlowEdge[] = [];
  const nodeMap = new Map<string, VueFlowNode>();

  // 重複URLを除去
  const uniqueData = allData.reduce((acc, current) => {
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
