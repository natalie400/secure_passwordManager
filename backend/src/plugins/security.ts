import fp from "fastify-plugin";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "../config/env.js";

export default fp(async (fastify) => {
  await fastify.register(helmet, {
    contentSecurityPolicy: false, // API-only server; CSP is handled by frontend
  });

  await fastify.register(cors, {
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });
});