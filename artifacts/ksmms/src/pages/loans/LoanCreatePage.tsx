import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getClients, createLoan } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { calculateLoan, formatCurrency, FREQUENCY_LABELS, LOAN_PRODUCT_TYPE_LABELS } from '../../lib/utils';
import { ArrowLeft } from 'lucide-react';
import type { Client, Loan, LoanProductType } from '../../lib/types';

export default function LoanCreatePage() {
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedClientId = (location.state as any)?.clientId || '';

  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    client_id: preselectedClientId,
    loan_product_type: '',
    principal: '',
    interest_rate: '10',
    term_months: '12',
    repayment_frequency: 'monthly',
    purpose: '',
  });
  const [calculation, setCalculation] = useState<{ totalPayable: number; installmentAmount: number; totalInterest: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadClients(); }, []);
  useEffect(() => { recalculate(); }, [form.principal, form.interest_rate, form.term_months, form.repayment_frequency]);

  async function loadClients() {
    try {
      const allClients = await getClients();
      setClients(allClients.filter((c) => c.status === 'active'));
    } catch {
      /* silently fail — clients list will be empty */
    }
  }

  function recalculate() {
    const p = Number(form.principal);
    const r = Number(form.interest_rate);
    const t = Number(form.term_months);
    if (p > 0 && r >= 0 && t > 0) setCalculation(calculateLoan(p, r, t, form.repayment_frequency as any));
    else setCalculation(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.client_id) { addNotification('error', 'Please select a client'); return; }
    if (!calculation) { addNotification('error', 'Invalid loan parameters'); return; }

    setSaving(true);
    try {
      const principal = Number(form.principal);
      const loanData = await createLoan({
        client_id: form.client_id,
        principal,
        interest_rate: Number(form.interest_rate),
        term_months: Number(form.term_months),
        repayment_frequency: form.repayment_frequency as "monthly" | "biweekly" | "weekly",
        total_payable: calculation.totalPayable,
        installment_amount: calculation.installmentAmount,
        outstanding_balance: calculation.totalPayable,
        loan_product_type: form.loan_product_type as LoanProductType,
        purpose: form.purpose,
      });
      addNotification('success', 'Loan application created');
      navigate(`/loans/${loanData.id}`);
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to create loan');
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: string, value: string) { setForm((prev) => ({ ...prev, [field]: value })); }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/loans')}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold text-gray-900">New Loan Application</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Select label="Client" value={form.client_id} onChange={(e) => updateField('client_id', e.target.value)}
                options={[{ value: '', label: 'Select Client' }, ...clients.map((c) => ({ value: c.id, label: `${c.client_number} - ${c.first_name} ${c.last_name}` }))]}
                required />
            </div>
            <div className="md:col-span-2">
              <Select label="Loan Product Type" value={form.loan_product_type} onChange={(e) => updateField('loan_product_type', e.target.value)}
                options={[
                  { value: '', label: 'Select Loan Product...' },
                  ...Object.entries(LOAN_PRODUCT_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))
                ]}
                required />
            </div>
            <Input label="Principal Amount (USD)" type="number" value={form.principal} onChange={(e) => updateField('principal', e.target.value)} required min="1" step="0.01" />
            <Input label="Interest Rate (% p.a.)" type="number" value={form.interest_rate} onChange={(e) => updateField('interest_rate', e.target.value)} required min="0" step="0.1" />
            <Input label="Term (Months)" type="number" value={form.term_months} onChange={(e) => updateField('term_months', e.target.value)} required min="1" />
            <Select label="Repayment Frequency" value={form.repayment_frequency} onChange={(e) => updateField('repayment_frequency', e.target.value)}
              options={Object.entries(FREQUENCY_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            <div className="md:col-span-2">
              <Input label="Purpose" value={form.purpose} onChange={(e) => updateField('purpose', e.target.value)} />
            </div>
          </div>
        </Card>

        {calculation && (
          <Card className="bg-brand-50 border-brand-200">
            <h3 className="text-lg font-semibold text-brand-900 mb-4">Loan Calculation</h3>
            <div className="grid grid-cols-3 gap-4">
              <div><p className="text-sm text-brand-700">Total Payable</p><p className="text-xl font-bold text-brand-900">{formatCurrency(calculation.totalPayable)}</p></div>
              <div><p className="text-sm text-brand-700">Total Interest</p><p className="text-xl font-bold text-brand-900">{formatCurrency(calculation.totalInterest)}</p></div>
              <div><p className="text-sm text-brand-700">Installment Amount</p><p className="text-xl font-bold text-brand-900">{formatCurrency(calculation.installmentAmount)}</p></div>
            </div>
          </Card>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/loans')} type="button">Cancel</Button>
          <Button type="submit" loading={saving}>Create Application</Button>
        </div>
      </form>
    </div>
  );
}
