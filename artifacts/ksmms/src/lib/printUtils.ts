import type { Loan, RepaymentSchedule, Repayment } from './types';

const COMPANY = {
  name: 'KS Michael Finance (Pvt) Ltd',
  address: 'SSC Center, 1st Floor, Harare, Zimbabwe',
  contact: '+263 242 254 905 · info@ksmcapital.biz',
};

function todayLong() {
  return new Date().toLocaleDateString('en-ZW', { year: 'numeric', month: 'long', day: 'numeric' });
}

function baseStyles() {
  return `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #111827; padding: 24px 36px; }
      .page-header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 3px solid #1B475B; padding-bottom: 16px; margin-bottom: 20px; }
      .company-name { font-size: 20px; font-weight: 800; color: #1B475B; line-height: 1.2; }
      .company-sub { font-size: 10px; color: #6B7280; margin-top: 3px; }
      .doc-title { font-size: 16px; font-weight: 700; color: #1B475B; text-align: right; }
      .doc-meta { font-size: 10px; color: #9CA3AF; text-align: right; margin-top: 3px; }
      h2 { font-size: 13px; font-weight: 700; color: #1B475B; margin: 18px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
      thead th { background: #1B475B; color: #fff; font-size: 10px; font-weight: 700; text-align: left; padding: 7px 10px; text-transform: uppercase; letter-spacing: 0.06em; }
      tbody td { padding: 7px 10px; border-bottom: 1px solid #E5E7EB; vertical-align: middle; }
      tbody tr:nth-child(even) td { background: #F9FAFB; }
      .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
      .stat-box { border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px; }
      .stat-label { font-size: 10px; color: #6B7280; text-transform: uppercase; font-weight: 700; letter-spacing: 0.06em; margin-bottom: 6px; }
      .stat-value { font-size: 20px; font-weight: 800; color: #1B475B; }
      .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 20px; margin-bottom: 20px; }
      .info-item .label { font-size: 10px; color: #6B7280; text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; margin-bottom: 2px; }
      .info-item .value { font-size: 12px; font-weight: 600; color: #111827; }
      .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; }
      .badge-green { background: #D1FAE5; color: #065F46; }
      .badge-red { background: #FEE2E2; color: #991B1B; }
      .badge-amber { background: #FEF3C7; color: #92400E; }
      .badge-gray { background: #F3F4F6; color: #374151; }
      .divider { border: none; border-top: 1px solid #E5E7EB; margin: 16px 0; }
      .page-footer { margin-top: 28px; border-top: 1px solid #E5E7EB; padding-top: 12px; font-size: 10px; color: #9CA3AF; display: flex; justify-content: space-between; }
      .highlight { background: #F0F9FF; border-left: 4px solid #1B475B; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 16px; }
      .receipt-box { border: 2px solid #1B475B; border-radius: 12px; padding: 24px; max-width: 560px; margin: 0 auto; }
      .receipt-amount { font-size: 36px; font-weight: 900; color: #1B475B; text-align: center; margin: 16px 0; }
      .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #E5E7EB; font-size: 11px; }
      .receipt-row:last-child { border-bottom: none; }
      .receipt-label { color: #6B7280; }
      .receipt-value { font-weight: 700; }
      @media print { body { padding: 0; } @page { margin: 1.5cm; size: A4; } }
    </style>
  `;
}

