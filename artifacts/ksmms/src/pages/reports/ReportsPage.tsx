import { useEffect, useState, type ReactNode } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import { formatCurrency, formatDate, classNames } from '../../lib/utils';
import type { Loan } from '../../lib/types';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import {
  FileBarChart, Download, Clock, Users, Printer,
  Layers, Activity, DollarSign, Wallet, ShieldAlert, TrendingUp,
} from 'lucide-react';
import { printPortfolioReport, printOverdueReport, printOfficerReport } from '../../lib/printUtils';

type ReportTab = 'portfolio' | 'overdue' | 'officer';

interface PortfolioStats {
  totalLoans: number;
  activeLoans: number;
  totalDisbursed: number;
  totalCollected: number;
  outstandingBalance: number;
  interestEarned: number;
}

const EMPTY_PORTFOLIO: PortfolioStats = {
  totalLoans: 0, activeLoans: 0, totalDisbursed: 0,
  totalCollected: 0, outstandingBalance: 0, interestEarned: 0,
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
  title: string; value: string | number; icon: ReactNode;
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
  link.href = url; link.download = `${filename}.csv`; link.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { addNotification } = useNotification();
  const [tab, setTab] = useState<ReportTab>('portfolio');
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioStats>(EMPTY_PORTFOLIO);
  const [overdueLoans, setOverdueLoans] = useState<Loan[]>([]);
  const [officers, setOfficers] = useState<Array<{ name: string; totalClients: number; totalLoans: number; totalDisbursed: number; totalCollected: number }>>([]);

  useEffect(() => { loadReportData(); }, []);

  async function loadReportData() {
    setLoading(true);
    try {
      const { data, error } = await api.get<any>('/reports/summary');
      if (error) throw new Error(error);
      setPortfolio(data.portfolio || EMPTY_PORTFOLIO);
      setOverdueLoans(data.overdueLoans || []);
      setOfficers(data.officers || []);
    } catch {
      addNotification('error', 'Failed to load report data');
    } finally {
      setLoading(false);
    }
  }

  function getDaysOverdue(loan: Loan): number {
    if (!loan.maturity_date) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(loan.maturity_date).getTime()) / 86400000));
  }

  function handlePrint() {
    if (tab === 'portfolio') printPortfolioReport(portfolio, formatCurrency);
    else if (tab === 'overdue') printOverdueReport(overdueLoans, formatCurrency, formatDate);
    else printOfficerReport(officers, formatCurrency);
  }

  function handleExport() {
    const overdueRows = overdueLoans.map(l => ({
      client: (l.client as any) ? `${(l.client as any).first_name} ${(l.client as any).last_name}` : '—',
      loan_number: l.loan_number,
      outstanding_balance: l.outstanding_balance,
      days_overdue: getDaysOverdue(l),
    }));
    const officerRows = officers.map(o => ({
      name: o.name, total_clients: o.totalClients, total_loans: o.totalLoans,
      total_disbursed: o.totalDisbursed, total_collected: o.totalCollected,
    }));
    const data = tab === 'portfolio' ? [{ ...portfolio }] : tab === 'overdue' ? overdueRows : officerRows;
    exportCSV(data as Record<string, unknown>[], `${tab}_report`);
    addNotification('success', 'CSV exported successfully');
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-[3px] border-brand-200 border-t-brand-600 rounded-full" />
    </div>
  );

  const tabs: { key: ReportTab; label: string; icon: ReactNode }[] = [
    { key: 'portfolio', label: 'Portfolio Summary',   icon: <FileBarChart className="h-4 w-4" /> },
    { key: 'overdue',   label: 'Overdue Loans',        icon: <Clock        className="h-4 w-4" /> },
    { key: 'officer',   label: 'Officer Performance',  icon: <Users        className="h-4 w-4" /> },
  ];

  const overdueRows = overdueLoans.map(l => ({
    client: (l.client as any) ? `${(l.client as any).first_name} ${(l.client as any).last_name}` : '—',
    loan_number: l.loan_number,
    outstanding_balance: formatCurrency(l.outstanding_balance),
    maturity_date: formatDate(l.maturity_date),
    days_overdue: getDaysOverdue(l),
  }));

  const officerRows = officers.map(o => ({
    name: o.name,
    total_clients: o.totalClients,
    total_loans: o.totalLoans,
    total_disbursed: formatCurrency(o.totalDisbursed),
    total_collected: formatCurrency(o.totalCollected),
    collection_rate: o.totalDisbursed > 0
      ? `${((o.totalCollected / o.totalDisbursed) * 100).toFixed(1)}%`
      : '—',
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Portfolio, overdue and loan-officer performance reports</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-card p-1.5 inline-flex gap-1">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={classNames(
              'inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-all font-display',
              tab === t.key
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Portfolio */}
      {tab === 'portfolio' && (
        <Section title="Portfolio Summary">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard title="Total Loans"         value={portfolio.totalLoans}                       icon={<Layers      className="h-5 w-5" />} color="teal"  />
            <KpiCard title="Active Loans"        value={portfolio.activeLoans}                      icon={<Activity    className="h-5 w-5" />} color="blue"  />
            <KpiCard title="Total Disbursed"     value={formatCurrency(portfolio.totalDisbursed)}    icon={<DollarSign  className="h-5 w-5" />} color="blue"  />
            <KpiCard title="Total Collected"     value={formatCurrency(portfolio.totalCollected)}    icon={<Wallet      className="h-5 w-5" />} color="green" />
            <KpiCard title="Outstanding Balance" value={formatCurrency(portfolio.outstandingBalance)} icon={<ShieldAlert className="h-5 w-5" />} color="amber" />
            <KpiCard title="Interest Earned"     value={formatCurrency(portfolio.interestEarned)}    icon={<TrendingUp  className="h-5 w-5" />} color="green" accent />
          </div>
          <p className="text-xs text-gray-400 mt-4 leading-relaxed">
            Numbers shown here match the Accounting page exactly. Interest Earned is the
            interest portion of cash actually collected, derived from each loan's flat-rate ratio.
          </p>
        </Section>
      )}

      {/* Overdue */}
      {tab === 'overdue' && (
        <Section title={`Overdue Loans · ${overdueRows.length} ${overdueRows.length === 1 ? 'loan' : 'loans'}`}>
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <DataTable
              columns={[
                { key: 'client', header: 'Client' },
                { key: 'loan_number', header: 'Loan No.' },
                { key: 'outstanding_balance', header: 'Outstanding' },
                { key: 'maturity_date', header: 'Maturity' },
                {
                  key: 'days_overdue',
                  header: 'Days Overdue',
                  render: (item) => (
                    <Badge colorClass={
                      item.days_overdue > 90 ? 'bg-red-100 text-red-800'
                        : item.days_overdue > 30 ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-700'
                    }>{item.days_overdue} days</Badge>
                  ),
                },
              ]}
              data={overdueRows}
              searchable
              searchPlaceholder="Search overdue loans..."
            />
          </div>
        </Section>
      )}

      {/* Officers */}
      {tab === 'officer' && (
        <Section title="Loan Officer Performance">
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <DataTable
              columns={[
                { key: 'name', header: 'Officer' },
                { key: 'total_clients', header: 'Clients' },
                { key: 'total_loans', header: 'Loans' },
                { key: 'total_disbursed', header: 'Disbursed' },
                { key: 'total_collected', header: 'Collected' },
                { key: 'collection_rate', header: 'Collection Rate' },
              ]}
              data={officerRows}
              searchable
              searchPlaceholder="Search officers..."
            />
          </div>
        </Section>
      )}
    </div>
  );
}
