import { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { z } from "zod";
import { env } from "../../config/env.js";
import { SESSION_COOKIE_NAME } from "../../plugins/auth.js";
import { logAuditEvent } from "../audit/audit.service.js";

const registerSchema = z.object({
  email: z.string().email().max(255).transform((e) => e.toLowerCase().trim()),
  password: z.string().min(8, "Account password must be at least 8 characters").max(128),
});

const loginSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase().trim()),
  password: z.string().min(1).max(128),
});

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export async function authRoutes(fastify: FastifyInstance) {
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
    signed: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };

  // POST /api/auth/register
  fastify.post(
    "/register",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { email, password } = registerSchema.parse(request.body);

      const existing = await fastify.prisma.user.findUnique({ where: { email } });
      if (existing) {
        return reply.status(409).send({
          error: "EMAIL_IN_USE",
          message: "An account with this email already exists.",
        });
      }

      const passwordHash = await argon2.hash(password, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MiB
        timeCost: 3,
        parallelism: 1,
      });

      const user = await fastify.prisma.user.create({
        data: { email, passwordHash },
        select: { id: true, email: true },
      });

      await logAuditEvent(fastify.prisma, user.id, "REGISTER", request.ip);

      const token = await reply.jwtSign({ id: user.id, email: user.email });
      reply.setCookie(SESSION_COOKIE_NAME, token, cookieOptions);

      return reply.status(201).send({
        user,
        hasVault: false,
      });
    }
  );

  // POST /api/auth/login
  fastify.post(
    "/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (request, reply) => {
      const { email, password } = loginSchema.parse(request.body);

      const user = await fastify.prisma.user.findUnique({
        where: { email },
        include: { vault: { select: { id: true } } },
      });

      if (!user) {
        return reply.status(401).send({
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        });
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        return reply.status(423).send({
          error: "ACCOUNT_LOCKED",
          message: "Account temporarily locked due to repeated failed logins. Try again later.",
        });
      }

      const valid = await argon2.verify(user.passwordHash, password);
      if (!valid) {
        const nextAttempts = user.failedAttempts + 1;
        const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;

        await fastify.prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: nextAttempts,
            lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
          },
        });

        await logAuditEvent(fastify.prisma, user.id, "LOGIN_FAILED", request.ip);

        return reply.status(401).send({
          error: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        });
      }

      // Reset brute-force counters on successful login
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: 0, lockedUntil: null },
      });

      await logAuditEvent(fastify.prisma, user.id, "LOGIN_SUCCESS", request.ip);

      const token = await reply.jwtSign({ id: user.id, email: user.email });
      reply.setCookie(SESSION_COOKIE_NAME, token, cookieOptions);

      return reply.send({
        user: { id: user.id, email: user.email },
        hasVault: user.vault !== null,
      });
    }
  );

  // POST /api/auth/logout
  fastify.post("/logout", async (_request, reply) => {
    reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
    return reply.send({ success: true });
  });

  // GET /api/auth/me
  fastify.get("/me", { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        id: true,
        email: true,
        vault: { select: { id: true, version: true, updatedAt: true } },
      },
    });

    if (!user) {
      reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return reply.status(401).send({ error: "UNAUTHORIZED", message: "Session invalid." });
    }

    return reply.send({
      user: { id: user.id, email: user.email },
      hasVault: user.vault !== null,
      vaultVersion: user.vault?.version ?? null,
    });
  });
}