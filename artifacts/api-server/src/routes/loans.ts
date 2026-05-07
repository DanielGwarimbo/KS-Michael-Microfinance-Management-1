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
  guarantors,
} from "@workspace/db/schema";
import { eq, inArray, sql, desc, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

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

router.post("/loans", async (req, res) => {
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
    res.json(row);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to create loan" });
  }
});

router.get("/loans/:id", async (req, res) => {
  try {
    const creatorAlias = db.$with("creator").as(
      db.select({ id: userProfiles.id, full_name: userProfiles.full_name }).from(userProfiles)
    );

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
      .where(eq(loans.id, req.params.id))
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

router.get("/loans/:id/schedule", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(repaymentSchedules)
      .where(eq(repaymentSchedules.loan_id, req.params.id))
      .orderBy(repaymentSchedules.installment_number);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load schedule" });
  }
});

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
      .where(eq(repayments.loan_id, req.params.id))
      .orderBy(desc(repayments.created_at));

    res.json(rows.map((r) => ({ ...r, receiver: { full_name: r.receiver_name } })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load repayments" });
  }
});

router.get("/loans/:id/documents", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(documents)
      .where(eq(documents.entity_id, req.params.id));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load documents" });
  }
});

router.post("/loans/:id/approve", async (req, res) => {
  try {
    const loanRows = await db.select().from(loans).where(eq(loans.id, req.params.id)).limit(1);
    if (!loanRows.length) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }
    const loan = loanRows[0];
    if (loan.status !== "pending") {
      res.status(400).json({ error: "Only pending loans can be approved" });
      return;
    }

    const [updated] = await db
      .update(loans)
      .set({
        status: "approved",
        approved_by: req.user!.id,
        approved_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(loans.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to approve loan" });
  }
});

router.post("/loans/:id/reject", async (req, res) => {
  try {
    const { rejection_reason } = req.body;
    if (!rejection_reason) {
      res.status(400).json({ error: "Rejection reason required" });
      return;
    }

    const [updated] = await db
      .update(loans)
      .set({
        status: "rejected",
        rejected_by: req.user!.id,
        rejected_at: new Date(),
        rejection_reason,
        updated_at: new Date(),
      })
      .where(eq(loans.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to reject loan" });
  }
});

router.post("/loans/:id/disburse", async (req, res) => {
  try {
    const loanRows = await db.select().from(loans).where(eq(loans.id, req.params.id)).limit(1);
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
      .set({
        status: "active",
        disbursed_by: req.user!.id,
        disbursed_at: new Date(),
        start_date: startDate,
        maturity_date: maturityDate,
        updated_at: new Date(),
      })
      .where(eq(loans.id, req.params.id))
      .returning();

    await db.insert(accountingEntries).values({
      transaction_type: "disbursement",
      reference_id: loan.id,
      reference_type: "loan",
      amount: loan.principal,
      description: `Loan disbursement - ${loan.loan_number}`,
      created_by: req.user!.id,
    });

    const schedule = buildSchedule(
      loan.principal,
      loan.interest_rate,
      loan.term_months,
      loan.repayment_frequency,
      startDate,
    );

    if (schedule.length > 0) {
      await db.insert(repaymentSchedules).values(
        schedule.map((s) => ({ ...s, loan_id: loan.id })),
      );
    }

    res.json(updated);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to disburse loan" });
  }
});

export default router;
