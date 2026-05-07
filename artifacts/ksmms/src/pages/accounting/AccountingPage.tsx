import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import { DollarSign, TrendingUp, Receipt, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import type { AccountingEntry } from '../../lib/types';

const TYPE_LABELS: Record<string, string> = {
  disbursement: 'Disbursement',
  repayment: 'Repayment',
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
  { value: 'repayment', label: 'Repayment' },
  { value: 'interest_earned', label: 'Interest Earned' },
  { value: 'penalty', label: 'Penalty' },
  { value: 'write_off', label: 'Write-Off' },
] as const;

export default function AccountingPage() {
  const { addNotification } = useNotification();
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => { loadEntries(); }, []);

  async function loadEntries() {
    try {
      const { data, error } = await supabase
        .from('accounting_entries')
        .select('*, creator:user_profiles!accounting_entries_created_by_fkey(full_name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEntries((data as unknown as AccountingEntry[]) || []);
    } catch {
      addNotification('error', 'Failed to load accounting entries');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() =>
    typeFilter ? entries.filter(e => e.transaction_type === typeFilter) : entries
  , [entries, typeFilter]);

  const stats = useMemo(() => {
    const sum = (type: string) => entries.filter(e => e.transaction_type === type).reduce((s, e) => s + e.amount, 0);
    return {
      disbursed: sum('disbursement'),
      collected: sum('repayment'),
      interest: sum('interest_earned'),
      outstanding: sum('disbursement') - sum('repayment') - sum('write_off'),
    };
  }, [entries]);

  const columns = [
    {
      key: 'transaction_type', header: 'Type',
      render: (e: AccountingEntry) => <Badge colorClass={TYPE_COLORS[e.transaction_type]}>{TYPE_LABELS[e.transaction_type]}</Badge>,
    },
    { key: 'amount', header: 'Amount', render: (e: AccountingEntry) => formatCurrency(e.amount) },
    { key: 'description', header: 'Description' },
    {
      key: 'creator', header: 'Created By',
      render: (e: AccountingEntry) => (e as any).creator?.full_name || '—',
    },
    { key: 'created_at', header: 'Date', render: (e: AccountingEntry) => formatDateTime(e.created_at) },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
        <p className="text-sm text-gray-500 mt-1">Financial transactions and summary</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Disbursed" value={formatCurrency(stats.disbursed)} icon={<DollarSign className="h-5 w-5" />} color="red" />
        <StatCard title="Total Collected" value={formatCurrency(stats.collected)} icon={<Receipt className="h-5 w-5" />} color="green" />
        <StatCard title="Interest Earned" value={formatCurrency(stats.interest)} icon={<TrendingUp className="h-5 w-5" />} color="blue" />
        <StatCard title="Outstanding Balance" value={formatCurrency(stats.outstanding)} icon={<AlertTriangle className="h-5 w-5" />} color="amber" />
      </div>

      <div className="flex items-center gap-3">
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          {TRANSACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <DataTable columns={columns} data={filtered} searchPlaceholder="Search entries..." />
    </div>
  );
}
