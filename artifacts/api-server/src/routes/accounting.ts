import { Router } from "express";
import { db } from "@workspace/db";
import { accountingEntries, userProfiles } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Only admin, manager, accountant can view accounting entries
router.get(
  "/accounting",
  requireRole("admin", "manager", "accountant"),
  async (req, res) => {
    try {
      const rows = await db
        .select({
          id: accountingEntries.id,
          transaction_type: accountingEntries.transaction_type,
          reference_id: accountingEntries.reference_id,
          reference_type: accountingEntries.reference_type,
          amount: accountingEntries.amount,
          description: accountingEntries.description,
          created_by: accountingEntries.created_by,
          created_at: accountingEntries.created_at,
          creator_name: userProfiles.full_name,
        })
        .from(accountingEntries)
        .leftJoin(userProfiles, eq(accountingEntries.created_by, userProfiles.id))
        .orderBy(desc(accountingEntries.created_at));

      res.json(rows.map((r) => ({ ...r, creator: { full_name: r.creator_name } })));
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to load accounting entries" });
    }
  },
);

export default router;
