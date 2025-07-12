// Import the framework and instantiate it
import Fastify from "fastify";
import { createClient } from "@supabase/supabase-js";
import { load } from "ts-dotenv";
import cors from "@fastify/cors";
import { seoCheckQueue } from "./queue/supabaseQueue.ts";

/******************************
 * for Supabase initialization
 ******************************/
const env = load(
  {
    SUPABASE_URL: String,
    SUPABASE_KEY: String,
  },
  { path: ".env.local" }
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

/******************************
 * for Fastify initialization
 ******************************/
const server = Fastify();
server.register(cors, {
  // origin: true,
  origin: ["http://localhost:3000", "https://saas-project-khaki.vercel.app"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
});

server.get("/", async (request, reply) => {
  return { message: "Hello, site checker backend with Fastify!" };
});

server.post("/completed-crawler", async (request, reply) => {
  try {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] Webhook受信:`,
      JSON.stringify(request.body, null, 2)
    );
    console.log(
      `[${timestamp}] Headers:`,
      JSON.stringify(request.headers, null, 2)
    );

    // Webhookペイロードの解析
    const payload = request.body as any;
    let jobId = "";

    // ペイロードの基本的な検証
    if (!payload || !payload.record) {
      console.warn(`[${timestamp}] 無効なペイロード: recordが見つかりません`);
      return reply
        .status(400)
        .send({ error: "Invalid payload: missing record" });
    }

    const record = payload.record;

    // 必須フィールドの検証
    if (!record.id || !record.user_id || !record.project_id) {
      console.warn(`[${timestamp}] 無効なペイロード: 必須フィールドが不足`, {
        id: record.id,
        user_id: record.user_id,
        project_id: record.project_id,
      });
      return reply
        .status(400)
        .send({ error: "Invalid payload: missing required fields" });
    }

    if (record.status === "completed") {
      console.log(`[${timestamp}] Crawler completed for record ID:`, record.id);

      // 冪等性チェック: 既に処理済みのwebhookかどうか確認
      const existingJobCheck = await supabase
        .from("seo_check_jobs")
        .select("id, status")
        .eq("crawl_results_id", record.id)
        .eq("user_id", record.user_id);

      if (existingJobCheck.data && existingJobCheck.data.length > 0) {
        const existingJob = existingJobCheck.data[0];
        console.log(
          `[${timestamp}] 重複webhook検出: 既存ジョブ ${existingJob.id} (status: ${existingJob.status})`
        );

        return {
          success: true,
          message: "ジョブは既に処理済みです",
          jobId: existingJob.id,
          duplicate: true,
        };
      }

      // 2.SEOチェックジョブをキューに追加
      jobId = await seoCheckQueue.addJob({
        userId: record.user_id,
        projectId: record.project_id,
        crawlResultDataId: record.id,
      });

      console.log(`[${timestamp}] SEOチェックジョブ作成成功: ${jobId}`);
    } else {
      console.log(
        `[${timestamp}] Webhook受信 (status: ${record.status}) - 処理不要`
      );
    }

    return {
      success: true,
      message: "Webhook処理完了",
      jobId,
      status: record.status,
    };
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] Webhook処理中にエラー:`, error);
    return reply.status(500).send({ error: "Internal Server Error" });
  }
});

/******************************
 * run server
 ******************************/
try {
  server.listen({ port: 5050, host: "0.0.0.0" }, (error, address) => {
    if (error) {
      server.log.error(error);
      process.exit(1);
    }
    console.log(`Server listening at ${address}`);
  });
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
