import nodemailer from "nodemailer";
import { logger } from "./logger";

export interface OverdueNotificationPayload {
  loanNumber: string;
  clientName: string;
  maturityDate: string;
  outstandingBalance: number;
  officerEmail?: string;
  officerPhone?: string;
  officerName?: string;
  clientEmail?: string;
  clientPhone?: string;
}

function formatCurrency(amount: number): string {
  return `USD ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildEmailSubject(loanNumber: string): string {
  return `Overdue Loan Alert: ${loanNumber}`;
}

function buildOfficerEmailBody(payload: OverdueNotificationPayload): string {
  return `Dear ${payload.officerName ?? "Loan Officer"},

This is an automated alert from KS Microfinance Management System.

The following loan has become overdue:

  Loan Number     : ${payload.loanNumber}
  Client Name     : ${payload.clientName}
  Maturity Date   : ${payload.maturityDate}
  Outstanding Balance: ${formatCurrency(payload.outstandingBalance)}

Please follow up with the client at your earliest convenience to arrange repayment.

This message was sent automatically by the KSMMS overdue scheduler.
Do not reply to this email.
`;
}

function buildClientEmailBody(payload: OverdueNotificationPayload): string {
  return `Dear ${payload.clientName},

This is an automated reminder from KS Microfinance Management System.

Your loan (${payload.loanNumber}) matured on ${payload.maturityDate} and has an outstanding balance of ${formatCurrency(payload.outstandingBalance)}.

Please contact your loan officer or visit our office to arrange repayment as soon as possible.

Thank you.
`;
}

function buildOfficerSmsBody(payload: OverdueNotificationPayload): string {
  return `KSMMS Alert: Loan ${payload.loanNumber} for ${payload.clientName} is overdue (matured ${payload.maturityDate}). Outstanding: ${formatCurrency(payload.outstandingBalance)}. Please follow up.`;
}

function buildClientSmsBody(payload: OverdueNotificationPayload): string {
  return `KSMMS Reminder: Your loan ${payload.loanNumber} matured on ${payload.maturityDate}. Outstanding balance: ${formatCurrency(payload.outstandingBalance)}. Please contact us to arrange repayment.`;
}

/**
 * Normalize a phone number to E.164 format for Twilio.
 * Strips all non-digit characters, then prepends '+' if not already present.
 * Zimbabwe numbers stored without country code (e.g. "0771234567") are
 * converted to E.164 by replacing the leading '0' with '+263'.
 * Returns null when the cleaned number has fewer than 7 digits (unusable).
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return null;

  if (raw.trimStart().startsWith("+")) {
    return `+${digits}`;
  }

  if (digits.startsWith("0")) {
    return `+263${digits.slice(1)}`;
  }

  return `+${digits}`;
}

function createEmailTransport(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const secure = port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const transport = createEmailTransport();
  if (!transport) {
    logger.debug({ to }, "Email not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing) — skipping");
    return;
  }

  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  try {
    await transport.sendMail({ from, to, subject, text });
    logger.info({ to, subject }, "Overdue notification email sent");
  } catch (err) {
    logger.error({ err, to, subject }, "Failed to send overdue notification email");
  }
}

async function sendSms(to: string, body: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    logger.debug({ to }, "SMS not configured (TWILIO_* env vars missing) — skipping");
    return;
  }

  const normalized = normalizePhone(to);
  if (!normalized) {
    logger.warn({ to }, "Phone number could not be normalized to E.164 — skipping SMS");
    return;
  }

  try {
    const twilio = (await import("twilio")).default;
    const client = twilio(accountSid, authToken);
    await client.messages.create({ body, from: fromNumber, to: normalized });
    logger.info({ to }, "Overdue notification SMS sent");
  } catch (err) {
    logger.error({ err, to }, "Failed to send overdue notification SMS");
  }
}

export async function sendOverdueNotifications(payload: OverdueNotificationPayload): Promise<void> {
  const emailEnabled = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  const smsEnabled = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);

  if (!emailEnabled && !smsEnabled) {
    logger.debug(
      { loanNumber: payload.loanNumber },
      "No notification channels configured — set SMTP_* or TWILIO_* env vars to enable alerts",
    );
    return;
  }

  const subject = buildEmailSubject(payload.loanNumber);
  const tasks: Promise<void>[] = [];

  if (payload.officerEmail) {
    tasks.push(sendEmail(payload.officerEmail, subject, buildOfficerEmailBody(payload)));
  }
  if (payload.officerPhone && smsEnabled) {
    tasks.push(sendSms(payload.officerPhone, buildOfficerSmsBody(payload)));
  }

  if (payload.clientEmail) {
    tasks.push(sendEmail(payload.clientEmail, subject, buildClientEmailBody(payload)));
  }
  if (payload.clientPhone && smsEnabled) {
    tasks.push(sendSms(payload.clientPhone, buildClientSmsBody(payload)));
  }

  if (tasks.length === 0) {
    logger.debug(
      { loanNumber: payload.loanNumber },
      "No contact details available for loan — skipping notifications",
    );
    return;
  }

  await Promise.allSettled(tasks);
}
