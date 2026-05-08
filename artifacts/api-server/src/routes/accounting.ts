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
        .where(sql`${loans.status} IN ('active', 'overdue', 'closed', 'defaulted')`),
      // Total collected = sum of ALL repayment amounts (principal + interest)
      db
        .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
        .from(repayments),
      // Outstanding balance = authoritative from loans table (total_payable - total_paid)
      db
        .select({ total: sql<string>`COALESCE(SUM(outstanding_balance), 0)` })
        .from(loans)
        .where(sql`${loans.status} IN ('active', 'overdue')`),
      // Interest earned = derived from loan data using the flat-rate interest ratio per loan.
      // For each loan: interest_earned = total_paid * (total_payable - principal) / total_payable.
      // This is always accurate regardless of how the repayment split was recorded.
      db
        .select({
          total: sql<string>`COALESCE(
            SUM(total_paid * (total_payable - principal) / NULLIF(total_payable, 0)),
            0
          )`,
        })
        .from(loans)
        .where(sql`${loans.status} IN ('active', 'overdue', 'closed', 'defaulted')`),
    ]);

    const totalDisbursed = Number(disbursedRow[0].total);
    const totalCollected = Number(collectedRow[0].total);
    const interestEarned = Number(interestRow[0].total);
    // Net profit = cash collected minus principal disbursed — the actual money the business earned
    const netProfit = totalCollected - totalDisbursed;

    res.json({
      totalDisbursed,
      totalCollected,
      outstandingBalance: Number(outstandingRow[0].total),
      interestEarned,
      netProfit,
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
