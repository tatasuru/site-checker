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
  return { message: "Hello, Fastify!" };
});

server.post("/create-crawl-data", async (request, reply) => {
  const { name, description, siteUrl, userId, numberOfCrawlPage } =
    request.body as {
      name: string; // サイト名
      description?: string; // サイトの説明（オプション）
      siteUrl: string; // クロールするサイトのURL
      userId: string; // ユーザーID
      numberOfCrawlPage?: string; //何ページクロールするか
    };

  console.log("Received data:", {
    name,
    description,
    siteUrl,
    userId,
    numberOfCrawlPage,
  });

  try {
    // 1. プロジェクト作成(supabaseに保存)
    const { data: projectData, error: projectError } = await supabase
      .from("site_projects")
      .insert([
        {
          user_id: userId,
          name: name,
          description: description || "",
          site_url: siteUrl,
          max_pages: numberOfCrawlPage || "20",
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

    console.log("① Project created:", projectData);

    // 2. ジョブをキューに追加
    const jobId = await crawlQueue.addJob({
      projectId: projectData.id, // プロジェクトIDを使用
      name,
      siteUrl,
      userId,
      numberOfCrawlPage,
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
