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
  // 同時実行数: 現在は1にして、リクエストが多い時でも順次処理されるようにする
  private concurrency = 1;
  private processingJobs = new Set<string>();

  // ジョブ追加（Supabaseに保存）
  async addJob(data: {
    userId: string;
    projectId: string; // プロジェクトID
    crawlResultDataId: string; // クロール結果データID
    maxPages?: number; // クロールするページ数（オプション）
  }): Promise<string> {
    console.log("ジョブ追加:", data);
    const { data: job, error } = await supabase
      .from("crawl_jobs")
      .insert([
        {
          user_id: data.userId,
          project_id: data.projectId,
          crawl_results_id: data.crawlResultDataId,
          status: "pending",
          progress: 0,
          error_message: null,
          max_pages: data.maxPages || null, // デフォルトは20ページ
        },
      ])
      .select()
      .single();

    if (error) throw error;

    console.log("ジョブ追加成功:", job);

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
          .select(
            `*,
            crawl_results!crawl_jobs_crawl_results_id_fkey(
              site_url,
              project_id,
              status,
              total_pages,
              successful_pages,
              failed_pages
            )
          `
          )
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(1);

        if (error) throw error;
        if (!jobs || jobs.length === 0) break;

        const job = jobs[0];

        // 処理中に設定
        await supabase
          .from("crawl_jobs")
          .update({
            status: "running",
            started_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        // crawl_resultsのステータスも更新
        await supabase
          .from("crawl_results")
          .update({ status: "in_progress" })
          .eq("id", job.crawl_results_id);

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
      console.log(`ジョブ処理開始: ${jobId} - ${job.crawl_results.site_url}`);

      // 進行状況更新関数
      const updateProgress = async (progress: number) => {
        await this.updateJobProgress(jobId, progress);
        this.emit("jobProgress", { ...job, progress });
      };

      // 初期進行状況: クロール開始
      await updateProgress(10);
      await executeCrawler(
        job.crawl_results.site_url, // クロールするサイトURL
        job.max_pages, // クロールするページ数
        job.user_id, // ユーザーID
        job.project_id, // プロジェクトID
        job.crawl_results_id // クロール結果データID
      );

      // クロール成果物のマージ
      await updateProgress(60);
      const allData = await mergeDatasetFiles();

      // VueFlowデータ生成とSupabaseへのアップロード
      await updateProgress(80);
      const vueFlowData = await generateVueFlowData(allData);
      const { data, error } = await supabase
        .from("crawl_results")
        .update({
          project_id: job.project_id,
          site_url: job.site_url,
          status: "completed",
          total_pages: allData.length,
          successful_pages: allData.filter((item) => item.statusCode === 200)
            .length,
          failed_pages: allData.filter((item) => item.statusCode !== 200)
            .length,
          is_latest: true,
          completed_at: new Date().toISOString(),
          // TODO: ここで生成したデータを保存する
          // crawl_data: JSON.stringify(allData),
          // sitemap_data: JSON.stringify(vueFlowData),
        })
        .eq("id", job.crawl_results_id)
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
