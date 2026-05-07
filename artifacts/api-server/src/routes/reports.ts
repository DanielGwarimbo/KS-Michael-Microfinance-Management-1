import { Router } from "express";
import { db } from "@workspace/db";
import {
  loans,
  repayments,
  accountingEntries,
  userProfiles,
  clients,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Only admin, manager, accountant can access reports
const reportAccess = requireRole("admin", "manager", "accountant");

router.get("/reports/summary", reportAccess, async (req, res) => {
  try {
    const [allLoans, allRepayments, allEntries, allOfficers, allClients] =
      await Promise.all([
        db
          .select({
            id: loans.id,
            loan_number: loans.loan_number,
            status: loans.status,
            principal: loans.principal,
            outstanding_balance: loans.outstanding_balance,
            maturity_date: loans.maturity_date,
            created_by: loans.created_by,
            client_first_name: clients.first_name,
            client_last_name: clients.last_name,
          })
          .from(loans)
          .leftJoin(clients, eq(loans.client_id, clients.id)),
        db.select({ amount: repayments.amount, received_by: repayments.received_by }).from(repayments),
        db
          .select({ transaction_type: accountingEntries.transaction_type, amount: accountingEntries.amount })
          .from(accountingEntries),
        db
          .select({ id: userProfiles.id, full_name: userProfiles.full_name })
          .from(userProfiles)
          .where(eq(userProfiles.is_active, true)),
        db.select({ id: clients.id, assigned_officer_id: clients.assigned_officer_id }).from(clients),
      ]);

    const activeLoans = allLoans.filter((l) => l.status === "active");
    const overdueLoans = allLoans.filter((l) => l.status === "overdue");
    const disbursed = allLoans.filter((l) =>
      ["active", "overdue", "closed", "defaulted"].includes(l.status),
    );

    const totalDisbursed = disbursed.reduce((s, l) => s + Number(l.principal), 0);
    const totalCollected = allRepayments.reduce((s, r) => s + Number(r.amount), 0);
    const outstanding = [...activeLoans, ...overdueLoans].reduce(
      (s, l) => s + Number(l.outstanding_balance),
      0,
    );
    const interestEarned = allEntries
      .filter((e) => e.transaction_type === "interest_earned")
      .reduce((s, e) => s + Number(e.amount), 0);

    const officers = allOfficers.map((o) => {
      const oLoans = allLoans.filter((l) => l.created_by === o.id);
      const oClients = allClients.filter((c) => c.assigned_officer_id === o.id);
      const oCollected = allRepayments
        .filter((r) => r.received_by === o.id)
        .reduce((s, r) => s + Number(r.amount), 0);
      return {
        id: o.id,
        name: o.full_name,
        totalClients: oClients.length,
        totalLoans: oLoans.length,
        totalDisbursed: oLoans.reduce((s, l) => s + Number(l.principal), 0),
        totalCollected: oCollected,
      };
    });

    res.json({
      portfolio: {
        totalLoans: allLoans.length,
        activeLoans: activeLoans.length,
        totalDisbursed,
        totalCollected,
        outstandingBalance: outstanding,
        interestEarned,
      },
      overdueLoans: overdueLoans.map((l) => ({
        ...l,
        client: { first_name: l.client_first_name, last_name: l.client_last_name },
      })),
      officers,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load report summary" });
  }
});

router.get("/reports/portfolio", reportAccess, async (req, res) => {
  try {
    const [allLoans, allRepayments, allEntries] = await Promise.all([
      db.select().from(loans),
      db.select({ amount: repayments.amount }).from(repayments),
      db.select({ transaction_type: accountingEntries.transaction_type, amount: accountingEntries.amount }).from(accountingEntries),
    ]);

    const activeLoans = allLoans.filter((l) => l.status === "active");
    const overdueLoans = allLoans.filter((l) => l.status === "overdue");
    const disbursed = allLoans.filter((l) => ["active", "overdue", "closed", "defaulted"].includes(l.status));

    res.json({
      totalLoans: allLoans.length,
      activeLoans: activeLoans.length,
      totalDisbursed: disbursed.reduce((s, l) => s + Number(l.principal), 0),
      totalCollected: allRepayments.reduce((s, r) => s + Number(r.amount), 0),
      outstandingBalance: [...activeLoans, ...overdueLoans].reduce((s, l) => s + Number(l.outstanding_balance), 0),
      interestEarned: allEntries.filter((e) => e.transaction_type === "interest_earned").reduce((s, e) => s + Number(e.amount), 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load portfolio report" });
  }
});

router.get("/reports/overdue", reportAccess, async (req, res) => {
  try {
    const rows = await db
      .select({
        id: loans.id,
        loan_number: loans.loan_number,
        outstanding_balance: loans.outstanding_balance,
        maturity_date: loans.maturity_date,
        status: loans.status,
        client_first_name: clients.first_name,
        client_last_name: clients.last_name,
      })
      .from(loans)
      .leftJoin(clients, eq(loans.client_id, clients.id))
      .where(eq(loans.status, "overdue"));

    res.json(rows.map((r) => ({ ...r, client: { first_name: r.client_first_name, last_name: r.client_last_name } })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load overdue report" });
  }
});

router.get("/reports/officers", reportAccess, async (req, res) => {
  try {
    const [officers, allClients, allLoans, allRepayments] = await Promise.all([
      db.select({ id: userProfiles.id, full_name: userProfiles.full_name }).from(userProfiles).where(eq(userProfiles.is_active, true)),
      db.select({ id: clients.id, assigned_officer_id: clients.assigned_officer_id }).from(clients),
      db.select({ id: loans.id, created_by: loans.created_by, principal: loans.principal }).from(loans),
      db.select({ amount: repayments.amount, received_by: repayments.received_by }).from(repayments),
    ]);

    res.json(officers.map((o) => {
      const oLoans = allLoans.filter((l) => l.created_by === o.id);
      const oClients = allClients.filter((c) => c.assigned_officer_id === o.id);
      return {
        id: o.id,
        name: o.full_name,
        totalClients: oClients.length,
        totalLoans: oLoans.length,
        totalDisbursed: oLoans.reduce((s, l) => s + Number(l.principal), 0),
        totalCollected: allRepayments.filter((r) => r.received_by === o.id).reduce((s, r) => s + Number(r.amount), 0),
      };
    }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load officer report" });
  }
});

export default router;
