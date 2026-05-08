import { Router } from "express";
import { db } from "@workspace/db";
import {
  loans,
  repayments,
  repaymentSchedules,
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
    const [allLoans, allRepayments, allOfficers, allClients] =
      await Promise.all([
        db
          .select({
            id: loans.id,
            loan_number: loans.loan_number,
            status: loans.status,
            principal: loans.principal,
            total_payable: loans.total_payable,
            total_paid: loans.total_paid,
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
    // Interest earned: derive from loan data using flat-rate ratio so this
    // matches the AccountingPage exactly (interest portion of cash collected).
    const interestEarned = disbursed.reduce((s, l) => {
      const tp = Number(l.total_payable);
      if (!tp) return s;
      return s + (Number(l.total_paid) * (tp - Number(l.principal))) / tp;
    }, 0);

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
    const [allLoans, allRepayments] = await Promise.all([
      db.select().from(loans),
      db.select({ amount: repayments.amount }).from(repayments),
    ]);

    const activeLoans = allLoans.filter((l) => l.status === "active");
    const overdueLoans = allLoans.filter((l) => l.status === "overdue");
    const disbursed = allLoans.filter((l) => ["active", "overdue", "closed", "defaulted"].includes(l.status));

    const interestEarned = disbursed.reduce((s, l) => {
      const tp = Number(l.total_payable);
      if (!tp) return s;
      return s + (Number(l.total_paid) * (tp - Number(l.principal))) / tp;
    }, 0);

    res.json({
      totalLoans: allLoans.length,
      activeLoans: activeLoans.length,
      totalDisbursed: disbursed.reduce((s, l) => s + Number(l.principal), 0),
      totalCollected: allRepayments.reduce((s, r) => s + Number(r.amount), 0),
      outstandingBalance: [...activeLoans, ...overdueLoans].reduce((s, l) => s + Number(l.outstanding_balance), 0),
      interestEarned,
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

router.get("/reports/overdue-installments", reportAccess, async (req, res) => {
  try {
    const rows = await db
      .select({
        installment_id: repaymentSchedules.id,
        installment_number: repaymentSchedules.installment_number,
        due_date: repaymentSchedules.due_date,
        amount_due: repaymentSchedules.amount_due,
        amount_paid: repaymentSchedules.amount_paid,
        loan_number: loans.loan_number,
        client_first_name: clients.first_name,
        client_last_name: clients.last_name,
        client_phone: clients.phone,
      })
      .from(repaymentSchedules)
      .innerJoin(loans, eq(repaymentSchedules.loan_id, loans.id))
      .leftJoin(clients, eq(loans.client_id, clients.id))
      .where(eq(repaymentSchedules.status, "overdue"));

    const result = rows
      .map((r) => {
        const daysOverdue = r.due_date
          ? Math.max(0, Math.floor((Date.now() - new Date(r.due_date).getTime()) / 86400000))
          : 0;
        return {
          loan_number: r.loan_number,
          client_name: `${r.client_first_name ?? ""} ${r.client_last_name ?? ""}`.trim(),
          client_phone: r.client_phone ?? "",
          installment_number: r.installment_number,
          due_date: r.due_date,
          amount_due: Number(r.amount_due),
          amount_paid: Number(r.amount_paid),
          days_overdue: daysOverdue,
        };
      })
      .sort((a, b) => b.days_overdue - a.days_overdue);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load overdue installments report" });
  }
});

export default router;
