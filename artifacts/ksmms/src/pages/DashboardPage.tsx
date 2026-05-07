import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { Users, FileText, DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatCurrency, formatDate, LOAN_STATUS_COLORS } from '../lib/utils';

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

export default function DashboardPage() {
  const { profile } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {profile?.full_name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Clients"
          value={stats.totalClients}
          icon={<Users className="h-5 w-5" />}
          color="blue"
          onClick={() => navigate('/clients')}
        />
        <StatCard
          title="Active Loans"
          value={stats.activeLoans}
          icon={<FileText className="h-5 w-5" />}
          color="teal"
          onClick={() => navigate('/loans?status=active')}
        />
        <StatCard
          title="Outstanding Balance"
          value={formatCurrency(stats.outstandingBalance)}
          icon={<DollarSign className="h-5 w-5" />}
          color="amber"
        />
        <StatCard
          title="Total Collected"
          value={formatCurrency(stats.totalCollected)}
          icon={<TrendingUp className="h-5 w-5" />}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        <div
          className="bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer hover:bg-amber-100 transition-colors"
          onClick={() => navigate('/loans?status=pending')}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">Pending Approval</span>
          </div>
          <p className="text-3xl font-bold text-amber-700 mt-2">{stats.pendingLoans}</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-700">Total Disbursed</span>
          </div>
          <p className="text-3xl font-bold text-green-700 mt-2">{formatCurrency(stats.totalDisbursed)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    <p className="text-xs text-gray-500">{loan.client?.first_name} {loan.client?.last_name} · {formatDate(loan.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">{formatCurrency(loan.principal)}</span>
                    <Badge colorClass={LOAN_STATUS_COLORS[loan.status] || 'bg-gray-100 text-gray-800'}>{loan.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

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
                      {r.loan?.loan_number} · {r.loan?.client?.first_name} {r.loan?.client?.last_name} · {formatDate(r.payment_date)}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-green-700">{formatCurrency(r.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
