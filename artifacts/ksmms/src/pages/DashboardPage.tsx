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
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {roleName ? ROLE_DESCRIPTIONS[roleName] : 'Microfinance Management System'}
          </p>
        </div>
        {roleName && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
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
            className="bg-brand-50 border border-brand-200 rounded-xl p-4 cursor-pointer hover:bg-brand-100 transition-colors"
            onClick={() => navigate('/loans/new')}
          >
            <div className="flex items-center gap-2 mb-2">
              <HandCoins className="h-5 w-5 text-brand-600" />
              <span className="text-sm font-medium text-brand-700">New Loan Application</span>
            </div>
            <p className="text-xs text-brand-600">Click to submit a new loan application for a client</p>
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
              className="bg-red-50 border border-red-200 rounded-xl p-4 cursor-pointer hover:bg-red-100 transition-colors"
              onClick={() => navigate('/loans?status=overdue')}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-700">Overdue Loans</span>
              </div>
              <p className="text-3xl font-bold text-red-700 mt-2">{stats.overdueLoans}</p>
            </div>
          )}

          {canApproveLoans && (
            <div
              className="bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() => navigate('/loans?status=pending')}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Pending Approval</span>
              </div>
              <p className="text-3xl font-bold text-amber-700 mt-2">{stats.pendingLoans}</p>
            </div>
          )}

          {/* Loan officers: show pending in their context (they submitted, awaiting decision) */}
          {hasRole(['loan_officer']) && (
            <div
              className="bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer hover:bg-amber-100 transition-colors"
              onClick={() => navigate('/loans?status=pending')}
            >
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Awaiting Approval</span>
              </div>
              <p className="text-3xl font-bold text-amber-700 mt-2">{stats.pendingLoans}</p>
            </div>
          )}

          {canSeeFinancials && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Total Disbursed</span>
              </div>
              <p className="text-3xl font-bold text-green-700 mt-2">{formatCurrency(stats.totalDisbursed)}</p>
            </div>
          )}

          {/* Cashier quick action: record repayment */}
          {hasRole(['cashier']) && !canApproveLoans && (
            <div
              className="bg-brand-50 border border-brand-200 rounded-xl p-4 cursor-pointer hover:bg-brand-100 transition-colors"
              onClick={() => navigate('/repayments/new')}
            >
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-brand-600" />
                <span className="text-sm font-medium text-brand-700">Record Repayment</span>
              </div>
              <p className="text-xs text-brand-600 mt-2">Click to record a loan repayment</p>
            </div>
          )}

          {/* Accountant quick access */}
          {hasRole(['accountant']) && (
            <div
              className="bg-brand-50 border border-brand-200 rounded-xl p-4 cursor-pointer hover:bg-brand-100 transition-colors"
              onClick={() => navigate('/accounting')}
            >
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-brand-600" />
                <span className="text-sm font-medium text-brand-700">Accounting Entries</span>
              </div>
              <p className="text-xs text-brand-600 mt-2">View all disbursements and repayments</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Loan Applications — shown to all who can see loans */}
        {canSeeLoans && (
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Loan Applications</h3>
            {stats.recentLoans.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent loans</p>
            ) : (
              <div className="space-y-3">
                {stats.recentLoans.map((loan) => (
                  <div
                    key={loan.id}
                    onClick={() => navigate(`/loans/${loan.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{loan.loan_number}</p>
                      <p className="text-xs text-gray-500">
                        {loan.client?.first_name} {loan.client?.last_name} &middot; {formatDate(loan.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-700">{formatCurrency(loan.principal)}</span>
                      <Badge colorClass={LOAN_STATUS_COLORS[loan.status] || 'bg-gray-100 text-gray-800'}>
                        {loan.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Recent Repayments — shown to all who can see repayments */}
        {canSeeRepayments && (
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Repayments</h3>
            {stats.recentRepayments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent repayments</p>
            ) : (
              <div className="space-y-3">
                {stats.recentRepayments.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.receipt_number}</p>
                      <p className="text-xs text-gray-500">
                        {r.loan?.loan_number} &middot; {r.loan?.client?.first_name} {r.loan?.client?.last_name} &middot; {formatDate(r.payment_date)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-green-700">{formatCurrency(r.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Loan officers only see one table — fill with a quick guidance card */}
        {canSeeLoans && !canSeeRepayments && (
          <Card>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Your Responsibilities</h3>
            <div className="space-y-3">
              {[
                { icon: <Users className="h-4 w-4 text-blue-600" />, label: 'Register Clients', desc: 'Add new individual or business clients with KYC', path: '/clients' },
                { icon: <HandCoins className="h-4 w-4 text-teal-600" />, label: 'Submit Loan Applications', desc: 'Apply for loans on behalf of clients', path: '/loans/new' },
                { icon: <FileText className="h-4 w-4 text-purple-600" />, label: 'Upload Documents', desc: 'Upload KYC and loan documents for verification', path: '/documents' },
              ].map((item) => (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
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
