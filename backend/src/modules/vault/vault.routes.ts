import { FastifyInstance } from "fastify";
import { z } from "zod";
import { logAuditEvent } from "../audit/audit.service.js";

// Validates that `repr` is valid JSON matching Keychain.dump() structure: { salt, check, kvs }
const keychainReprSchema = z.string().refine((val) => {
  try {
    const parsed = JSON.parse(val);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.salt === "string" &&
      typeof parsed.check === "object" &&
      parsed.check !== null &&
      typeof parsed.check.iv === "string" &&
      typeof parsed.check.ct === "string" &&
      typeof parsed.kvs === "object" &&
      parsed.kvs !== null
    );
  } catch {
    return false;
  }
}, "Invalid Keychain representation structure");

const createVaultSchema = z.object({
  repr: keychainReprSchema,
  checksum: z.string().min(32).max(128),
});

const updateVaultSchema = z.object({
  repr: keychainReprSchema,
  checksum: z.string().min(32).max(128),
  expectedVersion: z.number().int().positive(),
});

export async function vaultRoutes(fastify: FastifyInstance) {
  // All vault routes require an authenticated session
  fastify.addHook("preHandler", fastify.authenticate);

  // GET /api/vault
  fastify.get("/", async (request, reply) => {
    const vault = await fastify.prisma.vault.findUnique({
      where: { userId: request.user.id },
      select: {
        repr: true,
        checksum: true,
        version: true,
        updatedAt: true,
      },
    });

    if (!vault) {
      return reply.status(404).send({
        error: "VAULT_NOT_FOUND",
        message: "No vault exists for this account yet.",
      });
    }

    return reply.send(vault);
  });

  // POST /api/vault (Initial creation via Vault.create)
  fastify.post("/", async (request, reply) => {
    const { repr, checksum } = createVaultSchema.parse(request.body);

    const existing = await fastify.prisma.vault.findUnique({
      where: { userId: request.user.id },
    });

    if (existing) {
      return reply.status(409).send({
        error: "VAULT_ALREADY_EXISTS",
        message: "A vault already exists for this account. Use PUT to update it.",
      });
    }

    const vault = await fastify.prisma.vault.create({
      data: {
        userId: request.user.id,
        repr,
        checksum,
        version: 1,
      },
      select: {
        version: true,
        updatedAt: true,
      },
    });

    await logAuditEvent(fastify.prisma, request.user.id, "VAULT_CREATED", request.ip);

    return reply.status(201).send(vault);
  });

  // PUT /api/vault (Atomic update via vault.persist)
  fastify.put("/", async (request, reply) => {
    const { repr, checksum, expectedVersion } = updateVaultSchema.parse(request.body);

    // Atomic compare-and-swap on `version` to prevent stale tab overwrites
    const updated = await fastify.prisma.vault.updateMany({
      where: {
        userId: request.user.id,
        version: expectedVersion,
      },
      data: {
        repr,
        checksum,
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      const current = await fastify.prisma.vault.findUnique({
        where: { userId: request.user.id },
        select: { version: true },
      });

      if (!current) {
        return reply.status(404).send({
          error: "VAULT_NOT_FOUND",
          message: "No vault exists for this account.",
        });
      }

      return reply.status(409).send({
        error: "VERSION_CONFLICT",
        message: "The vault was updated in another session. Please reload and unlock again.",
        currentVersion: current.version,
      });
    }

    const latest = await fastify.prisma.vault.findUniqueOrThrow({
      where: { userId: request.user.id },
      select: { version: true, updatedAt: true },
    });

    await logAuditEvent(fastify.prisma, request.user.id, "VAULT_UPDATED", request.ip);

    return reply.send(latest);
  });

  // DELETE /api/vault (Reset vault)
  fastify.delete("/", async (request, reply) => {
    const deleted = await fastify.prisma.vault.deleteMany({
      where: { userId: request.user.id },
    });

    if (deleted.count === 0) {
      return reply.status(404).send({
        error: "VAULT_NOT_FOUND",
        message: "No vault found to delete.",
      });
    }

    await logAuditEvent(fastify.prisma, request.user.id, "VAULT_DELETED", request.ip);

    return reply.send({ success: true });
  });
}