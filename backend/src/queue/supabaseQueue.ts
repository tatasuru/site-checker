import { createClient } from "@supabase/supabase-js";
import { EventEmitter } from "events";
import { load } from "ts-dotenv";
import {
  executeCrawler,
  mergeDatasetFiles,
  generateVueFlowData,
} from "../crawler/index.ts"; // クローラー実行関数

const env = load(
  {
    SUPABASE_URL: String,
    SUPABASE_KEY: String,
  },
  { path: ".env.local" }
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

class SupabaseQueue extends EventEmitter {
  private isProcessing = false;
  private concurrency = 3;
  private processingJobs = new Set<string>();

  // ジョブ追加（Supabaseに保存）
  async addJob(data: {
    siteName: string;
    siteUrl: string;
    userId: string;
    numberOfCrawlPage?: string;
  }): Promise<string> {
    console.log("ジョブ追加:", data);
    const { data: job, error } = await supabase
      .from("crawl_jobs")
      .insert([
        {
          user_id: data.userId,
          site_name: data.siteName,
          site_url: data.siteUrl,
          number_of_crawl_page: data.numberOfCrawlPage,
          result: null,
          error_message: null,
          status: "waiting",
          progress: 0,
        },
      ])
      .select()
      .single();

    // crawl_resultsテーブルにジョブIDを追加する
    if (job) {
      await supabase.from("crawl_results").insert({
        user_id: data.userId,
        job_id: job.id,
        site_name: data.siteName,
        site_url: data.siteUrl,
        crawl_data: null, // 初期はnull、後で更新
        sitemap_data: null, // 初期はnull、後で更新
        number_of_crawl_page: data.numberOfCrawlPage
          ? parseInt(data.numberOfCrawlPage)
          : 0,
      });
    }

    console.log("ジョブ追加結果:", job, error);

    if (error) throw error;

    console.log(`ジョブ追加: ${job.id} - ${data.siteUrl}`);

    // 処理開始
    this.processQueue();

    return job.id;
  }

  // ジョブ取得
  async getJob(jobId: string) {
    const { data, error } = await supabase
      .from("crawl_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  // ユーザーのジョブ一覧
  async getUserJobs(userId: string) {
    const { data, error } = await supabase
      .from("crawl_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  // 進行状況更新
  async updateJobProgress(jobId: string, progress: number) {
    const { error } = await supabase
      .from("crawl_jobs")
      .update({ progress })
      .eq("id", jobId);

    if (error) throw error;
  }

  // ジョブ完了
  async completeJob(jobId: string, result: any) {
    const { error } = await supabase
      .from("crawl_jobs")
      .update({
        status: "completed",
        progress: 100,
        result,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) throw error;
  }

  // ジョブ失敗
  async failJob(jobId: string, errorMessage: string) {
    const { error } = await supabase
      .from("crawl_jobs")
      .update({
        status: "failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (error) throw error;
  }

  // キュー処理
  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.processingJobs.size < this.concurrency) {
        // 待機中のジョブを取得
        const { data: jobs, error } = await supabase
          .from("crawl_jobs")
          .select("*")
          .eq("status", "waiting")
          .order("created_at", { ascending: true })
          .limit(1);

        if (error) throw error;
        if (!jobs || jobs.length === 0) break;

        const job = jobs[0];

        // 処理中に設定
        await supabase
          .from("crawl_jobs")
          .update({
            status: "processing",
            started_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        // ジョブ処理開始
        this.processJob(job);
      }
    } catch (error) {
      console.error("キュー処理エラー:", error);
    }

    this.isProcessing = false;
  }

  // 個別ジョブ処理
  private async processJob(job: any) {
    const jobId = job.id;
    this.processingJobs.add(jobId);

    try {
      console.log(`ジョブ処理開始: ${jobId} - ${job.site_url}`);

      // 進行状況更新関数
      const updateProgress = async (progress: number) => {
        await this.updateJobProgress(jobId, progress);
        this.emit("jobProgress", { ...job, progress });
      };

      // 初期進行状況: クロール開始
      await updateProgress(10);
      await executeCrawler(job.site_url, job.number_of_crawl_page);

      // クロール成果物のマージ
      await updateProgress(60);
      const allData = await mergeDatasetFiles();

      // VueFlowデータ生成とSupabaseへのアップロード
      await updateProgress(80);
      const vueFlowData = await generateVueFlowData(allData);
      const { data, error } = await supabase
        .from("crawl_results")
        .update({
          crawl_data: JSON.stringify(allData),
          sitemap_data: JSON.stringify(vueFlowData),
          number_of_crawl_page: allData.length,
        })
        .eq("job_id", jobId)
        .select();

      console.log("クロール結果アップロード:", data, error);

      if (error) throw error;

      // 完了
      const result = { message: "クロール処理が完了しました" };
      await this.completeJob(jobId, result);

      console.log(`ジョブ完了: ${jobId}`);
      this.emit("jobCompleted", { ...job, result, data });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await this.failJob(jobId, errorMessage);

      console.error(`ジョブ失敗: ${jobId}`, error);
      this.emit("jobFailed", { ...job, error_message: errorMessage });
    } finally {
      this.processingJobs.delete(jobId);

      // 次のジョブ処理
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  // 定期的なキュー確認
  startPeriodicCheck() {
    setInterval(() => {
      this.processQueue();
    }, 30000); // 30秒ごと
  }
}

export const crawlQueue = new SupabaseQueue();

// サーバー起動時に定期チェック開始
crawlQueue.startPeriodicCheck();
