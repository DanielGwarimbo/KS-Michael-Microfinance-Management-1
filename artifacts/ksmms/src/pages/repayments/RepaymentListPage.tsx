import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import { Plus } from 'lucide-react';
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from '../../lib/utils';
import type { Repayment } from '../../lib/types';

export default function RepaymentListPage() {
  const { roleName } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRepayments(); }, []);

  async function loadRepayments() {
    try {
      const { data, error } = await api.get<Repayment[]>('/repayments');
      if (error) throw new Error(error);
      setRepayments(data || []);
    } catch {
      addNotification('error', 'Failed to load repayments');
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    { key: 'receipt_number', header: 'Receipt No.' },
    { key: 'loan', header: 'Loan / Client', render: (r: Repayment) => {
      const loan = r.loan as any;
      return loan ? `${loan.loan_number} - ${loan.client?.first_name} ${loan.client?.last_name}` : '—';
    }},
    { key: 'amount', header: 'Amount', render: (r: Repayment) => formatCurrency(r.amount) },
    { key: 'principal_amount', header: 'Principal', render: (r: Repayment) => formatCurrency(r.principal_amount) },
    { key: 'interest_amount', header: 'Interest', render: (r: Repayment) => formatCurrency(r.interest_amount) },
    { key: 'payment_date', header: 'Date', render: (r: Repayment) => formatDate(r.payment_date) },
    { key: 'payment_method', header: 'Method', render: (r: Repayment) => PAYMENT_METHOD_LABELS[r.payment_method] || r.payment_method },
    { key: 'receiver', header: 'Received By', render: (r: Repayment) => (r as any).receiver?.full_name || '—' },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Repayments</h1>
          <p className="text-sm text-gray-500 mt-1">Track loan repayments and collections</p>
        </div>
        {(roleName === 'admin' || roleName === 'cashier') && (
          <Button onClick={() => navigate('/repayments/new')}><Plus className="h-4 w-4 mr-2" /> Record Payment</Button>
        )}
      </div>
      <DataTable columns={columns} data={repayments} searchPlaceholder="Search repayments..." />
    </div>
  );
}
