import { PrismaClient } from "@prisma/client";

export type AuditAction =
  | "REGISTER"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "VAULT_CREATED"
  | "VAULT_UPDATED"
  | "VAULT_DELETED";

export async function logAuditEvent(
  prisma: PrismaClient,
  userId: string,
  action: AuditAction,
  ipAddress?: string
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      ipAddress: ipAddress ?? null,
    },
  });
}