import type { Request } from "express";
import { db } from "@workspace/db";
import { auditLogs } from "@workspace/db/schema";

interface AuditParams {
  user_id: string;
  user_role: string;
  action: string;
  module: string;
  entity_id?: string | null;
  entity_type?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  device_info?: string;
}

export async function insertAuditLog(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      user_id: params.user_id,
      user_role: params.user_role,
      action: params.action,
      module: params.module,
      entity_id: params.entity_id ?? null,
      entity_type: params.entity_type ?? "",
      details: (params.details ?? {}) as Record<string, unknown>,
      ip_address: params.ip_address ?? "",
      device_info: params.device_info ?? "",
    });
  } catch (err) {
    console.error("Audit log insert failed:", err);
  }
}

export function getIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip ?? "";
}

export function getDevice(req: Request): string {
  return (req.headers["user-agent"] as string) ?? "";
}
