import { createClient } from "@supabase/supabase-js";
import { load } from "ts-dotenv";
import { JSDOM } from "jsdom"; // 追加

/************************
 * types
 ************************/
interface SeoCheckResult {
  seo_check_results_id: string; // クロール結果データID
  page_url: string;
  title_text: string;
  title_length: number;
  title_has_keywords: boolean;
  meta_description_text: string;
  meta_description_length: number;
  canonical_url: string;
  og_tags: {
    og_title: string;
    og_description: string;
    og_image: string;
  };
  twitter_cards: {
    twitter_title: string;
    twitter_description: string;
    twitter_image: string;
  };
  keywords: string[];
  score: number;
}

interface CrawlData {
  page_url: string;
  raw_html: string;
  status_code: number;
  error_massage?: string;
  created_at: string;
}

type TitleCheckResult = Pick<
  SeoCheckResult,
  "title_text" | "title_length" | "title_has_keywords"
>;

type DescriptionCheckResult = Pick<
  SeoCheckResult,
  "meta_description_text" | "meta_description_length"
>;

/************************************
 * Supabaseクライアントの初期化
 ************************************/
const env = load(
  {
    SUPABASE_URL: String,
    SUPABASE_KEY: String,
  },
  { path: ".env.local" }
);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

/************************************************
 * タイトルのチェック関数
 *************************************************/
async function checkMetaTitle(doc: Document): Promise<TitleCheckResult> {
  try {
    const titleElement = doc.querySelector("title");

    if (!titleElement) {
      console.warn("タイトル要素が見つかりませんでした。");
    }

    const titleText = titleElement?.textContent || "";
    const titleLength = titleText.length;
    console.log("タイトル:", titleText, "長さ:", titleLength);

    return {
      title_text: titleElement ? titleElement.textContent || "" : "",
      title_length: titleElement ? titleElement.textContent?.length || 0 : 0,
      title_has_keywords: checkTitleHasMetaKeywords(doc, titleText),
    };
  } catch (error) {
    console.error("タイトルチェック中にエラー:", error);
    return {
      title_text: "",
      title_length: 0,
      title_has_keywords: false,
    };
  }
}
function checkTitleHasMetaKeywords(doc: Document, title: string): boolean {
  const metaKeywords = doc
    .querySelector('meta[name="keywords"]')
    ?.getAttribute("content");
  if (!metaKeywords) return false;

  const keywords = metaKeywords.split(",").map((k) => k.trim().toLowerCase());
  const titleLower = title.toLowerCase();

  return keywords.some((keyword) => titleLower.includes(keyword));
}

/************************************************
 * デスクリプションのチェック関数
 *************************************************/
async function checkMetaDescription(
  doc: Document
): Promise<DescriptionCheckResult> {
  try {
    const metaDescription = doc.querySelector('meta[name="description"]');

    if (!metaDescription) {
      console.warn("メタデスクリプションが見つかりませんでした。");
      return {
        meta_description_text: "",
        meta_description_length: 0,
      };
    }

    // content属性から値を取得
    const descriptionText = metaDescription.getAttribute("content") || "";
    const descriptionLength = descriptionText.length;

    return {
      meta_description_text: descriptionText,
      meta_description_length: descriptionLength,
    };
  } catch (error) {
    console.error("メタデスクリプションチェック中にエラー:", error);
    return {
      meta_description_text: "",
      meta_description_length: 0,
    };
  }
}

/************************************************
 * Canonical URLのチェック関数
 *************************************************/
async function checkCanonicalUrl(
  doc: Document
): Promise<Pick<SeoCheckResult, "canonical_url">> {
  const canonicalLink = doc.querySelector('link[rel="canonical"]');
  if (canonicalLink) {
    return {
      canonical_url: canonicalLink.getAttribute("href") || "",
    };
  }
  console.warn("Canonical URLが見つかりませんでした。");
  return {
    canonical_url: "",
  };
}

/************************************************
 * Open Graphタグのチェック関数
 *************************************************/
async function checkOpenGraphTags(doc: Document): Promise<{
  og_title: string;
  og_description: string;
  og_image: string;
}> {
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  const ogDescription = doc.querySelector('meta[property="og:description"]');
  const ogImage = doc.querySelector('meta[property="og:image"]');

  return {
    og_title: ogTitle ? ogTitle.getAttribute("content") || "" : "",
    og_description: ogDescription
      ? ogDescription.getAttribute("content") || ""
      : "",
    og_image: ogImage ? ogImage.getAttribute("content") || "" : "",
  };
}

