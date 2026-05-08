import { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import {
  DollarSign, TrendingUp, Receipt, AlertTriangle, Banknote,
  Wallet, ArrowDownCircle, ArrowUpCircle, Layers, ShieldAlert, PiggyBank,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import type { AccountingEntry } from '../../lib/types';

const TYPE_LABELS: Record<string, string> = {
  disbursement: 'Disbursement',
  repayment: 'Principal Repaid',
  interest_earned: 'Interest Earned',
  penalty: 'Penalty',
  write_off: 'Write-Off',
};
const TYPE_COLORS: Record<string, string> = {
  disbursement: 'bg-red-100 text-red-800',
  repayment: 'bg-green-100 text-green-800',
  interest_earned: 'bg-blue-100 text-blue-800',
  penalty: 'bg-amber-100 text-amber-800',
  write_off: 'bg-gray-100 text-gray-800',
};
const TRANSACTION_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'disbursement', label: 'Disbursement' },
  { value: 'repayment', label: 'Principal Repaid' },
  { value: 'interest_earned', label: 'Interest Earned' },
  { value: 'penalty', label: 'Penalty' },
  { value: 'write_off', label: 'Write-Off' },
] as const;

interface AccountingStats {
  portfolio: {
    totalDisbursed: number;
    grossLoanPortfolio: number;
    principalOutstanding: number;
    portfolioAtRisk: number;
    activeLoanCount: number;
  };
  cashFlow: {
    totalCashIn: number;
    totalCashOut: number;
    netCashMovement: number;
  };
  income: {
    interestIncome: number;
    penaltyIncome: number;
    totalRevenue: number;
  };
  losses: {
    writeOffs: number;
    loanLossProvisions: number;
    totalLosses: number;
  };
  profitability: {
    grossProfit: number;
  };
}

const EMPTY_STATS: AccountingStats = {
  portfolio: { totalDisbursed: 0, grossLoanPortfolio: 0, principalOutstanding: 0, portfolioAtRisk: 0, activeLoanCount: 0 },
  cashFlow: { totalCashIn: 0, totalCashOut: 0, netCashMovement: 0 },
  income: { interestIncome: 0, penaltyIncome: 0, totalRevenue: 0 },
  losses: { writeOffs: 0, loanLossProvisions: 0, totalLosses: 0 },
  profitability: { grossProfit: 0 },
};

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-0.5">{description}</p>
    </div>
  );
}

