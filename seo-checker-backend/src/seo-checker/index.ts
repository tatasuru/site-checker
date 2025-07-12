export async function executeSeoCheck({
  projectId,
  crawlResultDataId,
  crawlData,
}: {
  projectId: string;
  crawlResultDataId: string;
  crawlData: string;
}) {
  console.log("SEOチェックを実行中...");

  // TODO: seo_meta_detailsに結果を保存する処理を実装

  return {
    message: "SEO check completed successfully!",
    projectId,
    crawlResultDataId,
    crawlData,
  };
}
