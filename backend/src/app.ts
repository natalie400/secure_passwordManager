import Fastify from "fastify";
import dbPlugin from "./plugins/db.js";
import securityPlugin from "./plugins/security.js";
import authPlugin from "./plugins/auth.js";
import errorHandlerPlugin from "./plugins/errorHandler.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { vaultRoutes } from "./modules/vault/vault.routes.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
    bodyLimit: 1024 * 1024, // 1 MB max payload size for encrypted vault blobs
  });

  await app.register(errorHandlerPlugin);
  await app.register(securityPlugin);
  await app.register(dbPlugin);
  await app.register(authPlugin);

  app.get("/api/health", async () => ({ status: "ok" }));

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(vaultRoutes, { prefix: "/api/vault" });

  return app;
}