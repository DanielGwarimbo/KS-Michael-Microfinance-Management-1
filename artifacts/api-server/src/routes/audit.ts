import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogs, userProfiles } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Only admin/manager can view audit logs
router.get(
  "/audit",
  requireRole("admin", "manager"),
  async (req, res) => {
    try {
      const { module: mod, from, to } = req.query as Record<string, string>;

      const rows = await db
        .select({
          id: auditLogs.id,
          user_id: auditLogs.user_id,
          user_role: auditLogs.user_role,
          action: auditLogs.action,
          module: auditLogs.module,
          entity_id: auditLogs.entity_id,
          entity_type: auditLogs.entity_type,
          details: auditLogs.details,
          ip_address: auditLogs.ip_address,
          device_info: auditLogs.device_info,
          created_at: auditLogs.created_at,
          user_name: userProfiles.full_name,
        })
        .from(auditLogs)
        .leftJoin(userProfiles, eq(auditLogs.user_id, userProfiles.id))
        .orderBy(desc(auditLogs.created_at));

      let result = rows;
      if (mod) result = result.filter((r) => r.module === mod);
      if (from) result = result.filter((r) => r.created_at >= new Date(from));
      if (to) result = result.filter((r) => r.created_at <= new Date(to + "T23:59:59"));

      res.json(result.map((r) => ({ ...r, user: { full_name: r.user_name } })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load audit logs" });
    }
  },
);

export default router;
