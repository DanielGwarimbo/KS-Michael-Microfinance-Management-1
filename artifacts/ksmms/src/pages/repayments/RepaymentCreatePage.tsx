import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { formatCurrency, PAYMENT_METHOD_LABELS } from '../../lib/utils';
import { ArrowLeft } from 'lucide-react';
import type { Loan } from '../../lib/types';

export default function RepaymentCreatePage() {
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedLoanId = (location.state as any)?.loanId || '';

  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [form, setForm] = useState({
    loan_id: preselectedLoanId,
    amount: '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadActiveLoans(); }, []);
  useEffect(() => {
    setSelectedLoan(form.loan_id ? activeLoans.find((l) => l.id === form.loan_id) || null : null);
  }, [form.loan_id, activeLoans]);

  async function loadActiveLoans() {
    const { data } = await api.get<Loan[]>('/loans/active');
    setActiveLoans(data || []);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.loan_id || !selectedLoan) { addNotification('error', 'Please select a loan'); return; }
    const amount = Number(form.amount);
    if (amount <= 0) { addNotification('error', 'Amount must be greater than zero'); return; }
    if (amount > Number(selectedLoan.outstanding_balance)) { addNotification('error', 'Amount exceeds outstanding balance'); return; }

    setSaving(true);
    try {
      const freqDivisor = selectedLoan.repayment_frequency === 'monthly' ? 1 : selectedLoan.repayment_frequency === 'biweekly' ? 2 : 4;
      const simplifiedInterest = amount * (selectedLoan.interest_rate / 100 / 12 / freqDivisor);
      const simplifiedPrincipal = amount - simplifiedInterest;

      const { error } = await api.post('/repayments', {
        loan_id: form.loan_id,
        amount,
        principal_amount: Math.max(0, simplifiedPrincipal),
        interest_amount: Math.min(amount, simplifiedInterest),
        payment_date: form.payment_date,
        payment_method: form.payment_method,
        notes: form.notes,
      });
      if (error) throw new Error(error);
      addNotification('success', `Payment of ${formatCurrency(amount)} recorded successfully`);
      navigate('/repayments');
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: string, value: string) { setForm((prev) => ({ ...prev, [field]: value })); }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/repayments')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold text-gray-900">Record Payment</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h3>
          <div className="space-y-4">
            <Select label="Loan" value={form.loan_id} onChange={(e) => updateField('loan_id', e.target.value)}
              options={[{ value: '', label: 'Select Loan' }, ...activeLoans.map((l) => ({
                value: l.id,
                label: `${l.loan_number} - ${(l.client as any)?.first_name} ${(l.client as any)?.last_name} (Balance: ${formatCurrency(l.outstanding_balance)})`,
              }))]} required />

            {selectedLoan && (
              <div className="p-4 bg-gray-50 rounded-lg text-sm space-y-1">
                <p><span className="text-gray-500">Client:</span> <span className="font-medium">{(selectedLoan.client as any)?.first_name} {(selectedLoan.client as any)?.last_name}</span></p>
                <p><span className="text-gray-500">Outstanding Balance:</span> <span className="font-bold text-red-700">{formatCurrency(selectedLoan.outstanding_balance)}</span></p>
                <p><span className="text-gray-500">Installment Amount:</span> <span className="font-medium">{formatCurrency(selectedLoan.installment_amount)}</span></p>
              </div>
            )}

            <Input label="Payment Amount (USD)" type="number" value={form.amount} onChange={(e) => updateField('amount', e.target.value)} required min="0.01" step="0.01" />
            <Select label="Payment Method" value={form.payment_method} onChange={(e) => updateField('payment_method', e.target.value)}
              options={Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            <Input label="Payment Date" type="date" value={form.payment_date} onChange={(e) => updateField('payment_date', e.target.value)} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-0" rows={2} />
            </div>
          </div>
        </Card>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/repayments')} type="button">Cancel</Button>
          <Button type="submit" loading={saving}>Record Payment</Button>
        </div>
      </form>
    </div>
  );
}
