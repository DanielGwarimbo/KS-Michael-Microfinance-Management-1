import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLoans } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Plus, Eye } from 'lucide-react';
import { formatCurrency, LOAN_STATUS_COLORS, LOAN_PRODUCT_TYPE_LABELS } from '../../lib/utils';
import type { Loan } from '../../lib/types';

export default function LoanListPage() {
  const { roleName } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { loadLoans(); }, [statusFilter]);

  async function loadLoans() {
    try {
      const data = statusFilter ? await getLoans(statusFilter) : await getLoans();
      setLoans(data);
    } catch {
      addNotification('error', 'Failed to load loans');
    } finally {
      setLoading(false);
    }
  }

  const allLoans = loans;

  const columns = [
    { key: 'loan_number', header: 'Loan No.' },
    { key: 'client', header: 'Client', render: (l: Loan) => l.client ? `${(l.client as any).first_name} ${(l.client as any).last_name}` : '—' },
    { key: 'loan_product_type', header: 'Product', render: (l: Loan) => l.loan_product_type ? LOAN_PRODUCT_TYPE_LABELS[l.loan_product_type] || l.loan_product_type : '—' },
    { key: 'principal', header: 'Principal', render: (l: Loan) => formatCurrency(l.principal) },
    { key: 'interest_rate', header: 'Rate', render: (l: Loan) => `${l.interest_rate}%` },
    { key: 'term_months', header: 'Term', render: (l: Loan) => `${l.term_months} mo` },
    { key: 'outstanding_balance', header: 'Balance', render: (l: Loan) => formatCurrency(l.outstanding_balance) },
    { key: 'status', header: 'Status', render: (l: Loan) => <Badge colorClass={LOAN_STATUS_COLORS[l.status] || 'bg-gray-100 text-gray-800'}>{l.status}</Badge> },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loans</h1>
          <p className="text-sm text-gray-500 mt-1">Manage loan applications and lifecycle</p>
        </div>
        {(roleName === 'admin' || roleName === 'manager' || roleName === 'loan_officer') && (
          <Button onClick={() => navigate('/loans/new')}><Plus className="h-4 w-4 mr-2" /> New Loan</Button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'approved', 'active', 'overdue', 'closed', 'rejected', 'defaulted'].map((status) => (
          <button key={status} onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === status ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {status || 'All'}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={allLoans}
        searchPlaceholder="Search loans..."
        onRowClick={(item) => navigate(`/loans/${item.id}`)}
        actions={(item) => <Button variant="ghost" size="sm" onClick={() => navigate(`/loans/${item.id}`)}><Eye className="h-4 w-4" /></Button>}
      />
    </div>
  );
}
