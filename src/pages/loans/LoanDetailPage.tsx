import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import {
  formatCurrency, formatDate, LOAN_STATUS_COLORS, FREQUENCY_LABELS, generateRepaymentSchedule
} from '../../lib/utils';
import { ArrowLeft, CheckCircle, XCircle, DollarSign, Receipt } from 'lucide-react';
import type { Loan, RepaymentSchedule, Repayment, Document } from '../../lib/types';

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, roleName } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [schedule, setSchedule] = useState<RepaymentSchedule[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadLoanData();
  }, [id]);

  async function loadLoanData() {
    try {
      const [loanRes, scheduleRes, repaymentsRes, docsRes] = await Promise.all([
        supabase.from('loans').select('*, client:clients(*), creator:user_profiles!loans_created_by_fkey(full_name), approver:user_profiles!loans_approved_by_fkey(full_name), disburser:user_profiles!loans_disbursed_by_fkey(full_name)').eq('id', id).maybeSingle(),
        supabase.from('repayment_schedules').select('*').eq('loan_id', id).order('installment_number'),
        supabase.from('repayments').select('*, receiver:user_profiles!repayments_received_by_fkey(full_name)').eq('loan_id', id).order('payment_date', { ascending: false }),
        supabase.from('documents').select('*').eq('entity_id', id),
      ]);

      setLoan(loanRes.data as unknown as Loan);
      setSchedule((scheduleRes.data || []) as RepaymentSchedule[]);
      setRepayments((repaymentsRes.data || []) as Repayment[]);
      setDocuments((docsRes.data || []) as Document[]);
    } catch (err) {
      addNotification('error', 'Failed to load loan');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!loan) return;

    const clientDocs = await supabase.from('documents').select('*').eq('entity_id', loan.client_id).eq('verified', true);
    const guarantorDocs = await supabase.from('guarantors').select('id').eq('client_id', loan.client_id);
    let guarantorVerified = true;
    if (guarantorDocs.data && guarantorDocs.data.length > 0) {
      const gDocs = await supabase.from('documents').select('*').in('entity_id', guarantorDocs.data.map(g => g.id)).eq('verified', true);
      guarantorVerified = !!(gDocs.data && gDocs.data.length > 0);
    }

    if (!clientDocs.data || clientDocs.data.length === 0) {
      addNotification('error', 'Cannot approve: Client KYC documents are incomplete or unverified');
      return;
    }
    if (!guarantorVerified) {
      addNotification('error', 'Cannot approve: Guarantor KYC documents are incomplete or unverified');
      return;
    }

    try {
      const { error } = await supabase
        .from('loans')
        .update({
          status: 'approved',
          approved_by: profile?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', loan.id);
      if (error) throw error;
      addNotification('success', 'Loan approved');
      loadLoanData();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to approve loan');
    }
  }

  async function handleReject() {
    if (!loan || !rejectionReason) return;
    try {
      const { error } = await supabase
        .from('loans')
        .update({
          status: 'rejected',
          rejected_by: profile?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
        })
        .eq('id', loan.id);
      if (error) throw error;
      addNotification('success', 'Loan rejected');
      setShowRejectModal(false);
      loadLoanData();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to reject loan');
    }
  }

  async function handleDisburse() {
    if (!loan) return;
    if (loan.status !== 'approved') {
      addNotification('error', 'Only approved loans can be disbursed');
      return;
    }

    try {
      const startDate = new Date().toISOString().split('T')[0];
      const maturityDate = new Date();
      maturityDate.setMonth(maturityDate.getMonth() + loan.term_months);

      const { error } = await supabase
        .from('loans')
        .update({
          status: 'active',
          disbursed_by: profile?.id,
          disbursed_at: new Date().toISOString(),
          start_date: startDate,
          maturity_date: maturityDate.toISOString().split('T')[0],
        })
        .eq('id', loan.id);

      if (error) throw error;

      await supabase.from('accounting_entries').insert({
        transaction_type: 'disbursement',
        reference_id: loan.id,
        reference_type: 'loan',
        amount: loan.principal,
        description: `Loan disbursement - ${loan.loan_number}`,
        created_by: profile?.id,
      });

      const scheduleData = generateRepaymentSchedule(
        loan.principal, loan.interest_rate, loan.term_months, loan.repayment_frequency, startDate
      );

      if (scheduleData.length > 0) {
        await supabase.from('repayment_schedules').insert(
          scheduleData.map((s) => ({
            loan_id: loan.id,
            installment_number: s.installmentNumber,
            due_date: s.dueDate,
            amount_due: s.amountDue,
            principal_portion: s.principalPortion,
            interest_portion: s.interestPortion,
          }))
        );
      }

      addNotification('success', 'Loan disbursed successfully');
      loadLoanData();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to disburse loan');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!loan) return <div className="text-center py-12 text-gray-500">Loan not found</div>;

  const client = loan.client as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/loans')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Loan {loan.loan_number}</h1>
          <p className="text-sm text-gray-500">
            {client ? `${client.first_name} ${client.last_name}` : '—'} | Created {formatDate(loan.created_at)}
          </p>
        </div>
        <Badge colorClass={LOAN_STATUS_COLORS[loan.status]}>{loan.status}</Badge>

        {loan.status === 'pending' && (roleName === 'admin' || roleName === 'manager') && (
          <div className="flex gap-2">
            <Button onClick={handleApprove}><CheckCircle className="h-4 w-4 mr-2" />Approve</Button>
            <Button variant="danger" onClick={() => setShowRejectModal(true)}><XCircle className="h-4 w-4 mr-2" />Reject</Button>
          </div>
        )}
        {loan.status === 'approved' && (roleName === 'admin' || roleName === 'cashier') && (
          <Button onClick={handleDisburse}><DollarSign className="h-4 w-4 mr-2" />Disburse</Button>
        )}
        {loan.status === 'active' && (roleName === 'admin' || roleName === 'cashier') && (
          <Button variant="outline" onClick={() => navigate(`/repayments/new`, { state: { loanId: loan.id } })}>
            <Receipt className="h-4 w-4 mr-2" />Record Payment
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Loan Details</CardTitle></CardHeader>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-gray-500">Principal</p><p className="font-bold text-lg">{formatCurrency(loan.principal)}</p></div>
              <div><p className="text-gray-500">Interest Rate</p><p className="font-bold text-lg">{loan.interest_rate}%</p></div>
              <div><p className="text-gray-500">Term</p><p className="font-bold text-lg">{loan.term_months} months</p></div>
              <div><p className="text-gray-500">Frequency</p><p className="font-bold text-lg">{FREQUENCY_LABELS[loan.repayment_frequency]}</p></div>
              <div><p className="text-gray-500">Total Payable</p><p className="font-bold text-lg text-teal-700">{formatCurrency(loan.total_payable)}</p></div>
              <div><p className="text-gray-500">Installment</p><p className="font-bold text-lg">{formatCurrency(loan.installment_amount)}</p></div>
              <div><p className="text-gray-500">Total Paid</p><p className="font-bold text-lg text-green-700">{formatCurrency(loan.total_paid)}</p></div>
              <div><p className="text-gray-500">Outstanding</p><p className="font-bold text-lg text-red-700">{formatCurrency(loan.outstanding_balance)}</p></div>
            </div>
            {loan.purpose && <p className="mt-4 text-sm text-gray-600"><span className="font-medium">Purpose:</span> {loan.purpose}</p>}
          </Card>

          {schedule.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Repayment Schedule</CardTitle></CardHeader>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Due Date</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Amount</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Principal</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Interest</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">Paid</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {schedule.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{s.installment_number}</td>
                        <td className="px-3 py-2">{formatDate(s.due_date)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(s.amount_due)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(s.principal_portion)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(s.interest_portion)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(s.amount_paid)}</td>
                        <td className="px-3 py-2">
                          <Badge colorClass={
                            s.status === 'paid' ? 'bg-green-50 text-green-700' :
                            s.status === 'overdue' ? 'bg-red-50 text-red-700' :
                            s.status === 'partial' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-gray-50 text-gray-700'
                          }>
                            {s.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {repayments.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Payment History ({repayments.length})</CardTitle></CardHeader>
              <div className="space-y-2">
                {repayments.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-medium">{r.receipt_number}</p>
                      <p className="text-xs text-gray-500">{formatDate(r.payment_date)} | {(r as any).receiver?.full_name || '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-700">{formatCurrency(r.amount)}</p>
                      <p className="text-xs text-gray-500 capitalize">{r.payment_method.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Workflow</CardTitle></CardHeader>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${loan.created_by ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>1</div>
                <div>
                  <p className="text-sm font-medium">Application Created</p>
                  <p className="text-xs text-gray-500">{(loan as any).creator?.full_name || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${loan.approved_by ? 'bg-teal-100 text-teal-700' : loan.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>
                  {loan.status === 'rejected' ? 'X' : '2'}
                </div>
                <div>
                  <p className="text-sm font-medium">{loan.status === 'rejected' ? 'Rejected' : 'Approval'}</p>
                  <p className="text-xs text-gray-500">{(loan as any).approver?.full_name || 'Pending'}</p>
                  {loan.rejection_reason && <p className="text-xs text-red-600">{loan.rejection_reason}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${loan.disbursed_by ? 'bg-teal-100 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>3</div>
                <div>
                  <p className="text-sm font-medium">Disbursement</p>
                  <p className="text-xs text-gray-500">{(loan as any).disburser?.full_name || 'Pending'}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Documents ({documents.length})</CardTitle></CardHeader>
            {documents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No documents</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 rounded border border-gray-100 text-sm">
                    <span className="flex-1 truncate">{doc.file_name}</span>
                    <Badge colorClass={doc.verified ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}>
                      {doc.verified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Loan" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason</label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-0"
              rows={3}
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} disabled={!rejectionReason}>Reject Loan</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
