// Import the framework and instantiate it
import Fastify from "fastify";
import cors from "@fastify/cors";
import multiPart from "@fastify/multipart";
import { crawlQueue } from "./queue/supabaseQueue.ts";

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
  const { siteName, siteUrl, userId, numberOfCrawlPage } = request.body as {
    siteName: string; // サイト名
    siteUrl: string; // クロールするサイトのURL
    userId: string; // ユーザーID
    numberOfCrawlPage?: string; //何ページクロールするか
  };

  console.log("Received data:", {
    siteName,
    siteUrl,
    userId,
    numberOfCrawlPage,
  });

  try {
    const jobId = await crawlQueue.addJob({
      siteName,
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
