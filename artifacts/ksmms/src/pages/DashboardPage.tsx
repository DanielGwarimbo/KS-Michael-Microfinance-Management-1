import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import Badge from '../components/ui/Badge';
import {
  Users, FileText, DollarSign, TrendingUp,
  AlertTriangle, Clock, HandCoins, Receipt,
  Calculator, ArrowUpRight, ChevronRight, ShieldAlert,
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
  pendingDocuments: number;
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
  ceo:          'Executive overview — full read access across all modules and reports.',
  manager:      'Oversee loans, clients, accounting, and audit trail.',
  loan_officer: 'Manage client registrations and loan applications.',
  cashier:      'Process loan disbursements and record repayments.',
  accountant:   'View financial records, accounting entries, and generate reports.',
};

const CARD_COLORS = {
  teal:  { bg: 'bg-brand-50', text: 'text-brand-600' },
  blue:  { bg: 'bg-blue-50',  text: 'text-blue-600'  },
  amber: { bg: 'bg-amber-50', text: 'text-amber-500' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  red:   { bg: 'bg-red-50',   text: 'text-red-500'   },
  gold:  { bg: 'bg-gold-50',  text: 'text-gold-500'  },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getClientInitials(first = '', last = '') {
  return `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
}

function formatToday() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: keyof typeof CARD_COLORS;
  onClick?: () => void;
  sub?: string;
}

function KpiCard({ title, value, icon, color = 'teal', onClick, sub }: KpiCardProps) {
  const c = CARD_COLORS[color];
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 shadow-card transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-card-md hover:-translate-y-px group' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`h-10 w-10 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
          <span className={c.text}>{icon}</span>
        </div>
        {onClick && (
          <ArrowUpRight className="h-4 w-4 text-gray-200 group-hover:text-brand-500 transition-colors" />
        )}
      </div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-display">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 font-display leading-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

interface AlertItemProps {
  dot: string;
  glow: string;
  value: string | number;
  label: string;
  onClick?: () => void;
}

function AlertItem({ dot, glow, value, label, onClick }: AlertItemProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`flex items-center gap-3 px-5 py-2 first:pl-0 last:pr-0 ${onClick ? 'hover:opacity-70 transition-opacity text-left' : ''}`}
    >
      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${dot}`} style={{ boxShadow: glow }} />
      <div>
        <p className="text-[15px] font-bold text-gray-900 font-display leading-none">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      </div>
    </Tag>
  );
}

export default function DashboardPage() {
  const { profile, hasRole } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const roleName = profile?.role?.name as RoleName | undefined;
  const canSeeClients    = hasRole(['admin', 'ceo', 'manager', 'loan_officer']);
  const canSeeLoans      = hasRole(['admin', 'ceo', 'manager', 'loan_officer', 'cashier']);
  const canSeeRepayments = hasRole(['admin', 'ceo', 'manager', 'cashier', 'accountant']);
  const canSeeFinancials = hasRole(['admin', 'ceo', 'manager', 'cashier', 'accountant']);
  const canApproveLoans  = hasRole(['admin', 'ceo', 'manager']);
  const canVerifyDocs    = hasRole(['admin', 'ceo', 'manager']);

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
      <div className="animate-spin h-8 w-8 border-[3px] border-brand-200 border-t-brand-600 rounded-full" />
    </div>
  );

  if (!stats) return null;

  return (
    <div className="space-y-5">

      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-2xl px-6 py-5"
        style={{ background: 'linear-gradient(135deg, #071827 0%, #113244 55%, #1B475B 100%)' }}
      >
        {/* decorative orbs */}
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/[0.03] pointer-events-none" />
        <div className="absolute right-20 -bottom-4 h-24 w-24 rounded-full bg-gold-400/[0.07] pointer-events-none" />

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 ring-1 ring-white/10">
              <span className="text-white text-[13px] font-bold font-display">
                {getInitials(profile?.full_name ?? '??')}
              </span>
            </div>
            <div>
              <p className="text-white/40 text-xs font-semibold uppercase tracking-widest font-display">
                {roleName ? ROLE_LABELS[roleName] : 'Staff'}
              </p>
              <h1 className="text-white text-lg font-bold font-display mt-0.5 leading-tight">
                {getGreeting()}, {profile?.full_name}
              </h1>
              <p className="text-white/35 text-xs mt-0.5 leading-tight hidden sm:block">
                {roleName ? ROLE_DESCRIPTIONS[roleName] : ''}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0 hidden sm:block">
            <p className="text-white/25 text-xs uppercase tracking-widest font-display">Today</p>
            <p className="text-white/60 text-xs mt-0.5">{formatToday()}</p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {canSeeClients && (
          <KpiCard
            title="Total Clients"
            value={stats.totalClients}
            icon={<Users className="h-5 w-5" />}
            color="blue"
            onClick={() => navigate('/clients')}
          />
        )}
        {canSeeLoans && (
          <KpiCard
            title="Approved Loans"
            value={stats.activeLoans}
            icon={<HandCoins className="h-5 w-5" />}
            color="teal"
            sub="Approved, active & overdue"
            onClick={() => navigate('/loans')}
          />
        )}
        {canSeeFinancials && (
          <KpiCard
            title="Outstanding"
            value={formatCurrency(stats.outstandingBalance)}
            icon={<DollarSign className="h-5 w-5" />}
            color="amber"
          />
        )}
        {canSeeFinancials && (
          <KpiCard
            title="Total Collected"
            value={formatCurrency(stats.totalCollected)}
            icon={<TrendingUp className="h-5 w-5" />}
            color="green"
            onClick={canSeeRepayments ? () => navigate('/repayments') : undefined}
          />
        )}
        {!canSeeFinancials && canSeeClients && canSeeLoans && (
          <KpiCard
            title="Quick Action"
            value="New Loan"
            icon={<HandCoins className="h-5 w-5" />}
            color="teal"
            onClick={() => navigate('/loans/new')}
            sub="Submit a loan application"
          />
        )}
        {!canSeeClients && !canSeeLoans && canSeeFinancials && (
          <KpiCard
            title="Total Disbursed"
            value={formatCurrency(stats.totalDisbursed)}
            icon={<FileText className="h-5 w-5" />}
            color="blue"
          />
        )}
        {canVerifyDocs && (
          <KpiCard
            title="Pending Verification"
            value={stats.pendingDocuments}
            icon={<ShieldAlert className="h-5 w-5" />}
            color="amber"
            onClick={() => navigate('/documents?verified=false')}
            sub="Documents awaiting review"
          />
        )}
      </div>

      {/* ── Status Strip ───────────────────────────────────────────── */}
      {(canSeeLoans || canSeeFinancials) && (
        <div className="bg-white rounded-2xl shadow-card px-5 py-4">
          <div className="flex items-center overflow-x-auto divide-x divide-gray-100 scrollbar-none">
            {canSeeLoans && (
              <AlertItem
                dot="bg-red-500" glow="0 0 0 3px rgba(239,68,68,0.15)"
                value={stats.overdueLoans} label="Overdue Loans"
                onClick={() => navigate('/loans?status=overdue')}
              />
            )}
            {canApproveLoans && (
              <AlertItem
                dot="bg-amber-400" glow="0 0 0 3px rgba(251,191,36,0.15)"
                value={stats.pendingLoans} label="Pending Approval"
                onClick={() => navigate('/loans?status=pending')}
              />
            )}
            {hasRole(['loan_officer']) && (
              <AlertItem
                dot="bg-amber-400" glow="0 0 0 3px rgba(251,191,36,0.15)"
                value={stats.pendingLoans} label="Awaiting Approval"
                onClick={() => navigate('/loans?status=pending')}
              />
            )}
            {canSeeFinancials && (
              <AlertItem
                dot="bg-emerald-500" glow="0 0 0 3px rgba(16,185,129,0.15)"
                value={formatCurrency(stats.totalDisbursed)} label="Total Disbursed"
              />
            )}
            {hasRole(['cashier']) && !canApproveLoans && (
              <AlertItem
                dot="bg-brand-500" glow="0 0 0 3px rgba(27,71,91,0.15)"
                value="Record" label="New Repayment"
                onClick={() => navigate('/repayments/new')}
              />
            )}
            {hasRole(['accountant']) && (
              <AlertItem
                dot="bg-brand-500" glow="0 0 0 3px rgba(27,71,91,0.15)"
                value="Entries" label="View Accounting"
                onClick={() => navigate('/accounting')}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Recent Activity ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Loans */}
        {canSeeLoans && (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h3 className="font-display text-sm font-bold text-gray-900">Recent Loan Applications</h3>
              <button
                onClick={() => navigate('/loans')}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                View all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {stats.recentLoans.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No recent loans</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {stats.recentLoans.map(loan => (
                  <div
                    key={loan.id}
                    onClick={() => navigate(`/loans/${loan.id}`)}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-brand-700 text-[11px] font-bold font-display">
                        {getClientInitials(loan.client?.first_name, loan.client?.last_name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 font-display group-hover:text-brand-600 transition-colors truncate leading-tight">
                        {loan.loan_number}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {loan.client?.first_name} {loan.client?.last_name} &middot; {formatDate(loan.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold text-gray-800 font-display">
                        {formatCurrency(loan.principal)}
                      </span>
                      <Badge colorClass={LOAN_STATUS_COLORS[loan.status] || 'bg-gray-100 text-gray-600'}>
                        {loan.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Repayments */}
        {canSeeRepayments && (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <h3 className="font-display text-sm font-bold text-gray-900">Recent Repayments</h3>
              <button
                onClick={() => navigate('/repayments')}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
              >
                View all <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {stats.recentRepayments.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">No recent repayments</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {stats.recentRepayments.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                    <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-700 text-[11px] font-bold font-display">
                        {getClientInitials(r.loan?.client?.first_name, r.loan?.client?.last_name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 font-display truncate leading-tight">
                        {r.receipt_number}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {r.loan?.loan_number} &middot; {r.loan?.client?.first_name} {r.loan?.client?.last_name} &middot; {formatDate(r.payment_date)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 font-display flex-shrink-0">
                      {formatCurrency(r.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions — loan officers only */}
        {canSeeLoans && !canSeeRepayments && (
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="font-display text-sm font-bold text-gray-900">Quick Actions</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {[
                { icon: <Users className="h-4 w-4 text-blue-500" />,   iconBg: 'bg-blue-50',   label: 'Register a Client',       desc: 'Add new individual or business client', path: '/clients'   },
                { icon: <HandCoins className="h-4 w-4 text-brand-600" />, iconBg: 'bg-brand-50', label: 'Submit Loan Application', desc: 'Apply for a loan on behalf of a client', path: '/loans/new' },
                { icon: <FileText className="h-4 w-4 text-purple-500" />, iconBg: 'bg-purple-50', label: 'Upload Documents',        desc: 'Upload KYC and loan documents',          path: '/documents' },
              ].map(item => (
                <div
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <div className={`h-8 w-8 rounded-lg ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 font-display group-hover:text-brand-600 transition-colors">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand-500 transition-colors flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
