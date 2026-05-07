import { Router } from "express";
import { db } from "@workspace/db";
import {
  loans,
  clients,
  repaymentSchedules,
  repayments,
  documents,
  accountingEntries,
  userProfiles,
} from "@workspace/db/schema";
import { eq, inArray, sql, desc, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";
import { insertAuditLog, getIp, getDevice } from "../lib/auditLogger";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(val: string) { return UUID_RE.test(val); }

const router = Router();
router.use(requireAuth);

async function nextLoanNumber() {
  const [row] = await db.select({ count: sql<number>`COUNT(*)` }).from(loans);
  const n = Number(row.count) + 1;
  return `LN-${String(n).padStart(4, "0")}`;
}

function buildSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
  frequency: string,
  startDate: string,
) {
  const monthlyRate = annualRate / 100 / 12;
  const totalInterest = principal * monthlyRate * termMonths;
  const totalPayable = principal + totalInterest;

  let periodsPerMonth = 1;
  if (frequency === "biweekly") periodsPerMonth = 2;
  else if (frequency === "weekly") periodsPerMonth = 4;

  const totalPeriods = termMonths * periodsPerMonth;
  const installmentAmount = totalPayable / totalPeriods;
  const interestPerPeriod = totalInterest / totalPeriods;
  const principalPerPeriod = principal / totalPeriods;

  const start = new Date(startDate);
  return Array.from({ length: totalPeriods }, (_, i) => {
    const due = new Date(start);
    if (frequency === "monthly") due.setMonth(due.getMonth() + i + 1);
    else if (frequency === "biweekly") due.setDate(due.getDate() + (i + 1) * 14);
    else due.setDate(due.getDate() + (i + 1) * 7);

    return {
      installment_number: i + 1,
      due_date: due.toISOString().split("T")[0],
      amount_due: Math.round(installmentAmount * 100) / 100,
      principal_portion: Math.round(principalPerPeriod * 100) / 100,
      interest_portion: Math.round(interestPerPeriod * 100) / 100,
    };
  });
}

