import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useNotification } from '../../contexts/NotificationContext';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import GuarantorForm from '../../components/clients/GuarantorForm';
import { formatCurrency, formatDate, CLIENT_STATUS_COLORS, EMPLOYMENT_LABELS } from '../../lib/utils';
import { ArrowLeft, Plus, FileText } from 'lucide-react';
import type { Client, Guarantor, Loan, Document } from '../../lib/types';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const [client, setClient] = useState<Client | null>(null);
  const [guarantors, setGuarantors] = useState<Guarantor[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showGuarantorForm, setShowGuarantorForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadClientData();
  }, [id]);

  async function loadClientData() {
    try {
      const [clientRes, guarantorsRes, loansRes, docsRes] = await Promise.all([
        supabase.from('clients').select('*, assigned_officer:user_profiles!clients_assigned_officer_id_fkey(id, full_name, email)').eq('id', id).maybeSingle(),
        supabase.from('guarantors').select('*').eq('client_id', id),
        supabase.from('loans').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('documents').select('*').eq('entity_id', id),
      ]);

      if (clientRes.error) throw clientRes.error;
      setClient(clientRes.data as unknown as Client);
      setGuarantors((guarantorsRes.data || []) as Guarantor[]);
      setLoans((loansRes.data || []) as Loan[]);
      setDocuments((docsRes.data || []) as Document[]);
    } catch (err: any) {
      addNotification('error', 'Failed to load client');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGuarantor(data: Partial<Guarantor>) {
    try {
      const { error } = await supabase.from('guarantors').insert({ ...data, client_id: id });
      if (error) throw error;
      addNotification('success', 'Guarantor added');
      setShowGuarantorForm(false);
      loadClientData();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to add guarantor');
    }
  }

  async function toggleKyc() {
    if (!client) return;
    try {
      const { error } = await supabase
        .from('clients')
        .update({ kyc_verified: !client.kyc_verified, updated_at: new Date().toISOString() })
        .eq('id', client.id);
      if (error) throw error;
      addNotification('success', client.kyc_verified ? 'KYC verification removed' : 'KYC verified');
      loadClientData();
    } catch (err: any) {
      addNotification('error', 'Failed to update KYC status');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!client) {
    return <div className="text-center py-12 text-gray-500">Client not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/clients')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{client.first_name} {client.last_name}</h1>
          <p className="text-sm text-gray-500">{client.client_number} | {client.id_number}</p>
        </div>
        <Badge colorClass={CLIENT_STATUS_COLORS[client.status]}>{client.status}</Badge>
        <Badge colorClass={client.kyc_verified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}>
          KYC: {client.kyc_verified ? 'Verified' : 'Pending'}
        </Badge>
        <Button variant="outline" onClick={toggleKyc}>
          {client.kyc_verified ? 'Unverify KYC' : 'Verify KYC'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><p className="text-gray-500">Phone</p><p className="font-medium">{client.phone}</p></div>
              <div><p className="text-gray-500">Email</p><p className="font-medium">{client.email || '—'}</p></div>
              <div><p className="text-gray-500">Gender</p><p className="font-medium capitalize">{client.gender}</p></div>
              <div><p className="text-gray-500">Date of Birth</p><p className="font-medium">{formatDate(client.date_of_birth)}</p></div>
              <div><p className="text-gray-500">ID Type</p><p className="font-medium">{client.id_type === 'national_id' ? 'National ID' : 'Passport'}</p></div>
              <div><p className="text-gray-500">Client Type</p><p className="font-medium capitalize">{client.client_type}</p></div>
              {client.client_type === 'business' && (
                <>
                  <div><p className="text-gray-500">Business Name</p><p className="font-medium">{client.business_name || '—'}</p></div>
                  <div><p className="text-gray-500">Reg. Number</p><p className="font-medium">{client.business_reg_number || '—'}</p></div>
                </>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employment & Address</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div><p className="text-gray-500">Status</p><p className="font-medium">{EMPLOYMENT_LABELS[client.employment_status]}</p></div>
              <div><p className="text-gray-500">Employer</p><p className="font-medium">{client.employer || '—'}</p></div>
              <div><p className="text-gray-500">Monthly Income</p><p className="font-medium">{formatCurrency(client.monthly_income)}</p></div>
              <div><p className="text-gray-500">Address</p><p className="font-medium">{client.address || '—'}</p></div>
              <div><p className="text-gray-500">City</p><p className="font-medium">{client.city || '—'}</p></div>
              <div><p className="text-gray-500">Province</p><p className="font-medium">{client.province || '—'}</p></div>
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Loans ({loans.length})</CardTitle>
                <Button size="sm" onClick={() => navigate('/loans/new', { state: { clientId: client.id } })}>
                  <Plus className="h-4 w-4 mr-1" /> New Loan
                </Button>
              </div>
            </CardHeader>
            {loans.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No loans yet</p>
            ) : (
              <div className="space-y-2">
                {loans.map((loan) => (
                  <div
                    key={loan.id}
                    onClick={() => navigate(`/loans/${loan.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-medium">{loan.loan_number}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(loan.principal)} | {loan.term_months} months</p>
                    </div>
                    <Badge colorClass={`text-xs ${loan.status === 'active' ? 'bg-green-50 text-green-700' : loan.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>
                      {loan.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Guarantors ({guarantors.length})</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowGuarantorForm(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            {guarantors.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No guarantors</p>
            ) : (
              <div className="space-y-3">
                {guarantors.map((g) => (
                  <div key={g.id} className="p-3 rounded-lg border border-gray-100">
                    <p className="text-sm font-medium">{g.first_name} {g.last_name}</p>
                    <p className="text-xs text-gray-500">{g.relationship} | {g.phone}</p>
                    <Badge colorClass={g.kyc_verified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'} className="mt-1">
                      {g.kyc_verified ? 'KYC Verified' : 'KYC Pending'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents ({documents.length})</CardTitle>
            </CardHeader>
            {documents.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No documents uploaded</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 rounded border border-gray-100 text-sm">
                    <FileText className="h-4 w-4 text-gray-400" />
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

      <Modal isOpen={showGuarantorForm} onClose={() => setShowGuarantorForm(false)} title="Add Guarantor" size="lg">
        <GuarantorForm onSave={handleSaveGuarantor} onCancel={() => setShowGuarantorForm(false)} />
      </Modal>
    </div>
  );
}
