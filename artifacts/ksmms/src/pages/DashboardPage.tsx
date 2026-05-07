import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import {
  Users, FileText, DollarSign, TrendingUp,
  AlertTriangle, CheckCircle, Clock, HandCoins,
  Receipt, Calculator,
} from 'lucide-react';
import { formatCurrency, formatDate, LOAN_STATUS_COLORS, ROLE_LABELS } from '../lib/utils';
import type { RoleName } from '../lib/types';

interface DashboardStats {
  totalClients: number;
  activeLoans: number;
  totalDisbursed: number;
  totalCollected: number;
  outstandingBalance: number;
  overdueLoans: number;
  pendingLoans: number;
  recentLoans: Array<{
    id: string;
    loan_number: string;
    status: string;
    principal: number;
    created_at: string;
    client: { first_name: string; last_name: string };
  }>;
  recentRepayments: Array<{
    id: string;
    receipt_number: string;
    amount: number;
    payment_date: string;
    loan: { loan_number: string; client: { first_name: string; last_name: string } };
  }>;
}

const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  admin:        'Full system access — manage all operations, users, and settings.',
  manager:      'Oversee loans, clients, accounting, and audit trail.',
  loan_officer: 'Manage client registrations and loan applications.',
  cashier:      'Process loan disbursements and record repayments.',
  accountant:   'View financial records, accounting entries, and generate reports.',
};

