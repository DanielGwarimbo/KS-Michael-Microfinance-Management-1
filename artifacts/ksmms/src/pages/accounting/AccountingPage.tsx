import { useEffect, useState, useMemo, type ReactNode } from 'react';
import { getAccountingEntries, getAccountingStats } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { DollarSign, TrendingUp, Receipt, TriangleAlert as AlertTriangle, Banknote, Wallet, CircleArrowDown as ArrowDownCircle, CircleArrowUp as ArrowUpCircle, Layers, ShieldAlert, PiggyBank, Printer } from 'lucide-react';
import { formatCurrency, formatDateTime, classNames } from '../../lib/utils';
import type { AccountingEntry } from '../../lib/types';
import { printAccountingStatement, type AccountingStatementData } from '../../lib/printUtils';

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

const EMPTY_STATS: AccountingStatementData = {
  portfolio: { totalDisbursed: 0, grossLoanPortfolio: 0, principalOutstanding: 0, portfolioAtRisk: 0, activeLoanCount: 0 },
  cashFlow: { totalCashIn: 0, totalCashOut: 0, netCashMovement: 0 },
  income: { interestIncome: 0, penaltyIncome: 0, totalRevenue: 0 },
  losses: { writeOffs: 0, loanLossProvisions: 0, totalLosses: 0 },
  profitability: { grossProfit: 0 },
};

const CARD_COLORS = {
  teal:  { bg: 'bg-brand-50',    text: 'text-brand-600'   },
  blue:  { bg: 'bg-blue-50',     text: 'text-blue-600'    },
  amber: { bg: 'bg-amber-50',    text: 'text-amber-500'   },
  green: { bg: 'bg-emerald-50',  text: 'text-emerald-600' },
  red:   { bg: 'bg-red-50',      text: 'text-red-500'     },
  gray:  { bg: 'bg-gray-50',     text: 'text-gray-500'    },
} as const;

function KpiCard({ title, value, icon, color = 'teal', accent }: {
  title: string; value: string; icon: ReactNode;
  color?: keyof typeof CARD_COLORS; accent?: boolean;
}) {
  const c = CARD_COLORS[color];
  return (
    <div className={classNames(
      'bg-white rounded-2xl p-5 shadow-card transition-all duration-200',
      accent ? 'ring-1 ring-brand-100' : '',
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={`h-10 w-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <span className={c.text}>{icon}</span>
        </div>
      </div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-display">{title}</p>
      <p className={classNames(
        'mt-1 text-2xl font-bold font-display leading-tight',
        accent ? 'text-brand-700' : 'text-gray-900',
      )}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest font-display mb-3">{title}</h2>
      {children}
    </section>
  );
}

export default function AccountingPage() {
  const { addNotification } = useNotification();
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [stats, setStats] = useState<AccountingStatementData>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [entriesData, statsData] = await Promise.all([
        getAccountingEntries(),
        getAccountingStats(),
      ]);
      setEntries(entriesData);
      setStats(statsData || EMPTY_STATS);
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
      <div className="animate-spin h-8 w-8 border-[3px] border-brand-200 border-t-brand-600 rounded-full" />
    </div>
  );

  const { portfolio, cashFlow, income, losses, profitability } = stats;
  const profitPositive = profitability.grossProfit >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Accounting</h1>
          <p className="text-sm text-gray-500 mt-1">Portfolio, cash flow, income, losses and profitability</p>
        </div>
        <Button onClick={() => printAccountingStatement(stats, formatCurrency)}>
          <Printer className="h-4 w-4 mr-2" />
          Print Statement
        </Button>
      </div>

      {/* Loan Portfolio */}
      <Section title="Loan Portfolio">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="Total Disbursed"      value={formatCurrency(portfolio.totalDisbursed)}      icon={<DollarSign  className="h-5 w-5" />} color="blue"  />
          <KpiCard title="Gross Portfolio"      value={formatCurrency(portfolio.grossLoanPortfolio)}  icon={<Layers      className="h-5 w-5" />} color="teal"  />
          <KpiCard title="Principal Outstanding" value={formatCurrency(portfolio.principalOutstanding)} icon={<Wallet     className="h-5 w-5" />} color="teal"  />
          <KpiCard title="Portfolio at Risk"    value={formatCurrency(portfolio.portfolioAtRisk)}     icon={<ShieldAlert className="h-5 w-5" />} color="red"   />
        </div>
      </Section>

      {/* Cash Flow */}
      <Section title="Cash Flow">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard title="Total Cash In"   value={formatCurrency(cashFlow.totalCashIn)}      icon={<ArrowDownCircle className="h-5 w-5" />} color="green" />
          <KpiCard title="Total Cash Out"  value={formatCurrency(cashFlow.totalCashOut)}     icon={<ArrowUpCircle   className="h-5 w-5" />} color="red"   />
          <KpiCard title="Net Movement"    value={formatCurrency(cashFlow.netCashMovement)}  icon={<Banknote        className="h-5 w-5" />} color={cashFlow.netCashMovement >= 0 ? 'green' : 'red'} />
        </div>
      </Section>

      {/* Income */}
      <Section title="Income (Revenue)">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard title="Interest Income" value={formatCurrency(income.interestIncome)} icon={<TrendingUp className="h-5 w-5" />} color="green" />
          <KpiCard title="Penalty Income"  value={formatCurrency(income.penaltyIncome)}  icon={<Receipt    className="h-5 w-5" />} color="amber" />
          <KpiCard title="Total Revenue"   value={formatCurrency(income.totalRevenue)}   icon={<PiggyBank  className="h-5 w-5" />} color="green" accent />
        </div>
      </Section>

      {/* Losses */}
      <Section title="Losses & Provisions">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard title="Write-Offs"       value={formatCurrency(losses.writeOffs)}          icon={<AlertTriangle className="h-5 w-5" />} color="red"   />
          <KpiCard title="Loss Provisions"  value={formatCurrency(losses.loanLossProvisions)} icon={<ShieldAlert   className="h-5 w-5" />} color="amber" />
          <KpiCard title="Total Losses"     value={formatCurrency(losses.totalLosses)}        icon={<AlertTriangle className="h-5 w-5" />} color="red"   accent />
        </div>
      </Section>

      {/* Profitability */}
      <Section title="Profitability">
        <div className="bg-white rounded-2xl shadow-card p-6">
          <div className="flex items-center justify-between py-2 text-sm">
            <span className="text-gray-500">Total Revenue</span>
            <span className="font-semibold text-gray-900 font-display tabular-nums">{formatCurrency(income.totalRevenue)}</span>
          </div>
          <div className="flex items-center justify-between py-2 text-sm border-b border-gray-100">
            <span className="text-gray-500">Less: Total Losses</span>
            <span className="font-semibold text-red-600 font-display tabular-nums">− {formatCurrency(losses.totalLosses)}</span>
          </div>
          <div className="flex items-center justify-between pt-4">
            <span className="text-sm font-bold text-gray-900 uppercase tracking-widest font-display">Gross Profit</span>
            <span className={classNames(
              'text-2xl font-extrabold font-display tabular-nums',
              profitPositive ? 'text-emerald-600' : 'text-red-600',
            )}>{formatCurrency(profitability.grossProfit)}</span>
          </div>
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">
            Net Profit (after operating expenses such as salaries, rent and utilities) is not shown — those expenses are not tracked in this system.
          </p>
        </div>
      </Section>

      {/* Ledger */}
      <Section title="Transaction Ledger">
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
      </Section>
    </div>
  );
}