/************************************************
 * Twitterカードのチェック関数
 *************************************************/
async function checkTwitterCards(
  doc: Document
): Promise<Pick<SeoCheckResult, "twitter_cards">> {
  try {
    const twitterTitle = doc.querySelector('meta[name="twitter:title"]');
    const twitterDescription = doc.querySelector(
      'meta[name="twitter:description"]'
    );
    const twitterImage = doc.querySelector('meta[name="twitter:image"]');

    return {
      twitter_cards: {
        twitter_title: twitterTitle?.getAttribute("content") || "",
        twitter_description: twitterDescription?.getAttribute("content") || "",
        twitter_image: twitterImage?.getAttribute("content") || "",
      },
    };
  } catch (error) {
    console.error("Twitterカードチェック中にエラー:", error);
    return {
      twitter_cards: {
        twitter_title: "",
        twitter_description: "",
        twitter_image: "",
      },
    };
  }
}

/************************************************
 * keywordsの抽出関数
 *************************************************/
function extractKeywords(doc: Document): Pick<SeoCheckResult, "keywords"> {
  const metaKeywords = doc
    .querySelector('meta[name="keywords"]')
    ?.getAttribute("content");

  if (!metaKeywords) {
    return { keywords: [] };
  }

  const keywordList = metaKeywords
    .split(",")
    .map((keyword) => keyword.trim().toLowerCase())
    .filter((keyword) => keyword.length > 0);

  return { keywords: keywordList };
}

/************************************************
 * scoreの計算関数
 ************************************************/
function calculateScore({
  titleCheckResult,
  descriptionCheckResult,
  canonicalUrlCheckResult,
  ogTagsCheckResult,
  twitterCardsCheckResult,
  keywordsCheckResult,
}: {
  titleCheckResult: TitleCheckResult;
  descriptionCheckResult: DescriptionCheckResult;
  canonicalUrlCheckResult: Pick<SeoCheckResult, "canonical_url">;
  ogTagsCheckResult: {
    og_title: string;
    og_description: string;
    og_image: string;
  };
  twitterCardsCheckResult: Pick<SeoCheckResult, "twitter_cards">;
  keywordsCheckResult: Pick<SeoCheckResult, "keywords">;
}): number {
  // 満点は100点とする
  let score = 100;

  // タイトルのチェック
  if (!titleCheckResult.title_text) score -= 20;

  // デスクリプションのチェック
  if (!descriptionCheckResult.meta_description_text) score -= 20;

  // Canonical URLのチェック
  if (!canonicalUrlCheckResult.canonical_url) score -= 15;

  // Open Graphタグのチェック
  if (!ogTagsCheckResult.og_title) score -= 15;

  // Twitterカードのチェック
  if (!twitterCardsCheckResult.twitter_cards.twitter_title) score -= 15;

  // キーワードのチェック
  if (keywordsCheckResult.keywords.length === 0) {
    score -= 15;
  } else {
    // キーワードが存在する場合、タイトルに含まれているかチェック
    const titleLower = titleCheckResult.title_text.toLowerCase();
    const hasKeywords = keywordsCheckResult.keywords.some((keyword) =>
      titleLower.includes(keyword)
    );
    if (!hasKeywords) {
      score -= 10; // キーワードがタイトルに含まれていない場合は減点
    }
  }

  return Math.max(score, 0); // スコアは0以上に制限
}

/************************************************
 * 改善メッセージの生成関数
 ************************************************/
function generateImprovementMessage(score: number): string {
  if (score >= 90) {
    return "素晴らしい！SEO対策はほぼ完璧です。";
  } else if (score >= 75) {
    return "良好ですが、いくつかの改善点があります。";
  } else if (score >= 50) {
    return "改善の余地があります。特にタイトルとデスクリプションを見直してください。";
  } else {
    return "SEO対策が不十分です。全体的な見直しをお勧めします。";
  }
}

/************************************************
 * SEOチェックを実行する関数
 *************************************************/
