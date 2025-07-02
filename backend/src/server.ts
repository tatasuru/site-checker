// Import the framework and instantiate it
import Fastify from "fastify";
import cors from "@fastify/cors";
import multiPart from "@fastify/multipart";
import { CrawlAndCreateVueFlowFile } from "./crawler/index.ts";

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
  const { siteUrl, userId, numberOfCrawlPage } = request.body as {
    siteUrl: string; // クロールするサイトのURL
    userId: string; // ユーザーID
    numberOfCrawlPage?: string; //何ページクロールするか
  };

  try {
    // クローラーを実行してVueFlowデータを生成
    const data = await CrawlAndCreateVueFlowFile(
      siteUrl,
      userId,
      numberOfCrawlPage
    );
    return data;
  } catch (error) {
    server.log.error(error);
    reply.status(500).send({ error: "Failed to create crawl data." });
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