export default function DashboardPage() {
  const { profile, hasRole } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const roleName = profile?.role?.name as RoleName | undefined;

  // Access helpers
  const canSeeClients    = hasRole(['admin', 'manager', 'loan_officer']);
  const canSeeLoans      = hasRole(['admin', 'manager', 'loan_officer', 'cashier']);
  const canSeeRepayments = hasRole(['admin', 'manager', 'cashier', 'accountant']);
  const canSeeFinancials = hasRole(['admin', 'manager', 'cashier', 'accountant']);
  const canApproveLoans  = hasRole(['admin', 'manager']);

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    try {
      const { data, error } = await api.get<DashboardStats>('/dashboard/stats');
      if (error) throw new Error(error);
      setStats(data);
    } catch {
      addNotification('error', 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-gray-900 tracking-tight">
            Welcome, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-400 mt-1 font-medium">
            {roleName ? ROLE_DESCRIPTIONS[roleName] : 'Microfinance Management System'}
          </p>
        </div>
        {roleName && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold font-display tracking-wide bg-brand-50 text-brand-600 border border-brand-100">
            {ROLE_LABELS[roleName] ?? roleName}
          </span>
        )}
      </div>

      {/* Primary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {canSeeClients && (
          <StatCard
            title="Total Clients"
            value={stats.totalClients}
            icon={<Users className="h-5 w-5" />}
            color="blue"
            onClick={() => navigate('/clients')}
          />
        )}
        {canSeeLoans && (
          <StatCard
            title="Active Loans"
            value={stats.activeLoans}
            icon={<HandCoins className="h-5 w-5" />}
            color="teal"
            onClick={() => navigate('/loans?status=active')}
          />
        )}
        {canSeeFinancials && (
          <StatCard
            title="Outstanding Balance"
            value={formatCurrency(stats.outstandingBalance)}
            icon={<DollarSign className="h-5 w-5" />}
            color="amber"
          />
        )}
        {canSeeFinancials && (
          <StatCard
            title="Total Collected"
            value={formatCurrency(stats.totalCollected)}
            icon={<TrendingUp className="h-5 w-5" />}
            color="green"
            onClick={canSeeRepayments ? () => navigate('/repayments') : undefined}
          />
        )}
        {/* Loan Officers see 2 stats — fill remaining space with a quick-action card */}
        {!canSeeFinancials && canSeeClients && canSeeLoans && (
          <div
            className="bg-white border-t-2 border-t-brand-500 border border-gray-100 rounded-2xl p-5 cursor-pointer hover:shadow-card-md hover:-translate-y-0.5 transition-all duration-200 shadow-card"
            onClick={() => navigate('/loans/new')}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-display">Quick Action</span>
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
                <HandCoins className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="font-display text-[15px] font-bold text-gray-900 mt-1">New Loan Application</p>
            <p className="text-xs text-gray-400 mt-1">Submit a new loan application</p>
          </div>
        )}
        {/* Accountants don't see Loans/Clients — show Disbursed as a 4th card */}
        {!canSeeClients && !canSeeLoans && canSeeFinancials && (
          <StatCard
            title="Total Disbursed"
            value={formatCurrency(stats.totalDisbursed)}
            icon={<FileText className="h-5 w-5" />}
            color="blue"
          />
        )}
      </div>

      {/* Secondary Action Cards */}
      {(canSeeLoans || canSeeFinancials) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {canSeeLoans && (
            <div
              className="bg-white border border-gray-100 border-t-2 border-t-red-500 rounded-2xl p-5 cursor-pointer hover:shadow-card-md hover:-translate-y-0.5 transition-all duration-200 shadow-card"
              onClick={() => navigate('/loans?status=overdue')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-display">Overdue</span>
                <div className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </div>
              </div>
              <p className="font-display text-3xl font-extrabold text-red-600 leading-none">{stats.overdueLoans}</p>
              <p className="text-xs text-gray-400 mt-1.5">Loans requiring attention</p>
            </div>
          )}

          {canApproveLoans && (
            <div
              className="bg-white border border-gray-100 border-t-2 border-t-amber-400 rounded-2xl p-5 cursor-pointer hover:shadow-card-md hover:-translate-y-0.5 transition-all duration-200 shadow-card"
              onClick={() => navigate('/loans?status=pending')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-display">Pending</span>
                <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
              </div>
              <p className="font-display text-3xl font-extrabold text-amber-600 leading-none">{stats.pendingLoans}</p>
              <p className="text-xs text-gray-400 mt-1.5">Awaiting your approval</p>
            </div>
          )}

          {hasRole(['loan_officer']) && (
            <div
              className="bg-white border border-gray-100 border-t-2 border-t-amber-400 rounded-2xl p-5 cursor-pointer hover:shadow-card-md hover:-translate-y-0.5 transition-all duration-200 shadow-card"
              onClick={() => navigate('/loans?status=pending')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-display">Pending</span>
                <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
              </div>
              <p className="font-display text-3xl font-extrabold text-amber-600 leading-none">{stats.pendingLoans}</p>
              <p className="text-xs text-gray-400 mt-1.5">Awaiting manager approval</p>
            </div>
          )}

          {canSeeFinancials && (
            <div className="bg-white border border-gray-100 border-t-2 border-t-emerald-500 rounded-2xl p-5 shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-display">Disbursed</span>
                <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
              <p className="font-display text-xl font-extrabold text-emerald-700 leading-none">{formatCurrency(stats.totalDisbursed)}</p>
              <p className="text-xs text-gray-400 mt-1.5">Total funds disbursed</p>
            </div>
          )}

          {hasRole(['cashier']) && !canApproveLoans && (
            <div
              className="bg-white border border-gray-100 border-t-2 border-t-brand-500 rounded-2xl p-5 cursor-pointer hover:shadow-card-md hover:-translate-y-0.5 transition-all duration-200 shadow-card"
              onClick={() => navigate('/repayments/new')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-display">Quick Action</span>
                <div className="h-9 w-9 rounded-xl bg-brand-50 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-brand-600" />
                </div>
              </div>
              <p className="font-display text-[15px] font-bold text-gray-900">Record Repayment</p>
              <p className="text-xs text-gray-400 mt-1">Click to record a payment</p>
            </div>
          )}

          {hasRole(['accountant']) && (
            <div
              className="bg-white border border-gray-100 border-t-2 border-t-brand-500 rounded-2xl p-5 cursor-pointer hover:shadow-card-md hover:-translate-y-0.5 transition-all duration-200 shadow-card"
              onClick={() => navigate('/accounting')}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-display">Quick Access</span>
                <div className="h-9 w-9 rounded-xl bg-brand-50 flex items-center justify-center">
                  <Calculator className="h-4 w-4 text-brand-600" />
                </div>
              </div>
              <p className="font-display text-[15px] font-bold text-gray-900">Accounting Entries</p>
              <p className="text-xs text-gray-400 mt-1">View disbursements &amp; repayments</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Loan Applications — shown to all who can see loans */}
        {canSeeLoans && (
          <Card>
            <h3 className="font-display text-[15px] font-bold text-gray-900 mb-4 tracking-tight">Recent Loan Applications</h3>
            {stats.recentLoans.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No recent loans</p>
            ) : (
              <div className="space-y-2">
                {stats.recentLoans.map((loan) => (
                  <div
                    key={loan.id}
                    onClick={() => navigate(`/loans/${loan.id}`)}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-all duration-150 group"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900 font-display group-hover:text-brand-600 transition-colors">{loan.loan_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {loan.client?.first_name} {loan.client?.last_name} &middot; {formatDate(loan.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-700 font-display">{formatCurrency(loan.principal)}</span>
                      <Badge colorClass={LOAN_STATUS_COLORS[loan.status] || 'bg-gray-100 text-gray-600'}>
                        {loan.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {canSeeRepayments && (
          <Card>
            <h3 className="font-display text-[15px] font-bold text-gray-900 mb-4 tracking-tight">Recent Repayments</h3>
            {stats.recentRepayments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No recent repayments</p>
            ) : (
              <div className="space-y-2">
                {stats.recentRepayments.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 font-display">{r.receipt_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {r.loan?.loan_number} &middot; {r.loan?.client?.first_name} {r.loan?.client?.last_name} &middot; {formatDate(r.payment_date)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 font-display">{formatCurrency(r.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {canSeeLoans && !canSeeRepayments && (
          <Card>
            <h3 className="font-display text-[15px] font-bold text-gray-900 mb-4 tracking-tight">Your Responsibilities</h3>
            <div className="space-y-2">
              {[
                { icon: <Users className="h-4 w-4 text-blue-500" />, iconBg: 'bg-blue-50', label: 'Register Clients', desc: 'Add new individual or business clients with KYC', path: '/clients' },
                { icon: <HandCoins className="h-4 w-4 text-brand-600" />, iconBg: 'bg-brand-50', label: 'Submit Loan Applications', desc: 'Apply for loans on behalf of clients', path: '/loans/new' },
                { icon: <FileText className="h-4 w-4 text-purple-500" />, iconBg: 'bg-purple-50', label: 'Upload Documents', desc: 'Upload KYC and loan documents for verification', path: '/documents' },
              ].map((item) => (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/80 cursor-pointer transition-all duration-150 group"
                >
                  <div className={`h-9 w-9 rounded-lg ${item.iconBg} flex items-center justify-center flex-shrink-0`}>{item.icon}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 font-display group-hover:text-brand-600 transition-colors">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
