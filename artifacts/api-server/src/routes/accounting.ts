import { Router } from "express";
import { db } from "@workspace/db";
import { accountingEntries, userProfiles, loans, repayments } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const canView = requireRole("admin", "manager", "accountant");

// Accurate summary stats — sourced from the same authoritative tables as
// dashboard and reports so all three modules show consistent numbers.
router.get("/accounting/stats", canView, async (req, res) => {
  try {
    const [disbursedRow, collectedRow, outstandingRow, interestRow] = await Promise.all([
      // Total disbursed = sum of principals for all disbursed loans
      db
        .select({ total: sql<string>`COALESCE(SUM(principal), 0)` })
        .from(loans)
        .where(
          sql`${loans.status} IN ('active', 'overdue', 'closed', 'defaulted')`,
        ),
      // Total collected = sum of ALL repayment amounts (principal + interest)
      db
        .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
        .from(repayments),
      // Outstanding balance = sum from loans table (authoritative: total_payable - total_paid)
      db
        .select({ total: sql<string>`COALESCE(SUM(outstanding_balance), 0)` })
        .from(loans)
        .where(sql`${loans.status} IN ('active', 'overdue')`),
      // Interest earned = sum of interest_earned accounting entries
      db
        .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
        .from(accountingEntries)
        .where(eq(accountingEntries.transaction_type, "interest_earned")),
    ]);

    res.json({
      totalDisbursed: Number(disbursedRow[0].total),
      totalCollected: Number(collectedRow[0].total),
      outstandingBalance: Number(outstandingRow[0].total),
      interestEarned: Number(interestRow[0].total),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load accounting stats" });
  }
});

// Accounting entries ledger
router.get("/accounting", canView, async (req, res) => {
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
});

export default router;
