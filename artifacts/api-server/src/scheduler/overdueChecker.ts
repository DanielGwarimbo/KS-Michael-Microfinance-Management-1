import { db } from "@workspace/db";
import { loans, repaymentSchedules, auditLogs, userProfiles, roles, clients } from "@workspace/db/schema";
import { eq, and, lt, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendOverdueNotifications } from "../lib/notifications";

interface SystemActor {
  id: string;
  role_name: string;
}

/**
 * Finds a system actor for audit logging.
 * Prefers any active admin-role user, then any other active user.
 * Returns null only if the users table is completely empty (fresh/uninitialized DB).
 */
async function resolveSystemActor(): Promise<SystemActor | null> {
  const candidates = await db
    .select({ id: userProfiles.id, role_name: roles.name })
    .from(userProfiles)
    .leftJoin(roles, eq(userProfiles.role_id, roles.id))
    .where(eq(userProfiles.is_active, true));

  if (!candidates.length) return null;

  const preferred = candidates.find((u) => u.role_name === "admin");
  const actor = preferred ?? candidates[0];
  return { id: actor.id, role_name: actor.role_name ?? "admin" };
}

export async function runOverdueCheck(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  try {
    const actor = await resolveSystemActor();

    if (!actor) {
      logger.warn({ date: today }, "No users found — skipping overdue check (DB not yet seeded)");
      return;
    }

    const overdueLoans = await db
      .select({
        id: loans.id,
        loan_number: loans.loan_number,
        maturity_date: loans.maturity_date,
        outstanding_balance: loans.outstanding_balance,
        client_id: loans.client_id,
        created_by: loans.created_by,
      })
      .from(loans)
      .where(and(eq(loans.status, "active"), lt(loans.maturity_date, today)));

    if (overdueLoans.length > 0) {
      const overdueIds = overdueLoans.map((l) => l.id);

      await db
        .update(loans)
        .set({ status: "overdue", updated_at: new Date() })
        .where(inArray(loans.id, overdueIds));

      logger.info({ count: overdueLoans.length, date: today }, "Marked loans as overdue");

      await db.insert(auditLogs).values(
        overdueLoans.map((loan) => ({
          user_id: actor.id,
          user_role: actor.role_name,
          action: "status_changed_to_overdue",
          module: "loans",
          entity_id: loan.id,
          entity_type: "loan",
          details: {
            loan_number: loan.loan_number,
            maturity_date: loan.maturity_date,
            triggered_by: "scheduled_overdue_checker",
            checked_on: today,
          },
        })),
      );

      // Notify for each newly overdue loan; run concurrently but await all results
      await Promise.allSettled(overdueLoans.map((loan) => sendOverdueNotificationForLoan(loan)));
    } else {
      logger.info({ date: today }, "No active loans past maturity date");
    }

    const overdueSchedules = await db
      .select({
        id: repaymentSchedules.id,
        loan_id: repaymentSchedules.loan_id,
        due_date: repaymentSchedules.due_date,
        installment_number: repaymentSchedules.installment_number,
      })
      .from(repaymentSchedules)
      .where(and(eq(repaymentSchedules.status, "pending"), lt(repaymentSchedules.due_date, today)));

    if (overdueSchedules.length > 0) {
      const scheduleIds = overdueSchedules.map((s) => s.id);

      await db
        .update(repaymentSchedules)
        .set({ status: "overdue" })
        .where(inArray(repaymentSchedules.id, scheduleIds));

      logger.info({ count: overdueSchedules.length, date: today }, "Marked repayment schedule installments as overdue");

      await db.insert(auditLogs).values(
        overdueSchedules.map((schedule) => ({
          user_id: actor.id,
          user_role: actor.role_name,
          action: "schedule_installment_marked_overdue",
          module: "loans",
          entity_id: schedule.id,
          entity_type: "repayment_schedule",
          details: {
            loan_id: schedule.loan_id,
            installment_number: schedule.installment_number,
            due_date: schedule.due_date,
            triggered_by: "scheduled_overdue_checker",
            checked_on: today,
          },
        })),
      );
    } else {
      logger.info({ date: today }, "No pending schedule installments past due date");
    }
  } catch (err) {
    logger.error({ err }, "Overdue checker failed");
  }
}

interface LoanStub {
  id: string;
  loan_number: string;
  maturity_date: string | null;
  outstanding_balance: number;
  client_id: string;
  created_by: string;
}

async function sendOverdueNotificationForLoan(loan: LoanStub): Promise<void> {
  try {
    const [clientRow] = await db
      .select({
        first_name: clients.first_name,
        last_name: clients.last_name,
        email: clients.email,
        phone: clients.phone,
        assigned_officer_id: clients.assigned_officer_id,
      })
      .from(clients)
      .where(eq(clients.id, loan.client_id))
      .limit(1);

    // Prefer the client's assigned officer; fall back to the loan creator
    const officerId = clientRow?.assigned_officer_id ?? loan.created_by;

    const [officerRow] = await db
      .select({
        full_name: userProfiles.full_name,
        email: userProfiles.email,
        phone: userProfiles.phone,
      })
      .from(userProfiles)
      .where(eq(userProfiles.id, officerId))
      .limit(1);

    await sendOverdueNotifications({
      loanNumber: loan.loan_number,
      clientName: clientRow ? `${clientRow.first_name} ${clientRow.last_name}` : "Client",
      maturityDate: loan.maturity_date ?? "N/A",
      outstandingBalance: loan.outstanding_balance,
      officerName: officerRow?.full_name,
      officerEmail: officerRow?.email || undefined,
      officerPhone: officerRow?.phone || undefined,
      clientEmail: clientRow?.email || undefined,
      clientPhone: clientRow?.phone || undefined,
    });
  } catch (err) {
    logger.error({ err, loan_id: loan.id }, "Failed to send overdue notifications for loan");
  }
}

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export function startOverdueScheduler(): void {
  logger.info("Starting overdue loan scheduler");

  runOverdueCheck();

  setInterval(() => {
    runOverdueCheck();
  }, TWENTY_FOUR_HOURS);
}