// All authenticated roles can view loans
router.get("/loans", async (req, res) => {
  try {
    const { status } = req.query as Record<string, string>;

    const rows = await db
      .select({
        id: loans.id,
        loan_number: loans.loan_number,
        client_id: loans.client_id,
        principal: loans.principal,
        interest_rate: loans.interest_rate,
        term_months: loans.term_months,
        repayment_frequency: loans.repayment_frequency,
        total_payable: loans.total_payable,
        installment_amount: loans.installment_amount,
        loan_product_type: loans.loan_product_type,
        purpose: loans.purpose,
        status: loans.status,
        created_by: loans.created_by,
        approved_by: loans.approved_by,
        approved_at: loans.approved_at,
        rejected_by: loans.rejected_by,
        rejected_at: loans.rejected_at,
        rejection_reason: loans.rejection_reason,
        disbursed_by: loans.disbursed_by,
        disbursed_at: loans.disbursed_at,
        outstanding_balance: loans.outstanding_balance,
        total_paid: loans.total_paid,
        start_date: loans.start_date,
        maturity_date: loans.maturity_date,
        created_at: loans.created_at,
        updated_at: loans.updated_at,
        client_first_name: clients.first_name,
        client_last_name: clients.last_name,
        client_number: clients.client_number,
        creator_name: userProfiles.full_name,
      })
      .from(loans)
      .leftJoin(clients, eq(loans.client_id, clients.id))
      .leftJoin(userProfiles, eq(loans.created_by, userProfiles.id))
      .orderBy(desc(loans.created_at));

    let result = rows;
    if (status) result = result.filter((r) => r.status === status);

    res.json(
      result.map((r) => ({
        ...r,
        client: {
          first_name: r.client_first_name,
          last_name: r.client_last_name,
          client_number: r.client_number,
        },
        creator: { full_name: r.creator_name },
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load loans" });
  }
});

// Active loans — all authenticated roles (used in repayment dropdown)
router.get("/loans/active", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: loans.id,
        loan_number: loans.loan_number,
        client_id: loans.client_id,
        outstanding_balance: loans.outstanding_balance,
        installment_amount: loans.installment_amount,
        total_payable: loans.total_payable,
        total_paid: loans.total_paid,
        status: loans.status,
        interest_rate: loans.interest_rate,
        repayment_frequency: loans.repayment_frequency,
        principal: loans.principal,
        term_months: loans.term_months,
        client_first_name: clients.first_name,
        client_last_name: clients.last_name,
        client_number: clients.client_number,
      })
      .from(loans)
      .leftJoin(clients, eq(loans.client_id, clients.id))
      .where(inArray(loans.status, ["active", "overdue"]))
      .orderBy(loans.loan_number);

    res.json(
      rows.map((r) => ({
        ...r,
        client: {
          first_name: r.client_first_name,
          last_name: r.client_last_name,
          client_number: r.client_number,
        },
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load active loans" });
  }
});

// Admin, manager, loan_officer can create loan applications
router.post(
  "/loans",
  requireRole("admin", "manager", "loan_officer"),
  async (req, res) => {
    try {
      const loan_number = await nextLoanNumber();
      const [row] = await db
        .insert(loans)
        .values({
          ...req.body,
          loan_number,
          created_by: req.user!.id,
          principal: Number(req.body.principal),
          interest_rate: Number(req.body.interest_rate),
          term_months: Number(req.body.term_months),
          total_payable: Number(req.body.total_payable),
          installment_amount: Number(req.body.installment_amount),
          outstanding_balance: Number(req.body.outstanding_balance),
          total_paid: 0,
        })
        .returning();

      await insertAuditLog({
        user_id: req.user!.id,
        user_role: req.user!.role_name,
        action: "loan_application_submitted",
        module: "loans",
        entity_id: row.id,
        entity_type: "loan",
        details: {
          loan_number: row.loan_number,
          principal: row.principal,
          term_months: row.term_months,
          interest_rate: row.interest_rate,
          product_type: row.loan_product_type,
          client_id: row.client_id,
        },
        ip_address: getIp(req),
        device_info: getDevice(req),
      });

      res.json(row);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to create loan" });
    }
  },
);

// All roles can view a loan
router.get("/loans/:id", async (req, res) => {
  try {
    const loanId = req.params.id as string;
    if (!isUUID(loanId)) { res.status(404).json({ error: "Loan not found" }); return; }
    const rows = await db
      .select({
        id: loans.id,
        loan_number: loans.loan_number,
        client_id: loans.client_id,
        principal: loans.principal,
        interest_rate: loans.interest_rate,
        term_months: loans.term_months,
        repayment_frequency: loans.repayment_frequency,
        total_payable: loans.total_payable,
        installment_amount: loans.installment_amount,
        loan_product_type: loans.loan_product_type,
        purpose: loans.purpose,
        status: loans.status,
        created_by: loans.created_by,
        approved_by: loans.approved_by,
        approved_at: loans.approved_at,
        rejected_by: loans.rejected_by,
        rejected_at: loans.rejected_at,
        rejection_reason: loans.rejection_reason,
        disbursed_by: loans.disbursed_by,
        disbursed_at: loans.disbursed_at,
        outstanding_balance: loans.outstanding_balance,
        total_paid: loans.total_paid,
        start_date: loans.start_date,
        maturity_date: loans.maturity_date,
        created_at: loans.created_at,
        updated_at: loans.updated_at,
        client_id2: clients.id,
        client_number: clients.client_number,
        client_first_name: clients.first_name,
        client_last_name: clients.last_name,
        client_phone: clients.phone,
        client_email: clients.email,
        client_address: clients.address,
      })
      .from(loans)
      .leftJoin(clients, eq(loans.client_id, clients.id))
      .where(eq(loans.id, loanId))
      .limit(1);

    if (!rows.length) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }

    const loan = rows[0];
    const [creatorRow] = loan.created_by
      ? await db.select({ full_name: userProfiles.full_name }).from(userProfiles).where(eq(userProfiles.id, loan.created_by)).limit(1)
      : [null];
    const [approverRow] = loan.approved_by
      ? await db.select({ full_name: userProfiles.full_name }).from(userProfiles).where(eq(userProfiles.id, loan.approved_by)).limit(1)
      : [null];
    const [disburserRow] = loan.disbursed_by
      ? await db.select({ full_name: userProfiles.full_name }).from(userProfiles).where(eq(userProfiles.id, loan.disbursed_by)).limit(1)
      : [null];

    res.json({
      ...loan,
      client: {
        id: loan.client_id2,
        client_number: loan.client_number,
        first_name: loan.client_first_name,
        last_name: loan.client_last_name,
        phone: loan.client_phone,
        email: loan.client_email,
        address: loan.client_address,
      },
      creator: creatorRow,
      approver: approverRow,
      disburser: disburserRow,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load loan" });
  }
});

// All roles can view loan schedule
router.get("/loans/:id/schedule", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(repaymentSchedules)
      .where(eq(repaymentSchedules.loan_id, req.params.id as string))
      .orderBy(repaymentSchedules.installment_number);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load schedule" });
  }
});

// All roles can view a loan's repayments
router.get("/loans/:id/repayments", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: repayments.id,
        loan_id: repayments.loan_id,
        receipt_number: repayments.receipt_number,
        amount: repayments.amount,
        principal_amount: repayments.principal_amount,
        interest_amount: repayments.interest_amount,
        payment_date: repayments.payment_date,
        payment_method: repayments.payment_method,
        received_by: repayments.received_by,
        notes: repayments.notes,
        created_at: repayments.created_at,
        receiver_name: userProfiles.full_name,
      })
      .from(repayments)
      .leftJoin(userProfiles, eq(repayments.received_by, userProfiles.id))
      .where(eq(repayments.loan_id, req.params.id as string))
      .orderBy(desc(repayments.created_at));

    res.json(rows.map((r) => ({ ...r, receiver: { full_name: r.receiver_name } })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load repayments" });
  }
});

// All roles can view a loan's documents
router.get("/loans/:id/documents", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(documents)
      .where(eq(documents.entity_id, req.params.id as string));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load documents" });
  }
});

