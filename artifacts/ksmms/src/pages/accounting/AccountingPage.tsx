import { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import { DollarSign, TrendingUp, Receipt, AlertTriangle, Banknote } from 'lucide-react';
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
  totalDisbursed: number;
  totalCollected: number;
  outstandingBalance: number;
  interestEarned: number;
  netProfit: number;
}

export default function AccountingPage() {
  const { addNotification } = useNotification();
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [stats, setStats] = useState<AccountingStats>({ totalDisbursed: 0, totalCollected: 0, outstandingBalance: 0, interestEarned: 0, netProfit: 0 });
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
      setStats(statsRes.data || { totalDisbursed: 0, totalCollected: 0, outstandingBalance: 0, interestEarned: 0 });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
        <p className="text-sm text-gray-500 mt-1">Financial transactions and portfolio summary</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard title="Total Disbursed" value={formatCurrency(stats.totalDisbursed)} icon={<DollarSign className="h-5 w-5" />} color="red" />
        <StatCard title="Total Collected" value={formatCurrency(stats.totalCollected)} icon={<Receipt className="h-5 w-5" />} color="green" />
        <StatCard title="Net Profit" value={formatCurrency(stats.netProfit)} icon={<Banknote className="h-5 w-5" />} color="green" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard title="Interest Earned" value={formatCurrency(stats.interestEarned)} icon={<TrendingUp className="h-5 w-5" />} color="blue" />
        <StatCard title="Outstanding Balance" value={formatCurrency(stats.outstandingBalance)} icon={<AlertTriangle className="h-5 w-5" />} color="amber" />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <strong>Note:</strong> The ledger below shows individual accounting entries. Each repayment creates two entries — <em>Principal Repaid</em> and <em>Interest Earned</em> — which together equal the total payment amount. The summary cards above always reflect the full totals.
      </div>

      <div className="flex items-center gap-3">
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
    </div>
  );
}
