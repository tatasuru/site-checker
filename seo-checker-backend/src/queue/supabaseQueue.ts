import { createClient } from "@supabase/supabase-js";
import { EventEmitter } from "events";
import { load } from "ts-dotenv";
import { executeSeoCheck } from "../seo-checker/index.ts"; // クローラー実行関数

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
    seoCheckResultId: string; // SEOチェック結果データID
  }): Promise<string> {
    console.log("ジョブ追加:", data);

    // 重複チェック: 同じcrawl_results_idで既存のジョブがないか確認
    const { data: existingJob, error: checkError } = await supabase
      .from("seo_check_jobs")
      .select("id, status")
      .eq("crawl_results_id", data.crawlResultDataId)
      .eq("user_id", data.userId)
      .maybeSingle();

    if (checkError) {
      console.error("重複チェック中にエラー:", checkError);
      throw checkError;
    }

    // 既存のジョブが見つかった場合
    if (existingJob) {
      console.log("既存のジョブが見つかりました:", existingJob);
      // pending, running状態のジョブが既にある場合は重複作成を防ぐ
      if (
        existingJob.status === "pending" ||
        existingJob.status === "running"
      ) {
        console.log(
          "既存のアクティブなジョブがあるため、新規作成をスキップ:",
          existingJob.id
        );
        return existingJob.id;
      }
    }

    // 新規ジョブを追加
    const { data: job, error } = await supabase
      .from("seo_check_jobs")
      .insert([
        {
          user_id: data.userId,
          project_id: data.projectId,
          crawl_results_id: data.crawlResultDataId,
          seo_check_results_id: data.seoCheckResultId,
          status: "pending",
          progress: 0,
          error_message: null,
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
      .from("seo_check_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  }

  // ユーザーのジョブ一覧
  async getUserJobs(userId: string) {
    const { data, error } = await supabase
      .from("seo_check_jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  }

  // 進行状況更新
  async updateJobProgress(jobId: string, progress: number) {
    const { error } = await supabase
      .from("seo_check_jobs")
      .update({ progress })
      .eq("id", jobId);

    if (error) throw error;
  }

  // ジョブ完了
  async completeJob(jobId: string, result: any) {
    const { error } = await supabase
      .from("seo_check_jobs")
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
      .from("seo_check_jobs")
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
    if (this.isProcessing) {
      console.log("キュー処理は既に実行中です - スキップ");
      return;
    }

    this.isProcessing = true;
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] キュー処理開始 (処理中ジョブ数: ${this.processingJobs.size}/${this.concurrency})`
    );

    try {
      while (this.processingJobs.size < this.concurrency) {
        // 待機中のジョブを取得
        const { data: jobs, error } = await supabase
          .from("seo_check_jobs")
          .select(
            `*,
              crawl_results!site_check_jobs_crawl_results_id_fkey(
                id,
                site_url,
                total_pages,
                successful_pages,
                crawl_data(
                  page_url,
                  raw_html,
                  status_code,
                  error_message,
                  created_at
                )
              )
            `
          )
          .eq("status", "pending")
          .order("created_at", { ascending: true })
          .limit(1);

        if (error) throw error;
        if (!jobs || jobs.length === 0) {
          console.log(`[${timestamp}] 処理待ちのジョブがありません`);
          break;
        }

        const job = jobs[0];
        console.log(
          `[${timestamp}] 処理するジョブ: ${job.id} (crawl_results_id: ${job.crawl_results_id})`
        );

        // 重複処理防止: 既に処理中でないかチェック
        if (this.processingJobs.has(job.id)) {
          console.warn(
            `[${timestamp}] ジョブ ${job.id} は既に処理中です - スキップ`
          );
          continue;
        }

        // 処理中に設定
        const { error: updateError } = await supabase
          .from("seo_check_jobs")
          .update({
            status: "running",
            started_at: new Date().toISOString(),
          })
          .eq("id", job.id)
          .eq("status", "pending"); // pending状態の場合のみ更新

        if (updateError) {
          console.error(
            `[${timestamp}] ジョブ ${job.id} のステータス更新に失敗:`,
            updateError
          );
          continue;
        }

        // ジョブ処理開始 (非同期)
        this.processJob(job);
      }
    } catch (error) {
      console.error(`[${timestamp}] キュー処理エラー:`, error);
    } finally {
      this.isProcessing = false;
      console.log(`[${timestamp}] キュー処理終了`);
    }
  }

  // 個別ジョブ処理
  private async processJob(job: any) {
    const jobId = job.id;
    const timestamp = new Date().toISOString();

    this.processingJobs.add(jobId);
    console.log(
      `[${timestamp}] ジョブ処理開始: ${jobId} (crawl_results_id: ${job.crawl_results_id})`
    );

    try {
      // 進行状況更新関数
      const updateProgress = async (progress: number) => {
        await this.updateJobProgress(jobId, progress);
        this.emit("jobProgress", { ...job, progress });
        console.log(
          `[${new Date().toISOString()}] ジョブ ${jobId} 進行状況: ${progress}%`
        );
      };

      console.log(`[${timestamp}] ジョブデータ:`, {
        id: job.id,
        project_id: job.project_id,
        crawl_results_id: job.crawl_results_id,
        seo_check_results_id: job.seo_check_results_id,
        user_id: job.user_id,
        crawl_results: job.crawl_results ? "データあり" : "データなし",
      });

      // 初期進行状況: SEOチェック開始
      await updateProgress(10);

      // SEOチェック実行
      console.log(
        `[${new Date().toISOString()}] SEOチェック実行開始: ${jobId}`
      );
      const { averageScore, improvementSuggestions } = await executeSeoCheck({
        projectId: job.project_id,
        crawlResultDataId: job.crawl_results_id,
        crawlData: job.crawl_results.crawl_data,
        seoCheckResultId: job.seo_check_results_id,
      });

      await updateProgress(60);

      const totalScore = averageScore; // 仮のスコア

      await updateProgress(80);

      // SEOチェック結果をSupabaseにアップロード
      console.log(
        `[${new Date().toISOString()}] SEOチェック結果をSupabaseに保存: ${jobId}`
      );
      const { data, error } = await supabase
        .from("seo_check_results")
        .update({
          project_id: job.project_id,
          crawl_results_id: job.crawl_results_id,
          total_score: totalScore,
          meta_score: averageScore,
          improvement_suggestions: improvementSuggestions,
          checked_at: new Date().toISOString(),
        })
        .eq("id", job.seo_check_results_id)
        .select()
        .single();

      console.log(
        `[${new Date().toISOString()}] SEOチェック結果保存完了:`,
        data
      );

      if (error) throw error;

      // 完了
      await this.completeJob(jobId, {
        message: "SEO チェックが終わりました。",
      });

      console.log(`[${new Date().toISOString()}] ジョブ完了: ${jobId}`);
      this.emit("jobCompleted", { ...job, data });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await this.failJob(jobId, errorMessage);

      console.error(
        `[${new Date().toISOString()}] ジョブ失敗: ${jobId}`,
        error
      );
      this.emit("jobFailed", { ...job, error_message: errorMessage });
    } finally {
      this.processingJobs.delete(jobId);
      console.log(
        `[${new Date().toISOString()}] ジョブ処理終了: ${jobId} (処理中ジョブ数: ${
          this.processingJobs.size
        })`
      );

      // 次のジョブ処理 (少し遅延を設ける)
      setTimeout(() => {
        console.log(
          `[${new Date().toISOString()}] 次のキュー処理をスケジュール`
        );
        this.processQueue();
      }, 1000);
    }
  }

  // 定期的なキュー確認
  startPeriodicCheck() {
    setInterval(() => {
      this.processQueue();
    }, 30000); // 30秒ごと
  }
}

export const seoCheckQueue = new SupabaseQueue();

// サーバー起動時に定期チェック開始
seoCheckQueue.startPeriodicCheck();