function pageWrapper(title: string, subtitle: string, content: string) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>${title} — KS Michael Finance</title>${baseStyles()}</head>
  <body>
    <div class="page-header">
      <div>
        <div class="company-name">${COMPANY.name}</div>
        <div class="company-sub">${COMPANY.address}</div>
        <div class="company-sub">${COMPANY.contact}</div>
      </div>
      <div>
        <div class="doc-title">${title}</div>
        ${subtitle ? `<div class="doc-meta">${subtitle}</div>` : ''}
        <div class="doc-meta">Generated: ${todayLong()}</div>
      </div>
    </div>
    ${content}
    <div class="page-footer">
      <span>${COMPANY.name} — Microfinance Management System</span>
      <span>CONFIDENTIAL — Internal use only</span>
    </div>
  </body></html>`;
}

export function printDocument(html: string) {
  const win = window.open('', '_blank', 'width=960,height=720');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

// ─── Portfolio Summary Report ───────────────────────────────────────────────
export function printPortfolioReport(portfolio: {
  totalLoans: number; activeLoans: number; totalDisbursed: number;
  totalCollected: number; outstandingBalance: number; interestEarned: number;
}, fmtCurrency: (n: number) => string) {
  const stats = [
    { label: 'Total Loans', value: String(portfolio.totalLoans) },
    { label: 'Active Loans', value: String(portfolio.activeLoans) },
    { label: 'Total Disbursed', value: fmtCurrency(portfolio.totalDisbursed) },
    { label: 'Total Collected', value: fmtCurrency(portfolio.totalCollected) },
    { label: 'Outstanding Balance', value: fmtCurrency(portfolio.outstandingBalance) },
    { label: 'Interest Earned', value: fmtCurrency(portfolio.interestEarned) },
  ];
  const statHtml = stats.map(s => `
    <div class="stat-box">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
    </div>`).join('');
  const content = `<div class="stat-grid">${statHtml}</div>`;
  printDocument(pageWrapper('Portfolio Summary Report', todayLong(), content));
}

// ─── Overdue Loans Report ────────────────────────────────────────────────────
export function printOverdueReport(loans: Loan[], fmtCurrency: (n: number) => string, fmtDate: (d: string | null | undefined) => string) {
  if (!loans.length) {
    printDocument(pageWrapper('Overdue Loans Report', todayLong(), '<p style="text-align:center;color:#6B7280;padding:40px 0;">No overdue loans at this time.</p>'));
    return;
  }
  const rows = loans.map(l => {
    const client = (l as any).client;
    const name = client ? `${client.first_name} ${client.last_name}` : '—';
    const days = l.maturity_date ? Math.max(0, Math.floor((Date.now() - new Date(l.maturity_date).getTime()) / 86400000)) : 0;
    const badge = days > 90 ? 'badge-red' : days > 30 ? 'badge-amber' : 'badge-gray';
    return `<tr>
      <td>${name}</td>
      <td>${l.loan_number}</td>
      <td>${fmtCurrency(l.principal)}</td>
      <td>${fmtCurrency(l.outstanding_balance)}</td>
      <td>${fmtDate(l.maturity_date)}</td>
      <td><span class="badge ${badge}">${days} days</span></td>
    </tr>`;
  }).join('');
  const content = `
    <div class="highlight">
      <strong>${loans.length} overdue loan${loans.length !== 1 ? 's' : ''}</strong> — total outstanding:
      <strong>${fmtCurrency(loans.reduce((s, l) => s + l.outstanding_balance, 0))}</strong>
    </div>
    <table>
      <thead><tr>
        <th>Client</th><th>Loan No.</th><th>Principal</th>
        <th>Outstanding</th><th>Maturity Date</th><th>Days Overdue</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  printDocument(pageWrapper('Overdue Loans Report', todayLong(), content));
}

