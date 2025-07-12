// Import the framework and instantiate it
import Fastify from "fastify";
import { createClient } from "@supabase/supabase-js";
import { load } from "ts-dotenv";
import cors from "@fastify/cors";

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
    console.log("Webhook受信:", JSON.stringify(request.body, null, 2));
    console.log("Headers:", JSON.stringify(request.headers, null, 2));

    // Webhookペイロードの解析
    const payload = request.body as any;

    if (payload && payload.record && payload.record.status) {
      if (payload.record.status === "completed") {
        console.log("Crawler completed for record ID:", payload.record.id);
      }
    }

    return reply.status(200).send({
      message: "Webhook received successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Webhook処理中にエラー:", error);
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
