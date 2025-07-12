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