export async function executeSeoCheck({
  projectId,
  crawlResultDataId,
  crawlData,
  seoCheckResultId,
}: {
  projectId: string;
  crawlResultDataId: string;
  crawlData: CrawlData[];
  seoCheckResultId: string; // SEOチェック結果データID
}): Promise<{
  averageScore: number;
  improvementSuggestions: string;
}> {
  try {
    console.log("SEOチェックを実行中...");
    const seoMetaResults: SeoCheckResult[] = [];
    const rawHTMLsAndPageUrl: {
      pageUrl: string;
      rawHTML: string;
    }[] = [];

    console.log("プロジェクトID:", projectId);
    console.log("クロール結果データID:", crawlResultDataId);
    console.log("クロールデータ:", crawlData);

    // 1. rawHTMLデータをcrawlDataから取り出す。
    crawlData.map((item: CrawlData) => {
      rawHTMLsAndPageUrl.push({
        pageUrl: item.page_url,
        rawHTML: item.raw_html,
      });
    });

    // 2. rawHTMLを解析してSEOメタ情報を抽出する。
    for (const item of rawHTMLsAndPageUrl) {
      const { pageUrl, rawHTML } = item;
      const dom = new JSDOM(rawHTML);
      const doc = dom.window.document;

      console.log("ページURL:", pageUrl);
      console.log("解析中のHTML:", rawHTML.slice(0, 100) + "...");

      // 1. タイトルのチェック
      const titleCheckResult = await checkMetaTitle(doc);

      // 2. デスクリプションのチェック
      const descriptionCheckResult = await checkMetaDescription(doc);

      // 3. Canonical URLのチェック
      const canonicalUrlCheckResult = await checkCanonicalUrl(doc);

      // 4. Open Graphタグのチェック
      const ogTagsCheckResult = await checkOpenGraphTags(doc);

      // 5. Twitterカードのチェック
      const twitterCardsCheckResult = await checkTwitterCards(doc);

      // 6. キーワードの抽出
      const keywordsCheckResult = extractKeywords(doc);

      // 7. スコアの計算
      const score = calculateScore({
        titleCheckResult,
        descriptionCheckResult,
        canonicalUrlCheckResult,
        ogTagsCheckResult,
        twitterCardsCheckResult,
        keywordsCheckResult,
      });

      // 7. 結果をSupabaseに保存
      const { data, error } = await supabase
        .from("seo_meta_details")
        .insert({
          seo_check_results_id: seoCheckResultId,
          page_url: pageUrl,
          title_text: titleCheckResult.title_text,
          title_length: titleCheckResult.title_length,
          title_has_keywords: titleCheckResult.title_has_keywords,
          meta_description_text: descriptionCheckResult.meta_description_text,
          meta_description_length:
            descriptionCheckResult.meta_description_length,
          canonical_url: canonicalUrlCheckResult.canonical_url,
          og_tags: ogTagsCheckResult,
          twitter_cards: twitterCardsCheckResult.twitter_cards,
          keywords: keywordsCheckResult.keywords,
          score: score,
        })
        .select()
        .single();

      // 8 seoMetaResultsに結果を追加
      seoMetaResults.push({
        seo_check_results_id: seoCheckResultId,
        page_url: pageUrl,
        title_text: titleCheckResult.title_text,
        title_length: titleCheckResult.title_length,
        title_has_keywords: titleCheckResult.title_has_keywords,
        meta_description_text: descriptionCheckResult.meta_description_text,
        meta_description_length: descriptionCheckResult.meta_description_length,
        canonical_url: canonicalUrlCheckResult.canonical_url,
        og_tags: ogTagsCheckResult,
        twitter_cards: twitterCardsCheckResult.twitter_cards,
        keywords: keywordsCheckResult.keywords,
        score: score,
      });

      if (error) {
        console.error("Supabaseへの保存中にエラー:", error);
        throw error;
      }

      console.log("SEOメタ情報をSupabaseに保存:", data);
    }

    // 9. page_urlごとにSEOチェックscoreを合算し、平均を出す。
    const totalScore = seoMetaResults.reduce(
      (sum, result) => sum + result.score,
      0
    );
    const averageScore = Number(
      (totalScore / seoMetaResults.length).toFixed(2)
    );

    console.log("SEOチェックが完了しました。結果:", seoMetaResults);
    console.log("平均スコア:", averageScore);
    return {
      averageScore,
      improvementSuggestions: generateImprovementMessage(averageScore),
    };
  } catch (error) {
    console.error("SEOチェック中にエラー:", error);
    throw new Error("SEOチェックに失敗しました。");
  }
}
