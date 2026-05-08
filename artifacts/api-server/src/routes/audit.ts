import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogs, userProfiles } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/audit", async (req, res) => {
  const { module: mod, from, to, action, scope } = req.query as Record<string, string>;

  // scope=self: any authenticated user can view their own last 10 entries
  if (scope === "self") {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: "Not authenticated" });
        return;
      }

      const rows = await db
        .select({
          id: auditLogs.id,
          action: auditLogs.action,
          module: auditLogs.module,
          entity_id: auditLogs.entity_id,
          entity_type: auditLogs.entity_type,
          details: auditLogs.details,
          created_at: auditLogs.created_at,
        })
        .from(auditLogs)
        .where(eq(auditLogs.user_id, userId))
        .orderBy(desc(auditLogs.created_at))
        .limit(10);

      res.json(rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load recent activity" });
    }
    return;
  }

  // Full audit log: admin/manager only
  const roleName = req.user?.role_name as string | undefined;
  if (roleName !== "admin" && roleName !== "manager") {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }

  try {
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
    if (action) result = result.filter((r) => r.action === action);
    if (from) result = result.filter((r) => r.created_at >= new Date(from));
    if (to) result = result.filter((r) => r.created_at <= new Date(to + "T23:59:59"));

    res.json(result.map((r) => ({ ...r, user: { full_name: r.user_name } })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load audit logs" });
  }
});

export default router;