// Only admin/manager can approve loans
router.post(
  "/loans/:id/approve",
  requireRole("admin", "manager"),
  async (req, res) => {
    try {
      const approveId = req.params.id as string;
      if (!isUUID(approveId)) { res.status(404).json({ error: "Loan not found" }); return; }
      const loanRows = await db.select().from(loans).where(eq(loans.id, approveId)).limit(1);
      if (!loanRows.length) {
        res.status(404).json({ error: "Loan not found" });
        return;
      }
      const loan = loanRows[0];
      if (loan.status !== "pending") {
        res.status(400).json({ error: "Only pending loans can be approved" });
        return;
      }

      // ── KYC document gate ────────────────────────────────────────────────
      const clientDocs = await db
        .select({ document_type: documents.document_type })
        .from(documents)
        .where(
          and(
            eq(documents.entity_id, loan.client_id),
            eq(documents.entity_type, "client_kyc"),
          ),
        );

      const uploadedTypes = new Set(clientDocs.map((d) => d.document_type));

      const requiredGroups = [
        { label: "National ID or Passport",               types: ["national_id", "passport"] },
        { label: "Proof of Residence",                    types: ["proof_of_residence"] },
        { label: "Proof of Income (payslip, employment letter, or bank statement)", types: ["proof_of_employment", "payslip", "bank_statement"] },
      ];

      const missing = requiredGroups
        .filter((g) => !g.types.some((t) => uploadedTypes.has(t)))
        .map((g) => g.label);

      if (missing.length > 0) {
        res.status(422).json({
          error: `Client KYC is incomplete. Missing: ${missing.join(", ")}`,
          missing_documents: missing,
        });
        return;
      }
      // ────────────────────────────────────────────────────────────────────

      const [updated] = await db
        .update(loans)
        .set({ status: "approved", approved_by: req.user!.id, approved_at: new Date(), updated_at: new Date() })
        .where(eq(loans.id, approveId))
        .returning();

      await insertAuditLog({
        user_id: req.user!.id,
        user_role: req.user!.role_name,
        action: "loan_approved",
        module: "loans",
        entity_id: updated.id,
        entity_type: "loan",
        details: { loan_number: updated.loan_number, principal: updated.principal, client_id: updated.client_id },
        ip_address: getIp(req),
        device_info: getDevice(req),
      });

      res.json(updated);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to approve loan" });
    }
  },
);

