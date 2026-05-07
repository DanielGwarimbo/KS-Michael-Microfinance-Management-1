import { Router } from "express";
import { db } from "@workspace/db";
import {
  repayments,
  loans,
  clients,
  repaymentSchedules,
  accountingEntries,
  userProfiles,
} from "@workspace/db/schema";
import { eq, inArray, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

async function nextReceiptNumber() {
  const [row] = await db.select({ count: sql<number>`COUNT(*)` }).from(repayments);
  const n = Number(row.count) + 1;
  return `RCP-${String(n).padStart(5, "0")}`;
}

router.get("/repayments", async (req, res) => {
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
        loan_number: loans.loan_number,
        client_first_name: clients.first_name,
        client_last_name: clients.last_name,
        receiver_name: userProfiles.full_name,
      })
      .from(repayments)
      .leftJoin(loans, eq(repayments.loan_id, loans.id))
      .leftJoin(clients, eq(loans.client_id, clients.id))
      .leftJoin(userProfiles, eq(repayments.received_by, userProfiles.id))
      .orderBy(desc(repayments.created_at));

    res.json(
      rows.map((r) => ({
        ...r,
        loan: { loan_number: r.loan_number },
        client: { first_name: r.client_first_name, last_name: r.client_last_name },
        receiver: { full_name: r.receiver_name },
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load repayments" });
  }
});

router.post("/repayments", async (req, res) => {
  try {
    const { loan_id, amount, payment_method, payment_date, notes, principal_amount, interest_amount } = req.body;

    const loanRows = await db.select().from(loans).where(eq(loans.id, loan_id)).limit(1);
    if (!loanRows.length) {
      res.status(404).json({ error: "Loan not found" });
      return;
    }
    const loan = loanRows[0];

    const amt = Number(amount);
    const principal = Number(principal_amount);
    const interest = Number(interest_amount);

    const receipt_number = await nextReceiptNumber();

    const [repayment] = await db
      .insert(repayments)
      .values({
        loan_id,
        receipt_number,
        amount: amt,
        principal_amount: principal,
        interest_amount: interest,
        payment_date,
        payment_method,
        received_by: req.user!.id,
        notes: notes || "",
      })
      .returning();

    const newTotalPaid = Number(loan.total_paid) + amt;
    const newOutstanding = Math.max(0, Number(loan.total_payable) - newTotalPaid);
    const newStatus = newOutstanding <= 0 ? "closed" : loan.status;

    await db
      .update(loans)
      .set({
        total_paid: newTotalPaid,
        outstanding_balance: newOutstanding,
        status: newStatus,
        updated_at: new Date(),
      })
      .where(eq(loans.id, loan_id));

    await db.insert(accountingEntries).values([
      {
        transaction_type: "repayment",
        reference_id: repayment.id,
        reference_type: "repayment",
        amount: principal,
        description: `Principal repayment - ${loan.loan_number}`,
        created_by: req.user!.id,
      },
      {
        transaction_type: "interest_earned",
        reference_id: repayment.id,
        reference_type: "repayment",
        amount: interest,
        description: `Interest earned - ${loan.loan_number}`,
        created_by: req.user!.id,
      },
    ]);

    const pendingSchedules = await db
      .select()
      .from(repaymentSchedules)
      .where(eq(repaymentSchedules.loan_id, loan_id))
      .orderBy(repaymentSchedules.installment_number);

    const nextPending = pendingSchedules.find((s) => s.status === "pending" || s.status === "overdue");
    if (nextPending) {
      const newAmountPaid = Number(nextPending.amount_paid) + amt;
      const scheduleStatus =
        newAmountPaid >= Number(nextPending.amount_due) ? "paid" : "partial";
      await db
        .update(repaymentSchedules)
        .set({
          amount_paid: newAmountPaid,
          paid_date: scheduleStatus === "paid" ? payment_date : null,
          status: scheduleStatus,
        })
        .where(eq(repaymentSchedules.id, nextPending.id));
    }

    res.json(repayment);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to record payment" });
  }
});

export default router;