// ─── Loan Officer Performance Report ────────────────────────────────────────
export function printOfficerReport(officers: Array<{ name: string; totalClients: number; totalLoans: number; totalDisbursed: number; totalCollected: number }>, fmtCurrency: (n: number) => string) {
  if (!officers.length) {
    printDocument(pageWrapper('Loan Officer Performance Report', todayLong(), '<p style="text-align:center;color:#6B7280;padding:40px 0;">No officer data available.</p>'));
    return;
  }
  const rows = officers.map(o => `<tr>
    <td>${o.name}</td>
    <td>${o.totalClients}</td>
    <td>${o.totalLoans}</td>
    <td>${fmtCurrency(o.totalDisbursed)}</td>
    <td>${fmtCurrency(o.totalCollected)}</td>
    <td>${o.totalDisbursed > 0 ? ((o.totalCollected / o.totalDisbursed) * 100).toFixed(1) + '%' : '—'}</td>
  </tr>`).join('');
  const content = `
    <table>
      <thead><tr>
        <th>Officer Name</th><th>Clients</th><th>Loans</th>
        <th>Total Disbursed</th><th>Total Collected</th><th>Collection Rate</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  printDocument(pageWrapper('Loan Officer Performance Report', todayLong(), content));
}

// ─── Loan Statement ──────────────────────────────────────────────────────────
export function printLoanStatement(
  loan: Loan,
  schedule: RepaymentSchedule[],
  repayments: Repayment[],
  fmtCurrency: (n: number) => string,
  fmtDate: (d: string | null | undefined) => string,
) {
  const client = (loan as any).client;
  const clientName = client ? `${client.first_name} ${client.last_name}` : '—';
  const isBusiness = client?.client_type === 'business';
  const displayName = isBusiness && client?.business_name ? client.business_name : clientName;

  const statusBadge = (s: string) => {
    if (s === 'paid') return `<span class="badge badge-green">${s}</span>`;
    if (s === 'overdue') return `<span class="badge badge-red">${s}</span>`;
    if (s === 'partial') return `<span class="badge badge-amber">${s}</span>`;
    return `<span class="badge badge-gray">${s}</span>`;
  };

  const scheduleRows = schedule.map(s => `<tr>
    <td>${s.installment_number}</td>
    <td>${fmtDate(s.due_date)}</td>
    <td>${fmtCurrency(s.amount_due)}</td>
    <td>${fmtCurrency(s.principal_portion)}</td>
    <td>${fmtCurrency(s.interest_portion)}</td>
    <td>${fmtCurrency(s.amount_paid)}</td>
    <td>${s.paid_date ? fmtDate(s.paid_date) : '—'}</td>
    <td>${statusBadge(s.status)}</td>
  </tr>`).join('');

  const repaymentRows = repayments.map(r => `<tr>
    <td>${r.receipt_number}</td>
    <td>${fmtDate(r.payment_date)}</td>
    <td>${fmtCurrency(r.amount)}</td>
    <td>${fmtCurrency(r.principal_amount)}</td>
    <td>${fmtCurrency(r.interest_amount)}</td>
    <td style="text-transform:capitalize">${r.payment_method.replace(/_/g, ' ')}</td>
    <td>${(r as any).receiver?.full_name || '—'}</td>
  </tr>`).join('');

  const loanStatusBadge = () => {
    const s = loan.status;
    if (s === 'active') return `<span class="badge badge-green">${s}</span>`;
    if (s === 'overdue' || s === 'defaulted') return `<span class="badge badge-red">${s}</span>`;
    if (s === 'closed') return `<span class="badge badge-gray">${s}</span>`;
    return `<span class="badge badge-amber">${s}</span>`;
  };

  const content = `
    <div class="info-grid">
      <div class="info-item"><div class="label">Client</div><div class="value">${displayName}</div></div>
      <div class="info-item"><div class="label">Loan Number</div><div class="value">${loan.loan_number}</div></div>
      <div class="info-item"><div class="label">Status</div><div class="value">${loanStatusBadge()}</div></div>
      <div class="info-item"><div class="label">Principal</div><div class="value">${fmtCurrency(loan.principal)}</div></div>
      <div class="info-item"><div class="label">Interest Rate</div><div class="value">${loan.interest_rate}% p.m.</div></div>
      <div class="info-item"><div class="label">Term</div><div class="value">${loan.term_months} months</div></div>
      <div class="info-item"><div class="label">Total Payable</div><div class="value">${fmtCurrency(loan.total_payable)}</div></div>
      <div class="info-item"><div class="label">Total Paid</div><div class="value">${fmtCurrency(loan.total_paid)}</div></div>
      <div class="info-item"><div class="label">Outstanding Balance</div><div class="value">${fmtCurrency(loan.outstanding_balance)}</div></div>
      <div class="info-item"><div class="label">Start Date</div><div class="value">${fmtDate(loan.start_date)}</div></div>
      <div class="info-item"><div class="label">Maturity Date</div><div class="value">${fmtDate(loan.maturity_date)}</div></div>
      <div class="info-item"><div class="label">Purpose</div><div class="value">${loan.purpose || '—'}</div></div>
    </div>

    ${schedule.length > 0 ? `
    <h2>Repayment Schedule</h2>
    <table>
      <thead><tr>
        <th>#</th><th>Due Date</th><th>Amount</th><th>Principal</th>
        <th>Interest</th><th>Paid</th><th>Paid Date</th><th>Status</th>
      </tr></thead>
      <tbody>${scheduleRows}</tbody>
    </table>` : ''}

    ${repayments.length > 0 ? `
    <h2>Payment History</h2>
    <table>
      <thead><tr>
        <th>Receipt No.</th><th>Date</th><th>Amount</th><th>Principal</th>
        <th>Interest</th><th>Method</th><th>Received By</th>
      </tr></thead>
      <tbody>${repaymentRows}</tbody>
    </table>` : ''}
  `;

  printDocument(pageWrapper(`Loan Statement — ${loan.loan_number}`, displayName, content));
}

// ─── Accounting Statement (Financial Position) ──────────────────────────────
export interface AccountingStatementData {
  portfolio: { totalDisbursed: number; grossLoanPortfolio: number; principalOutstanding: number; portfolioAtRisk: number; activeLoanCount: number };
  cashFlow: { totalCashIn: number; totalCashOut: number; netCashMovement: number };
  income: { interestIncome: number; penaltyIncome: number; totalRevenue: number };
  losses: { writeOffs: number; loanLossProvisions: number; totalLosses: number };
  profitability: { grossProfit: number };
}

export function printAccountingStatement(
  data: AccountingStatementData,
  fmtCurrency: (n: number) => string,
) {
  const { portfolio, cashFlow, income, losses, profitability } = data;

  const sectionTable = (title: string, rows: Array<[string, string, boolean?]>) => `
    <h2>${title}</h2>
    <table>
      <tbody>
        ${rows.map(([label, value, emphasize]) => `
          <tr>
            <td style="width:65%; ${emphasize ? 'font-weight:700;color:#1B475B;' : ''}">${label}</td>
            <td style="text-align:right; font-variant-numeric: tabular-nums; ${emphasize ? 'font-weight:800;color:#1B475B;font-size:13px;' : 'font-weight:600;'}">${value}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const profitColor = profitability.grossProfit >= 0 ? '#065F46' : '#991B1B';

  const content = `
    <div class="highlight">
      This statement summarises the company's loan portfolio position, cash flow,
      income, losses and profitability as of ${todayLong()}. All figures are in USD.
    </div>

    ${sectionTable('1. Loan Portfolio (Receivables)', [
      ['Total Disbursed (Lifetime)', fmtCurrency(portfolio.totalDisbursed)],
      ['Gross Loan Portfolio (Active + Overdue)', fmtCurrency(portfolio.grossLoanPortfolio)],
      ['Principal Outstanding', fmtCurrency(portfolio.principalOutstanding)],
      ['Portfolio at Risk (Overdue Outstanding)', fmtCurrency(portfolio.portfolioAtRisk)],
      ['Number of Active Loans', String(portfolio.activeLoanCount)],
    ])}

    ${sectionTable('2. Cash Flow', [
      ['Total Cash In (Collections, Lifetime)', fmtCurrency(cashFlow.totalCashIn)],
      ['Total Cash Out (Disbursements, Lifetime)', fmtCurrency(cashFlow.totalCashOut)],
      ['Net Cash Movement', fmtCurrency(cashFlow.netCashMovement), true],
    ])}

    ${sectionTable('3. Income (Revenue Earned)', [
      ['Interest Income', fmtCurrency(income.interestIncome)],
      ['Penalty Income', fmtCurrency(income.penaltyIncome)],
      ['Total Revenue', fmtCurrency(income.totalRevenue), true],
    ])}

    ${sectionTable('4. Losses & Provisions', [
      ['Loan Write-Offs (Defaulted + Explicit)', fmtCurrency(losses.writeOffs)],
      ['Loan-Loss Provisions (50% of overdue PAR)', fmtCurrency(losses.loanLossProvisions)],
      ['Total Losses', fmtCurrency(losses.totalLosses), true],
    ])}

    <h2>5. Profitability</h2>
    <table>
      <tbody>
        <tr><td style="width:65%;">Total Revenue</td><td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:600;">${fmtCurrency(income.totalRevenue)}</td></tr>
        <tr><td>Less: Total Losses</td><td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:600;color:#991B1B;">− ${fmtCurrency(losses.totalLosses)}</td></tr>
        <tr style="border-top:2px solid #1B475B;">
          <td style="font-weight:800;color:#1B475B;padding-top:10px;">GROSS PROFIT</td>
          <td style="text-align:right;font-variant-numeric:tabular-nums;font-weight:900;font-size:15px;color:${profitColor};padding-top:10px;">${fmtCurrency(profitability.grossProfit)}</td>
        </tr>
      </tbody>
    </table>

    <div style="margin-top:24px;padding:14px 16px;background:#F9FAFB;border-radius:8px;font-size:10px;color:#6B7280;line-height:1.6;">
      <strong style="color:#374151;">Notes to the statement:</strong><br/>
      • Disbursed principal is treated as a loan receivable (asset), not an expense — it returns through repayments.<br/>
      • Interest Income is recognised on a cash basis (when collected), derived from each loan's flat-rate interest ratio.<br/>
      • Loan-Loss Provisions follow a simplified Portfolio-at-Risk rule: 50% of outstanding balance on overdue loans.<br/>
      • Net Profit (after operating expenses) is not shown — operating expenses such as salaries, rent and utilities are not tracked in this system.
    </div>
  `;

  printDocument(pageWrapper('Accounting Statement', `Financial Position as of ${todayLong()}`, content));
}

// ─── Repayment Receipt ───────────────────────────────────────────────────────
export function printRepaymentReceipt(
  repayment: Repayment,
  fmtCurrency: (n: number) => string,
  fmtDate: (d: string | null | undefined) => string,
) {
  const loan = (repayment as any).loan;
  const client = loan?.client;
  const clientName = client ? `${client.first_name} ${client.last_name}` : '—';
  const isBusiness = client?.client_type === 'business';
  const displayName = isBusiness && client?.business_name ? client.business_name : clientName;

  const content = `
    <div class="receipt-box">
      <div style="text-align:center;margin-bottom:12px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;font-weight:700;">Payment Receipt</div>
        <div style="font-size:18px;font-weight:800;color:#1B475B;margin-top:4px;">${repayment.receipt_number}</div>
      </div>
      <div class="receipt-amount">${fmtCurrency(repayment.amount)}</div>
      <hr class="divider" />
      <div class="receipt-row">
        <span class="receipt-label">Client</span>
        <span class="receipt-value">${displayName}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Loan Number</span>
        <span class="receipt-value">${loan?.loan_number || '—'}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Payment Date</span>
        <span class="receipt-value">${fmtDate(repayment.payment_date)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Payment Method</span>
        <span class="receipt-value" style="text-transform:capitalize">${repayment.payment_method.replace(/_/g, ' ')}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Principal Component</span>
        <span class="receipt-value">${fmtCurrency(repayment.principal_amount)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Interest Component</span>
        <span class="receipt-value">${fmtCurrency(repayment.interest_amount)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Total Amount Paid</span>
        <span class="receipt-value" style="color:#1B475B;font-size:14px;">${fmtCurrency(repayment.amount)}</span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Received By</span>
        <span class="receipt-value">${(repayment as any).receiver?.full_name || '—'}</span>
      </div>
      ${repayment.notes ? `<div class="receipt-row"><span class="receipt-label">Notes</span><span class="receipt-value">${repayment.notes}</span></div>` : ''}
      <hr class="divider" />
      <div style="text-align:center;font-size:10px;color:#9CA3AF;margin-top:8px;">
        This is an official payment receipt from ${COMPANY.name}.<br/>
        Please retain for your records.
      </div>
    </div>
  `;

  printDocument(pageWrapper('Payment Receipt', repayment.receipt_number, content));
}
