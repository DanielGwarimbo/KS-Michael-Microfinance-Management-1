import { db } from "@workspace/db";
import { loans, repaymentSchedules, auditLogs, userProfiles, roles } from "@workspace/db/schema";
import { eq, and, lt, inArray, isNotNull } from "drizzle-orm";
import { logger } from "../lib/logger";

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
      .select({ id: loans.id, loan_number: loans.loan_number, maturity_date: loans.maturity_date })
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

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export function startOverdueScheduler(): void {
  logger.info("Starting overdue loan scheduler");

  runOverdueCheck();

  setInterval(() => {
    runOverdueCheck();
  }, TWENTY_FOUR_HOURS);
}
