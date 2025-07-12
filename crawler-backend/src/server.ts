// Import the framework and instantiate it
import Fastify from "fastify";
import { createClient } from "@supabase/supabase-js";
import { load } from "ts-dotenv";
import cors from "@fastify/cors";
import multiPart from "@fastify/multipart";
import { crawlQueue } from "./queue/supabaseQueue.ts";

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
//  for file upload
// server.register(multiPart, {
//   attachFieldsToBody: "keyValues",
//   limits: {
//     fileSize: 2147483648, // ファイルサイズの制限 (50MB)
//     fieldSize: 2147483648, // フィールドサイズの制限 (50MB)
//   },
// });

server.get("/", async (request, reply) => {
  return { message: "Hello, crawler backend with Fastify!" };
});

server.post("/create-crawl-data", async (request, reply) => {
  const { name, description, siteUrl, userId, maxPages } = request.body as {
    name: string; // サイト名
    description?: string; // サイトの説明（オプション）
    siteUrl: string; // クロールするサイトのURL
    userId: string; // ユーザーID
    maxPages?: number | null; //何ページクロールするか
  };

  console.log("0. Received data:", {
    name,
    description,
    siteUrl,
    userId,
    maxPages,
  });

  try {
    // 1. プロジェクト作成(supabaseに保存)
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .insert([
        {
          user_id: userId,
          name: name,
          description: description || "",
          site_url: siteUrl,
          // TODO: maxPagesのデフォルト値を設定してるが本番ではnullにする
          max_pages: maxPages ? maxPages : 20,
        },
      ])
      .select()
      .single();

    if (projectError || !projectData) {
      console.error("Error inserting project:", projectError);
      return reply.status(500).send({
        error: "Failed to create project.",
        details: projectError?.message || "No data returned",
      });
    }

    console.log("1. Project created:", projectData);

    // 2. crawl_resultsを作成（クロール開始前に準備）
    const { data: crawlResultData, error: crawlResultError } = await supabase
      .from("crawl_results")
      .insert([
        {
          project_id: projectData.id,
          site_url: siteUrl,
          status: "waiting", // 初期状態は「waiting」
          total_pages: 0,
          successful_pages: 0,
          failed_pages: 0,
          is_latest: true,
          started_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (crawlResultError) throw crawlResultError;

    console.log("2. Crawl result created:", crawlResultData);

    // 3. ジョブをキューに追加
    const jobId = await crawlQueue.addJob({
      userId,
      projectId: projectData.id, // プロジェクトIDを使用
      crawlResultDataId: crawlResultData.id, // クロール結果データIDを使用
      maxPages: maxPages ? maxPages : 20, // クロールするページ数
    });

    return {
      success: true,
      message: "クロールジョブが開始されました",
      jobId,
    };
  } catch (error) {
    server.log.error(error);
    reply.status(500).send({
      error: "Failed to queue crawl job.",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

server.get("/crawl-status/:jobId", async (request, reply) => {
  const { jobId } = request.params as { jobId: string };

  try {
    const job = await crawlQueue.getJob(jobId);

    if (!job) {
      return reply.status(404).send({ error: "ジョブが見つかりません" });
    }

    return job;
  } catch (error) {
    server.log.error(error);
    reply.status(500).send({ error: "Failed to get job status." });
  }
});

server.get("/user-crawl-jobs/:userId", async (request, reply) => {
  const { userId } = request.params as { userId: string };

  try {
    const jobs = await crawlQueue.getUserJobs(userId);
    return { jobs };
  } catch (error) {
    server.log.error(error);
    reply.status(500).send({ error: "Failed to get user jobs." });
  }
});

/******************************
 * run server
 ******************************/
try {
  server.listen({ port: 8080, host: "0.0.0.0" }, (error, address) => {
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