// Only admin/manager can reject loans
router.post(
  "/loans/:id/reject",
  requireRole("admin", "manager"),
  async (req, res) => {
    try {
      const rejectId = req.params.id as string;
      if (!isUUID(rejectId)) { res.status(404).json({ error: "Loan not found" }); return; }
      const { rejection_reason } = req.body;
      if (!rejection_reason) {
        res.status(400).json({ error: "Rejection reason required" });
        return;
      }

      const [updated] = await db
        .update(loans)
        .set({ status: "rejected", rejected_by: req.user!.id, rejected_at: new Date(), rejection_reason, updated_at: new Date() })
        .where(eq(loans.id, rejectId))
        .returning();

      await insertAuditLog({
        user_id: req.user!.id,
        user_role: req.user!.role_name,
        action: "loan_rejected",
        module: "loans",
        entity_id: updated.id,
        entity_type: "loan",
        details: { loan_number: updated.loan_number, rejection_reason, client_id: updated.client_id },
        ip_address: getIp(req),
        device_info: getDevice(req),
      });

      res.json(updated);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to reject loan" });
    }
  },
);

// Only admin/cashier can disburse loans
router.post(
  "/loans/:id/disburse",
  requireRole("admin", "cashier"),
  async (req, res) => {
    try {
      const disburseId = req.params.id as string;
      if (!isUUID(disburseId)) { res.status(404).json({ error: "Loan not found" }); return; }
      const loanRows = await db.select().from(loans).where(eq(loans.id, disburseId)).limit(1);
      if (!loanRows.length) {
        res.status(404).json({ error: "Loan not found" });
        return;
      }
      const loan = loanRows[0];
      if (loan.status !== "approved") {
        res.status(400).json({ error: "Only approved loans can be disbursed" });
        return;
      }

      const startDate = new Date().toISOString().split("T")[0];
      const maturityDateObj = new Date();
      maturityDateObj.setMonth(maturityDateObj.getMonth() + loan.term_months);
      const maturityDate = maturityDateObj.toISOString().split("T")[0];

      const [updated] = await db
        .update(loans)
        .set({ status: "active", disbursed_by: req.user!.id, disbursed_at: new Date(), start_date: startDate, maturity_date: maturityDate, updated_at: new Date() })
        .where(eq(loans.id, disburseId))
        .returning();

      await db.insert(accountingEntries).values({
        transaction_type: "disbursement",
        reference_id: loan.id,
        reference_type: "loan",
        amount: loan.principal,
        description: `Loan disbursement - ${loan.loan_number}`,
        created_by: req.user!.id,
      });

      const schedule = buildSchedule(loan.principal, loan.interest_rate, loan.term_months, loan.repayment_frequency, startDate);
      if (schedule.length > 0) {
        await db.insert(repaymentSchedules).values(schedule.map((s) => ({ ...s, loan_id: loan.id })));
      }

      await insertAuditLog({
        user_id: req.user!.id,
        user_role: req.user!.role_name,
        action: "loan_disbursed",
        module: "loans",
        entity_id: updated.id,
        entity_type: "loan",
        details: {
          loan_number: updated.loan_number,
          principal: updated.principal,
          start_date: startDate,
          maturity_date: maturityDate,
          client_id: updated.client_id,
          installments: schedule.length,
        },
        ip_address: getIp(req),
        device_info: getDevice(req),
      });

      res.json(updated);
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || "Failed to disburse loan" });
    }
  },
);

export default router;
