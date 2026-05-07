import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import GuarantorForm from '../../components/clients/GuarantorForm';
import UploadDocumentModal from '../../components/documents/UploadDocumentModal';
import { formatCurrency, formatDate, CLIENT_STATUS_COLORS, EMPLOYMENT_LABELS } from '../../lib/utils';
import { ArrowLeft, Plus, FileText, Upload, ExternalLink, Trash2 } from 'lucide-react';
import DocThumbnail from '../../components/documents/DocThumbnail';
import type { Client, Guarantor, Loan, Document } from '../../lib/types';

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const { hasRole } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [guarantors, setGuarantors] = useState<Guarantor[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [guarantorDocuments, setGuarantorDocuments] = useState<Record<string, Document[]>>({});
  const [showGuarantorForm, setShowGuarantorForm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingGuarantorId, setUploadingGuarantorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canDelete = hasRole(['admin', 'manager']);
  const canVerifyKyc = hasRole(['admin', 'manager']);
  const [verifyingGuarantorId, setVerifyingGuarantorId] = useState<string | null>(null);

  useEffect(() => { if (id) loadClientData(); }, [id]);

  async function loadClientData() {
    try {
      const [clientRes, guarantorsRes, loansRes, docsRes] = await Promise.all([
        api.get<Client>(`/clients/${id}`),
        api.get<Guarantor[]>(`/clients/${id}/guarantors`),
        api.get<Loan[]>(`/clients/${id}/loans`),
        api.get<Document[]>(`/clients/${id}/documents`),
      ]);
      if (clientRes.error) throw new Error(clientRes.error);
      setClient(clientRes.data);
      setLoans(loansRes.data || []);
      setDocuments(docsRes.data || []);

      const gList = guarantorsRes.data || [];
      setGuarantors(gList);

      if (gList.length > 0) {
        const gDocResults = await Promise.all(
          gList.map((g) =>
            api.get<Document[]>(`/documents?entity_type=guarantor_kyc&entity_id=${g.id}`)
          )
        );
        const gDocsMap: Record<string, Document[]> = {};
        gList.forEach((g, i) => {
          gDocsMap[g.id] = gDocResults[i].data || [];
        });
        setGuarantorDocuments(gDocsMap);
      } else {
        setGuarantorDocuments({});
      }
    } catch {
      addNotification('error', 'Failed to load client');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveGuarantor(data: Partial<Guarantor>) {
    try {
      const { error } = await api.post(`/clients/${id}/guarantors`, data);
      if (error) throw new Error(error);
      addNotification('success', 'Guarantor added');
      setShowGuarantorForm(false);
      loadClientData();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to add guarantor');
    }
  }

  async function toggleGuarantorKyc(g: Guarantor) {
    setVerifyingGuarantorId(g.id);
    try {
      const { error } = await api.put(`/clients/${id}/guarantors/${g.id}/kyc`, { kyc_verified: !g.kyc_verified });
      if (error) throw new Error(error);
      addNotification('success', g.kyc_verified ? 'Guarantor KYC verification removed' : 'Guarantor KYC verified');
      setGuarantors((prev) => prev.map((x) => x.id === g.id ? { ...x, kyc_verified: !g.kyc_verified } : x));
    } catch {
      addNotification('error', 'Failed to update guarantor KYC status');
    } finally {
      setVerifyingGuarantorId(null);
    }
  }

  async function toggleKyc() {
    if (!client) return;
    try {
      const { error } = await api.put(`/clients/${client.id}/kyc`, { kyc_verified: !client.kyc_verified });
      if (error) throw new Error(error);
      addNotification('success', client.kyc_verified ? 'KYC verification removed' : 'KYC verified');
      loadClientData();
    } catch {
      addNotification('error', 'Failed to update KYC status');
    }
  }

  async function handleDeleteDocument() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await api.delete(`/documents/${deleteTarget.id}`);
    if (error) {
      addNotification('error', 'Failed to delete document');
    } else {
      addNotification('success', `Deleted: ${deleteTarget.file_name}`);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setGuarantorDocuments((prev) => {
        const updated = { ...prev };
        for (const gId of Object.keys(updated)) {
          updated[gId] = updated[gId].filter((d) => d.id !== deleteTarget.id);
        }
        return updated;
      });
      setDeleteTarget(null);
    }
    setDeleting(false);
  }

  function getDocumentViewUrl(doc: Document): string {
    return `/api/storage${doc.file_path}`;
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>;
  if (!client) return <div className="text-center py-12 text-gray-500">Client not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/clients')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{client.first_name} {client.last_name}</h1>
          <p className="text-sm text-gray-500">{client.client_number} | {client.id_number}</p>
        </div>
        <Badge colorClass={CLIENT_STATUS_COLORS[client.status]}>{client.status}</Badge>
        <Badge colorClass={client.kyc_verified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}>
          KYC: {client.kyc_verified ? 'Verified' : 'Pending'}
        </Badge>
        <Button variant="outline" onClick={toggleKyc}>{client.kyc_verified ? 'Unverify KYC' : 'Verify KYC'}</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
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
            <CardHeader><CardTitle>Employment & Address</CardTitle></CardHeader>
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
            {loans.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">No loans yet</p> : (
              <div className="space-y-2">
                {loans.map((loan) => (
                  <div key={loan.id} onClick={() => navigate(`/loans/${loan.id}`)} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium">{loan.loan_number}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(loan.principal)} | {loan.term_months} months</p>
                    </div>
                    <Badge colorClass={`text-xs ${loan.status === 'active' ? 'bg-green-50 text-green-700' : loan.status === 'overdue' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>{loan.status}</Badge>
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
                <Button size="sm" variant="outline" onClick={() => setShowGuarantorForm(true)}><Plus className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            {guarantors.length === 0 ? <p className="text-sm text-gray-500 text-center py-4">No guarantors</p> : (
              <div className="space-y-3">
                {guarantors.map((g) => {
                  const gDocs = guarantorDocuments[g.id] || [];
                  return (
                    <div key={g.id} className="p-3 rounded-lg border border-gray-100 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{g.first_name} {g.last_name}</p>
                          <p className="text-xs text-gray-500">{g.relationship} | {g.phone}</p>
                          <Badge colorClass={g.kyc_verified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'} className="mt-1">
                            {g.kyc_verified ? 'KYC Verified' : 'KYC Pending'}
                          </Badge>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {canVerifyKyc && (
                            <Button
                              size="sm"
                              variant={g.kyc_verified ? 'outline' : 'primary'}
                              onClick={() => toggleGuarantorKyc(g)}
                              loading={verifyingGuarantorId === g.id}
                              title={g.kyc_verified ? 'Remove KYC verification' : 'Mark guarantor as KYC verified'}
                            >
                              {g.kyc_verified ? 'Unverify KYC' : 'Verify KYC'}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setUploadingGuarantorId(g.id)} title="Upload KYC document for this guarantor">
                            <Upload className="h-3 w-3 mr-1" /> Doc
                          </Button>
                        </div>
                      </div>
                      {gDocs.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-gray-100">
                          {gDocs.map((doc) => (
                            <div key={doc.id} className="flex items-center gap-2 text-xs">
                              <DocThumbnail
                                mimeType={doc.mime_type}
                                viewUrl={getDocumentViewUrl(doc)}
                                fileName={doc.file_name}
                                size="sm"
                              />
                              <span className="flex-1 truncate text-gray-700" title={doc.file_name}>{doc.file_name}</span>
                              <Badge colorClass={doc.verified ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}>
                                {doc.verified ? 'Verified' : 'Unverified'}
                              </Badge>
                              <a
                                href={getDocumentViewUrl(doc)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-teal-600 hover:text-teal-800 shrink-0"
                                title="View / Download"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              {canDelete && (
                                <button
                                  onClick={() => setDeleteTarget(doc)}
                                  className="text-red-400 hover:text-red-600 shrink-0"
                                  title="Delete document"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
                <p className="text-sm text-gray-500">No documents uploaded</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowUploadModal(true)}>
                  <Upload className="h-4 w-4 mr-1" /> Upload KYC Document
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 rounded border border-gray-100 text-sm">
                    <DocThumbnail
                      mimeType={doc.mime_type}
                      viewUrl={getDocumentViewUrl(doc)}
                      fileName={doc.file_name}
                    />
                    <span className="flex-1 truncate text-xs" title={doc.file_name}>{doc.file_name}</span>
                    <Badge colorClass={doc.verified ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}>
                      {doc.verified ? 'Verified' : 'Unverified'}
                    </Badge>
                    <a
                      href={getDocumentViewUrl(doc)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-800 shrink-0"
                      title="View / Download"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    {canDelete && (
                      <button
                        onClick={() => setDeleteTarget(doc)}
                        className="text-red-400 hover:text-red-600 shrink-0"
                        title="Delete document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Document" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to permanently delete <span className="font-semibold">{deleteTarget?.file_name}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteDocument} loading={deleting}>Delete</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showGuarantorForm} onClose={() => setShowGuarantorForm(false)} title="Add Guarantor" size="lg">
        <GuarantorForm onSave={handleSaveGuarantor} onCancel={() => setShowGuarantorForm(false)} />
      </Modal>

      {id && (
        <UploadDocumentModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          entityType="client_kyc"
          entityId={id}
          onSuccess={() => loadClientData()}
        />
      )}

      {uploadingGuarantorId && (
        <UploadDocumentModal
          isOpen={true}
          onClose={() => setUploadingGuarantorId(null)}
          entityType="guarantor_kyc"
          entityId={uploadingGuarantorId}
          onSuccess={() => { loadClientData(); }}
        />
      )}
    </div>
  );
}
