export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZW', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-ZW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-ZW', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateReceiptNumber(): string {
  const num = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP-${num}`;
}

export function calculateLoan(
  principal: number,
  annualRate: number,
  termMonths: number,
  frequency: 'monthly' | 'biweekly' | 'weekly'
): { totalPayable: number; installmentAmount: number; totalInterest: number } {
  const monthlyRate = annualRate / 100 / 12;
  const totalInterest = principal * monthlyRate * termMonths;
  const totalPayable = principal + totalInterest;

  let periodsPerMonth: number;
  switch (frequency) {
    case 'weekly':
      periodsPerMonth = 4;
      break;
    case 'biweekly':
      periodsPerMonth = 2;
      break;
    case 'monthly':
    default:
      periodsPerMonth = 1;
  }

  const totalPeriods = termMonths * periodsPerMonth;
  const installmentAmount = totalPeriods > 0 ? totalPayable / totalPeriods : 0;

  return {
    totalPayable: Math.round(totalPayable * 100) / 100,
    installmentAmount: Math.round(installmentAmount * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
  };
}

export function generateRepaymentSchedule(
  principal: number,
  annualRate: number,
  termMonths: number,
  frequency: 'monthly' | 'biweekly' | 'weekly',
  startDate: string
): Array<{
  installmentNumber: number;
  dueDate: string;
  amountDue: number;
  principalPortion: number;
  interestPortion: number;
}> {
  const { totalPayable } = calculateLoan(principal, annualRate, termMonths, frequency);
  const monthlyInterest = principal * (annualRate / 100 / 12);
  const totalInterest = monthlyInterest * termMonths;

  let periodsPerMonth: number;
  switch (frequency) {
    case 'weekly':
      periodsPerMonth = 4;
      break;
    case 'biweekly':
      periodsPerMonth = 2;
      break;
    case 'monthly':
    default:
      periodsPerMonth = 1;
  }

  const totalPeriods = termMonths * periodsPerMonth;
  const installmentAmount = totalPayable / totalPeriods;
  const interestPerPeriod = totalInterest / totalPeriods;
  const principalPerPeriod = (principal) / totalPeriods;

  const schedule: Array<{
    installmentNumber: number;
    dueDate: string;
    amountDue: number;
    principalPortion: number;
    interestPortion: number;
  }> = [];

  const start = new Date(startDate);

  for (let i = 1; i <= totalPeriods; i++) {
    const dueDate = new Date(start);
    if (frequency === 'monthly') {
      dueDate.setMonth(dueDate.getMonth() + i);
    } else if (frequency === 'biweekly') {
      dueDate.setDate(dueDate.getDate() + i * 14);
    } else {
      dueDate.setDate(dueDate.getDate() + i * 7);
    }

    schedule.push({
      installmentNumber: i,
      dueDate: dueDate.toISOString().split('T')[0],
      amountDue: Math.round(installmentAmount * 100) / 100,
      principalPortion: Math.round(principalPerPeriod * 100) / 100,
      interestPortion: Math.round(interestPerPeriod * 100) / 100,
    });
  }

  return schedule;
}

export const LOAN_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  active: 'bg-green-100 text-green-800',
  overdue: 'bg-orange-100 text-orange-800',
  closed: 'bg-gray-100 text-gray-800',
  defaulted: 'bg-red-200 text-red-900',
};

export const CLIENT_STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  blacklisted: 'bg-red-100 text-red-800',
};

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  loan_officer: 'Loan Officer',
  cashier: 'Cashier',
  accountant: 'Accountant',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  bank_transfer: 'Bank Transfer',
};

export const EMPLOYMENT_LABELS: Record<string, string> = {
  employed: 'Employed',
  self_employed: 'Self Employed',
  unemployed: 'Unemployed',
  retired: 'Retired',
};

export const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  biweekly: 'Bi-Weekly',
  weekly: 'Weekly',
};
