import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import { formatCurrency } from '../../lib/utils';
import type { Loan } from '../../lib/types';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import { FileBarChart, Download, Clock, Users } from 'lucide-react';

type ReportTab = 'portfolio' | 'overdue' | 'officer';

function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [headers.join(','), ...data.map(row => headers.map(h => {
    const val = row[h];
    const str = String(val ?? '');
    return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
  }).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { addNotification } = useNotification();
  const [tab, setTab] = useState<ReportTab>('portfolio');
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState({ totalLoans: 0, activeLoans: 0, totalDisbursed: 0, totalCollected: 0, outstandingBalance: 0, interestEarned: 0 });
  const [overdueLoans, setOverdueLoans] = useState<Loan[]>([]);
  const [officers, setOfficers] = useState<Array<{ name: string; totalClients: number; totalLoans: number; totalDisbursed: number; totalCollected: number }>>([]);

  useEffect(() => { loadReportData(); }, [tab]);

  async function loadReportData() {
    setLoading(true);
    try {
      const [loansRes, repaymentsRes, accountingRes] = await Promise.all([
        supabase.from('loans').select('*, client:clients(first_name, last_name)'),
        supabase.from('repayments').select('amount, received_by'),
        supabase.from('accounting_entries').select('transaction_type, amount'),
      ]);
      const loans = (loansRes.data || []) as Loan[];
      const repayments = repaymentsRes.data || [];
      const entries = accountingRes.data || [];

      const activeLoans = loans.filter(l => l.status === 'active');
      const overdue = loans.filter(l => l.status === 'overdue');
      const disbursed = loans.filter(l => ['active','overdue','closed','defaulted'].includes(l.status));
      const totalDisbursed = disbursed.reduce((s, l) => s + Number(l.principal), 0);
      const totalCollected = repayments.reduce((s, r) => s + Number(r.amount), 0);
      const outstanding = [...activeLoans, ...overdue].reduce((s, l) => s + Number(l.outstanding_balance), 0);
      const interestEarned = entries.filter(e => e.transaction_type === 'interest_earned').reduce((s, e) => s + Number(e.amount), 0);

      setPortfolio({ totalLoans: loans.length, activeLoans: activeLoans.length, totalDisbursed, totalCollected, outstandingBalance: outstanding, interestEarned });
      setOverdueLoans(overdue);

      if (tab === 'officer') {
        const [officersRes, clientsRes] = await Promise.all([
          supabase.from('user_profiles').select('id, full_name').eq('is_active', true),
          supabase.from('clients').select('assigned_officer_id'),
        ]);
        const officerProfiles = officersRes.data || [];
        const allClients = clientsRes.data || [];
        const officerData = officerProfiles.map(o => {
          const oLoans = loans.filter(l => l.created_by === o.id);
          const oClients = allClients.filter(c => c.assigned_officer_id === o.id);
          const oCollected = repayments.filter(r => r.received_by === o.id).reduce((s, r) => s + Number(r.amount), 0);
          return { name: o.full_name, totalClients: oClients.length, totalLoans: oLoans.length, totalDisbursed: oLoans.reduce((s, l) => s + Number(l.principal), 0), totalCollected: oCollected };
        });
        setOfficers(officerData);
      }
    } catch (err) {
      console.error('Report load error:', err);
      addNotification('error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }

  function getDaysOverdue(loan: Loan): number {
    if (!loan.maturity_date) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(loan.maturity_date).getTime()) / 86400000));
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" /></div>;
  }

  const tabs: { key: ReportTab; label: string; icon: React.ReactNode }[] = [
    { key: 'portfolio', label: 'Portfolio Report', icon: <FileBarChart className="h-4 w-4" /> },
    { key: 'overdue', label: 'Overdue Loans', icon: <Clock className="h-4 w-4" /> },
    { key: 'officer', label: 'Loan Officer Performance', icon: <Users className="h-4 w-4" /> },
  ];

  const overdueRows = overdueLoans.map(l => ({ client: l.client ? `${l.client.first_name} ${l.client.last_name}` : '—', loan_number: l.loan_number, outstanding_balance: formatCurrency(l.outstanding_balance), days_overdue: getDaysOverdue(l) }));
  const officerRows = officers.map(o => ({ name: o.name, total_clients: o.totalClients, total_loans: o.totalLoans, total_disbursed: formatCurrency(o.totalDisbursed), total_collected: formatCurrency(o.totalCollected) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <Button variant="outline" size="sm" onClick={() => {
          const data = tab === 'portfolio' ? [{ ...portfolio }] : tab === 'overdue' ? overdueRows : officerRows;
          exportCSV(data as Record<string, unknown>[], `${tab}_report`);
          addNotification('success', 'CSV exported successfully');
        }}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${tab === t.key ? 'bg-teal-50 text-teal-700 border border-b-0 border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'portfolio' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard title="Total Loans" value={portfolio.totalLoans} icon={<FileBarChart className="h-6 w-6" />} color="blue" />
          <StatCard title="Active Loans" value={portfolio.activeLoans} icon={<FileBarChart className="h-6 w-6" />} color="teal" />
          <StatCard title="Total Disbursed" value={formatCurrency(portfolio.totalDisbursed)} icon={<FileBarChart className="h-6 w-6" />} color="green" />
          <StatCard title="Total Collected" value={formatCurrency(portfolio.totalCollected)} icon={<FileBarChart className="h-6 w-6" />} color="teal" />
          <StatCard title="Outstanding Balance" value={formatCurrency(portfolio.outstandingBalance)} icon={<FileBarChart className="h-6 w-6" />} color="amber" />
          <StatCard title="Interest Earned" value={formatCurrency(portfolio.interestEarned)} icon={<FileBarChart className="h-6 w-6" />} color="green" />
        </div>
      )}

      {tab === 'overdue' && (
        <Card>
          <DataTable columns={[
            { key: 'client', header: 'Client Name' },
            { key: 'loan_number', header: 'Loan Number' },
            { key: 'outstanding_balance', header: 'Outstanding Balance' },
            { key: 'days_overdue', header: 'Days Overdue', render: (item) => <Badge colorClass={item.days_overdue > 30 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}>{item.days_overdue}</Badge> },
          ]} data={overdueRows} searchable searchPlaceholder="Search overdue loans..." />
        </Card>
      )}

      {tab === 'officer' && (
        <Card>
          <DataTable columns={[
            { key: 'name', header: 'Officer Name' },
            { key: 'total_clients', header: 'Total Clients' },
            { key: 'total_loans', header: 'Total Loans' },
            { key: 'total_disbursed', header: 'Total Disbursed' },
            { key: 'total_collected', header: 'Total Collected' },
          ]} data={officerRows} searchable searchPlaceholder="Search officers..." />
        </Card>
      )}
    </div>
  );
}
