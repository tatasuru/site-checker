import { Dataset } from "crawlee";
import fs from "fs/promises";
import path from "path";

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

    // 方法2: 手動でファイルを読み込み（フォールバック）
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
