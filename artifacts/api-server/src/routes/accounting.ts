import { Router } from "express";
import { db } from "@workspace/db";
import { accountingEntries, userProfiles, loans, repayments } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

const canView = requireRole("admin", "manager", "accountant");

/**
 * Accounting summary using standard microfinance accounting principles.
 *
 * Five categories — each measures a different thing, do NOT confuse them:
 *
 *   1. PORTFOLIO  — Receivables (assets). Money owed TO the business.
 *   2. CASH FLOW  — Actual cash movement. Disbursed principal is NOT an expense;
 *                   it is an asset that converts back to cash via repayments.
 *   3. INCOME     — Revenue earned (recognized when cash is received).
 *                   Interest portion of collections + fees + penalties.
 *   4. LOSSES     — Expenses that reduce income: write-offs + loan-loss provisions.
 *   5. PROFIT     — Gross Profit = Income − Losses.
 *                   (True Net Profit also requires operating expenses such as
 *                    salaries and rent, which this system does not track.)
 */
router.get("/accounting/stats", canView, async (req, res) => {
  try {
    const [
      portfolioRow,
      activeLoansRow,
      defaultedRow,
      cashRows,
      interestEarnedRow,
      penaltyRow,
      writeOffEntryRow,
    ] = await Promise.all([
      // Portfolio aggregates: total disbursed (lifetime), gross loan portfolio
      // (outstanding on active+overdue), principal still owed
      db
        .select({
          total_disbursed: sql<string>`COALESCE(SUM(CASE WHEN status IN ('active','overdue','closed','defaulted') THEN principal ELSE 0 END), 0)`,
          gross_portfolio: sql<string>`COALESCE(SUM(CASE WHEN status IN ('active','overdue') THEN outstanding_balance ELSE 0 END), 0)`,
          principal_outstanding: sql<string>`COALESCE(SUM(CASE WHEN status IN ('active','overdue') THEN principal - (total_paid * principal / NULLIF(total_payable,0)) ELSE 0 END), 0)`,
          overdue_outstanding: sql<string>`COALESCE(SUM(CASE WHEN status = 'overdue' THEN outstanding_balance ELSE 0 END), 0)`,
        })
        .from(loans),
      db.select({ count: sql<number>`COUNT(*)` }).from(loans).where(sql`status IN ('active','overdue')`),
      // Defaulted loans — outstanding balance is treated as a loss
      db
        .select({ total: sql<string>`COALESCE(SUM(outstanding_balance), 0)` })
        .from(loans)
        .where(eq(loans.status, "defaulted")),
      // Cash flow: total in (collections) and total out (disbursements)
      db
        .select({
          cash_in: sql<string>`COALESCE(SUM(amount), 0)`,
        })
        .from(repayments),
      // Interest income (revenue): the interest portion of money actually
      // collected. Derived from loan data using flat-rate ratio so it is
      // accurate regardless of any per-repayment split issues.
      db
        .select({
          total: sql<string>`COALESCE(
            SUM(total_paid * (total_payable - principal) / NULLIF(total_payable, 0)),
            0
          )`,
        })
        .from(loans)
        .where(sql`status IN ('active','overdue','closed','defaulted')`),
      // Penalty income — currently captured as accounting entries
      db
        .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
        .from(accountingEntries)
        .where(eq(accountingEntries.transaction_type, "penalty")),
      // Explicit write-off entries
      db
        .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
        .from(accountingEntries)
        .where(eq(accountingEntries.transaction_type, "write_off")),
    ]);

    // Portfolio
    const totalDisbursed = Number(portfolioRow[0].total_disbursed);
    const grossLoanPortfolio = Number(portfolioRow[0].gross_portfolio);
    const principalOutstanding = Number(portfolioRow[0].principal_outstanding);
    const portfolioAtRisk = Number(portfolioRow[0].overdue_outstanding);
    const activeLoanCount = Number(activeLoansRow[0].count);

    // Cash flow
    const totalCashIn = Number(cashRows[0].cash_in);
    const totalCashOut = totalDisbursed; // disbursed principal = cash out
    const netCashMovement = totalCashIn - totalCashOut;

    // Income (revenue earned)
    const interestIncome = Number(interestEarnedRow[0].total);
    const penaltyIncome = Number(penaltyRow[0].total);
    const totalRevenue = interestIncome + penaltyIncome;

    // Losses
    const writeOffs =
      Number(writeOffEntryRow[0].total) + Number(defaultedRow[0].total);
    // Loan-loss provision: industry-standard simplified PAR provisioning.
    // Provision 50% of overdue outstanding balance (PAR>30 proxy).
    const loanLossProvisions = portfolioAtRisk * 0.5;
    const totalLosses = writeOffs + loanLossProvisions;

    // Profitability
    const grossProfit = totalRevenue - totalLosses;

    res.json({
      portfolio: {
        totalDisbursed,
        grossLoanPortfolio,
        principalOutstanding,
        portfolioAtRisk,
        activeLoanCount,
      },
      cashFlow: {
        totalCashIn,
        totalCashOut,
        netCashMovement,
      },
      income: {
        interestIncome,
        penaltyIncome,
        totalRevenue,
      },
      losses: {
        writeOffs,
        loanLossProvisions,
        totalLosses,
      },
      profitability: {
        grossProfit,
      },
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
