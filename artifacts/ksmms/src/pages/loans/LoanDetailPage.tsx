import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import UploadDocumentModal from '../../components/documents/UploadDocumentModal';
import { formatCurrency, formatDate, LOAN_STATUS_COLORS, FREQUENCY_LABELS, LOAN_PRODUCT_TYPE_LABELS, generateRepaymentSchedule } from '../../lib/utils';
import { ArrowLeft, CheckCircle, XCircle, DollarSign, Receipt, Upload, FileText, ExternalLink, AlertTriangle } from 'lucide-react';
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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) loadLoanData(); }, [id]);

  async function loadLoanData() {
    try {
      const [loanRes, scheduleRes, repaymentsRes, docsRes] = await Promise.all([
        api.get<Loan>(`/loans/${id}`),
        api.get<RepaymentSchedule[]>(`/loans/${id}/schedule`),
        api.get<Repayment[]>(`/loans/${id}/repayments`),
        api.get<Document[]>(`/loans/${id}/documents`),
      ]);
      if (loanRes.error) throw new Error(loanRes.error);
      setLoan(loanRes.data);
      setSchedule(scheduleRes.data || []);
      setRepayments(repaymentsRes.data || []);
      setDocuments(docsRes.data || []);
    } catch {
      addNotification('error', 'Failed to load loan');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!loan) return;
    try {
      const { error } = await api.post(`/loans/${loan.id}/approve`);
      if (error) throw new Error(error);
      addNotification('success', 'Loan approved');
      loadLoanData();
    } catch (err: any) {
      addNotification('error', err.message || 'Cannot approve loan');
    }
  }

  async function handleReject() {
    if (!loan || !rejectionReason) return;
    try {
      const { error } = await api.post(`/loans/${loan.id}/reject`, { rejection_reason: rejectionReason });
      if (error) throw new Error(error);
      addNotification('success', 'Loan rejected');
      setShowRejectModal(false);
      loadLoanData();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to reject loan');
    }
  }

  async function handleDisburse() {
    if (!loan) return;
    try {
      const { error } = await api.post(`/loans/${loan.id}/disburse`);
      if (error) throw new Error(error);
      addNotification('success', 'Loan disbursed successfully');
      loadLoanData();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to disburse loan');
    }
  }

  function getDocumentViewUrl(doc: Document): string {
    return `/api/storage${doc.file_path}`;
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>;
  if (!loan) return <div className="text-center py-12 text-gray-500">Loan not found</div>;

  const client = loan.client as any;
  const overdueInstallments = schedule.filter((s) => s.status === 'overdue');
  const overdueCount = overdueInstallments.length;
  const overdueTotal = overdueInstallments.reduce((sum, s) => sum + Math.max(0, s.amount_due - s.amount_paid), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" onClick={() => navigate('/loans')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Loan {loan.loan_number}</h1>
          <p className="text-sm text-gray-500">{client ? `${client.first_name} ${client.last_name}` : '—'} | Created {formatDate(loan.created_at)}</p>
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
        {(loan.status === 'active' || loan.status === 'overdue') && (roleName === 'admin' || roleName === 'cashier') && (
          <Button variant="outline" onClick={() => navigate('/repayments/new', { state: { loanId: loan.id } })}>
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
              <div><p className="text-gray-500">Total Payable</p><p className="font-bold text-lg text-brand-700">{formatCurrency(loan.total_payable)}</p></div>
              <div><p className="text-gray-500">Installment</p><p className="font-bold text-lg">{formatCurrency(loan.installment_amount)}</p></div>
              <div><p className="text-gray-500">Total Paid</p><p className="font-bold text-lg text-green-700">{formatCurrency(loan.total_paid)}</p></div>
              <div><p className="text-gray-500">Outstanding</p><p className="font-bold text-lg text-red-700">{formatCurrency(loan.outstanding_balance)}</p></div>
            </div>
            {loan.loan_product_type && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Loan Product</p>
                <p className="text-sm font-semibold text-brand-700">{LOAN_PRODUCT_TYPE_LABELS[loan.loan_product_type] || loan.loan_product_type}</p>
              </div>
            )}
            {loan.purpose && <p className="mt-3 text-sm text-gray-600"><span className="font-medium">Purpose:</span> {loan.purpose}</p>}
          </Card>

          {overdueCount > 0 && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">
                  {overdueCount} overdue installment{overdueCount !== 1 ? 's' : ''}
                </p>
                <p className="text-sm text-red-700 mt-0.5">
                  Total past-due: <span className="font-bold">{formatCurrency(overdueTotal)}</span>
                </p>
              </div>
            </div>
          )}

          {schedule.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Repayment Schedule</CardTitle>
                  {overdueCount > 0 && (
                    <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
                      {overdueCount} overdue
                    </span>
                  )}
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['#', 'Due Date', 'Amount', 'Principal', 'Interest', 'Paid', 'Status'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {schedule.map((s) => (
                      <tr key={s.id} className={s.status === 'overdue' ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}>
                        <td className={`px-3 py-2 font-medium ${s.status === 'overdue' ? 'text-red-700' : ''}`}>{s.installment_number}</td>
                        <td className={`px-3 py-2 ${s.status === 'overdue' ? 'text-red-700 font-medium' : ''}`}>{formatDate(s.due_date)}</td>
                        <td className="px-3 py-2">{formatCurrency(s.amount_due)}</td>
                        <td className="px-3 py-2">{formatCurrency(s.principal_portion)}</td>
                        <td className="px-3 py-2">{formatCurrency(s.interest_portion)}</td>
                        <td className="px-3 py-2">{formatCurrency(s.amount_paid)}</td>
                        <td className="px-3 py-2">
                          <Badge colorClass={s.status === 'paid' ? 'bg-green-50 text-green-700' : s.status === 'overdue' ? 'bg-red-100 text-red-700 border border-red-200' : s.status === 'partial' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-700'}>{s.status}</Badge>
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
              {[
                { num: '1', label: 'Application Created', meta: (loan as any).creator?.full_name, done: !!loan.created_by },
                { num: loan.status === 'rejected' ? 'X' : '2', label: loan.status === 'rejected' ? 'Rejected' : 'Approval', meta: (loan as any).approver?.full_name || (loan.status === 'rejected' ? undefined : 'Pending'), done: !!loan.approved_by, error: loan.status === 'rejected' },
                { num: '3', label: 'Disbursement', meta: (loan as any).disburser?.full_name || 'Pending', done: !!loan.disbursed_by },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step.done ? 'bg-brand-100 text-brand-700' : step.error ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-400'}`}>{step.num}</div>
                  <div>
                    <p className="text-sm font-medium">{step.label}</p>
                    {step.meta && <p className="text-xs text-gray-500">{step.meta}</p>}
                    {loan.rejection_reason && i === 1 && <p className="text-xs text-red-600">{loan.rejection_reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documents ({documents.length})</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowUploadModal(true)}>
                  <Upload className="h-4 w-4 mr-1" /> Upload
                </Button>
              </div>
            </CardHeader>
            {documents.length === 0 ? (
              <div className="text-center py-6">
                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No documents</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowUploadModal(true)}>
                  <Upload className="h-4 w-4 mr-1" /> Upload Document
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 rounded border border-gray-100 text-sm">
                    <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="flex-1 truncate text-xs" title={doc.file_name}>{doc.file_name}</span>
                    <Badge colorClass={doc.verified ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}>{doc.verified ? 'Verified' : 'Unverified'}</Badge>
                    <a
                      href={getDocumentViewUrl(doc)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-800 shrink-0"
                      title="View / Download"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
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
            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-0"
              rows={3} required />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} disabled={!rejectionReason}>Reject Loan</Button>
          </div>
        </div>
      </Modal>

      {id && (
        <UploadDocumentModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          entityType="loan"
          entityId={id}
          onSuccess={() => loadLoanData()}
        />
      )}
    </div>
  );
}