export default function AccountingPage() {
  const { addNotification } = useNotification();
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [stats, setStats] = useState<AccountingStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [entriesRes, statsRes] = await Promise.all([
        api.get<AccountingEntry[]>('/accounting'),
        api.get<AccountingStats>('/accounting/stats'),
      ]);
      if (entriesRes.error) throw new Error(entriesRes.error);
      if (statsRes.error) throw new Error(statsRes.error);
      setEntries(entriesRes.data || []);
      setStats(statsRes.data || EMPTY_STATS);
    } catch {
      addNotification('error', 'Failed to load accounting data');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(
    () => typeFilter ? entries.filter(e => e.transaction_type === typeFilter) : entries,
    [entries, typeFilter],
  );

  const columns = [
    { key: 'transaction_type', header: 'Type', render: (e: AccountingEntry) => <Badge colorClass={TYPE_COLORS[e.transaction_type]}>{TYPE_LABELS[e.transaction_type] ?? e.transaction_type}</Badge> },
    { key: 'amount', header: 'Amount', render: (e: AccountingEntry) => formatCurrency(Number(e.amount)) },
    { key: 'description', header: 'Description' },
    { key: 'creator', header: 'Created By', render: (e: AccountingEntry) => (e as any).creator?.full_name || '—' },
    { key: 'created_at', header: 'Date', render: (e: AccountingEntry) => formatDateTime(e.created_at) },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
    </div>
  );

  const { portfolio, cashFlow, income, losses, profitability } = stats;
  const profitColor = profitability.grossProfit >= 0 ? 'green' : 'red';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
        <p className="text-sm text-gray-500 mt-1">Financial position, cash flow, income, losses, and profitability</p>
      </div>

      {/* 1. PORTFOLIO — Receivables (assets) */}
      <section>
        <SectionHeader
          title="Loan Portfolio"
          description="Money owed to the business. Disbursed principal is an asset, not an expense — it returns through repayments."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Disbursed (Lifetime)" value={formatCurrency(portfolio.totalDisbursed)} icon={<DollarSign className="h-5 w-5" />} color="blue" />
          <StatCard title="Gross Loan Portfolio" value={formatCurrency(portfolio.grossLoanPortfolio)} icon={<Layers className="h-5 w-5" />} color="blue" />
          <StatCard title="Principal Outstanding" value={formatCurrency(portfolio.principalOutstanding)} icon={<Wallet className="h-5 w-5" />} color="blue" />
          <StatCard title="Portfolio at Risk (Overdue)" value={formatCurrency(portfolio.portfolioAtRisk)} icon={<ShieldAlert className="h-5 w-5" />} color="red" />
        </div>
      </section>

      {/* 2. CASH FLOW — Actual money movement */}
      <section>
        <SectionHeader
          title="Cash Flow"
          description="Real cash in and out. Net Cash Movement is NOT profit — it just shows current liquidity position."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Cash In (Collections)" value={formatCurrency(cashFlow.totalCashIn)} icon={<ArrowDownCircle className="h-5 w-5" />} color="green" />
          <StatCard title="Total Cash Out (Disbursements)" value={formatCurrency(cashFlow.totalCashOut)} icon={<ArrowUpCircle className="h-5 w-5" />} color="red" />
          <StatCard title="Net Cash Movement" value={formatCurrency(cashFlow.netCashMovement)} icon={<Banknote className="h-5 w-5" />} color={cashFlow.netCashMovement >= 0 ? 'green' : 'red'} />
        </div>
      </section>

      {/* 3. INCOME — Revenue earned */}
      <section>
        <SectionHeader
          title="Income (Revenue)"
          description="What the business has earned. Interest is recognized as it is collected."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Interest Income" value={formatCurrency(income.interestIncome)} icon={<TrendingUp className="h-5 w-5" />} color="green" />
          <StatCard title="Penalty Income" value={formatCurrency(income.penaltyIncome)} icon={<Receipt className="h-5 w-5" />} color="amber" />
          <StatCard title="Total Revenue" value={formatCurrency(income.totalRevenue)} icon={<PiggyBank className="h-5 w-5" />} color="green" />
        </div>
      </section>

      {/* 4. LOSSES — Expenses against revenue */}
      <section>
        <SectionHeader
          title="Losses & Provisions"
          description="Money lost or expected to be lost. Provisions estimate future losses on overdue loans (50% of overdue balance)."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Loan Write-Offs" value={formatCurrency(losses.writeOffs)} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
          <StatCard title="Loan-Loss Provisions" value={formatCurrency(losses.loanLossProvisions)} icon={<ShieldAlert className="h-5 w-5" />} color="amber" />
          <StatCard title="Total Losses" value={formatCurrency(losses.totalLosses)} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
        </div>
      </section>

      {/* 5. PROFITABILITY */}
      <section>
        <SectionHeader
          title="Profitability"
          description="Gross Profit = Total Revenue − Total Losses. Excludes operating expenses (salaries, rent, etc.) which are not tracked in this system."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Revenue" value={formatCurrency(income.totalRevenue)} icon={<PiggyBank className="h-5 w-5" />} color="green" />
          <StatCard title="Less: Total Losses" value={`− ${formatCurrency(losses.totalLosses)}`} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
          <StatCard title="Gross Profit" value={formatCurrency(profitability.grossProfit)} icon={<Banknote className="h-5 w-5" />} color={profitColor} />
        </div>
      </section>

      {/* Ledger */}
      <section>
        <SectionHeader
          title="Transaction Ledger"
          description="Individual accounting entries. Each repayment posts two entries — Principal Repaid and Interest Earned — that together equal the full payment."
        />
        <div className="flex items-center gap-3 mb-3">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {TRANSACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <span className="text-sm text-gray-500">{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}</span>
        </div>
        <DataTable columns={columns} data={filtered} searchPlaceholder="Search entries..." />
      </section>
    </div>
  );
}
