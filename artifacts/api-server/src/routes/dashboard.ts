import { Router } from "express";
import { db } from "@workspace/db";
import {
  clients,
  loans,
  repayments,
  documents,
  userProfiles,
} from "@workspace/db/schema";
import { eq, inArray, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/dashboard/stats", async (req, res) => {
  try {
    const [clientCount, loanRows, recentRepaymentRows, recentLoanRows, pendingDocsCount] =
      await Promise.all([
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(clients)
          .where(eq(clients.status, "active")),
        db
          .select({
            id: loans.id,
            status: loans.status,
            outstanding_balance: loans.outstanding_balance,
            principal: loans.principal,
          })
          .from(loans),
        db
          .select({
            id: repayments.id,
            receipt_number: repayments.receipt_number,
            amount: repayments.amount,
            payment_date: repayments.payment_date,
            created_at: repayments.created_at,
            loan_id: repayments.loan_id,
          })
          .from(repayments)
          .orderBy(desc(repayments.created_at))
          .limit(5),
        db
          .select({
            id: loans.id,
            loan_number: loans.loan_number,
            status: loans.status,
            principal: loans.principal,
            created_at: loans.created_at,
            client_first_name: clients.first_name,
            client_last_name: clients.last_name,
          })
          .from(loans)
          .leftJoin(clients, eq(loans.client_id, clients.id))
          .orderBy(desc(loans.created_at))
          .limit(5),
        db
          .select({ count: sql<number>`COUNT(*)` })
          .from(documents)
          .where(eq(documents.verified, false)),
      ]);

    // Approved loans = all loans that passed approval (approved, active, overdue).
    // Excludes pending/rejected (not yet approved) and closed/defaulted (finished).
    const approvedLoans = loanRows.filter((l) =>
      ["approved", "active", "overdue"].includes(l.status),
    );
    const activeLoans   = loanRows.filter((l) => l.status === "active");
    const overdueLoans  = loanRows.filter((l) => l.status === "overdue");
    const pendingLoans  = loanRows.filter((l) => l.status === "pending");
    const disbursedLoans = loanRows.filter((l) =>
      ["active", "overdue", "closed", "defaulted"].includes(l.status),
    );
    // Outstanding balance only uses disbursed loans (active + overdue).
    const outstandingBalance = [...activeLoans, ...overdueLoans].reduce(
      (s, l) => s + Number(l.outstanding_balance),
      0,
    );
    const totalCollected = await db
      .select({ total: sql<number>`COALESCE(SUM(amount),0)` })
      .from(repayments);

    // Resolve loan info for recent repayments
    const loanIds = [...new Set(recentRepaymentRows.map((r) => r.loan_id))];
    const loanMap: Record<string, { loan_number: string; client: { first_name: string; last_name: string } }> = {};
    if (loanIds.length > 0) {
      const loanDetails = await db
        .select({
          id: loans.id,
          loan_number: loans.loan_number,
          client_first_name: clients.first_name,
          client_last_name: clients.last_name,
        })
        .from(loans)
        .leftJoin(clients, eq(loans.client_id, clients.id))
        .where(inArray(loans.id, loanIds));
      loanDetails.forEach((l) => {
        loanMap[l.id] = {
          loan_number: l.loan_number,
          client: { first_name: l.client_first_name || "", last_name: l.client_last_name || "" },
        };
      });
    }

    res.json({
      totalClients: Number(clientCount[0].count),
      activeLoans: approvedLoans.length,
      overdueLoans: overdueLoans.length,
      pendingLoans: pendingLoans.length,
      pendingDocuments: Number(pendingDocsCount[0].count),
      outstandingBalance,
      totalDisbursed: disbursedLoans.reduce((s, l) => s + Number(l.principal), 0),
      totalCollected: Number(totalCollected[0].total),
      recentLoans: recentLoanRows.map((l) => ({
        ...l,
        client: { first_name: l.client_first_name, last_name: l.client_last_name },
      })),
      recentRepayments: recentRepaymentRows.map((r) => ({
        ...r,
        loan: loanMap[r.loan_id] || null,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load dashboard stats" });
  }
});

export default router;
