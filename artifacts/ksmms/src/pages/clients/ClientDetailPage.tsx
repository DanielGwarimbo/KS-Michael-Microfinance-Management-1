import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClient, getGuarantors, getClientLoans, getEntityDocuments, addGuarantor, updateClientKyc, updateGuarantorKyc, deleteDocument } from '../../lib/api';
import { getStorageUrl } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import Card, { CardHeader, CardTitle } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import GuarantorForm from '../../components/clients/GuarantorForm';
import UploadDocumentModal, { BUSINESS_DOC_TYPES, INDIVIDUAL_DOC_TYPES } from '../../components/documents/UploadDocumentModal';
import { formatCurrency, formatDate, CLIENT_STATUS_COLORS, EMPLOYMENT_LABELS } from '../../lib/utils';
import { ArrowLeft, Plus, FileText, Upload, ExternalLink, Trash2, Building2, Users, CircleCheck as CheckCircle2, Circle as XCircle } from 'lucide-react';
import DocThumbnail from '../../components/documents/DocThumbnail';
import type { Client, Guarantor, Loan, Document, Director } from '../../lib/types';

const BUSINESS_REQUIRED_DOCS = [
  { type: 'cr14', label: 'CR14 — Certificate of Incorporation' },
  { type: 'cr6', label: 'CR6 — Particulars of Directors' },
  { type: 'director_id', label: "Director's ID Documents" },
  { type: 'proof_of_business_address', label: 'Proof of Business Address' },
  { type: 'business_plan', label: 'Business Plan' },
  { type: 'collateral_document', label: 'Collateral Documents' },
];

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  pvt_ltd: 'Private Limited (Pvt Ltd)',
  pbc: 'Public Business Corporation (PBC)',
  partnership: 'Partnership',
  sole_trader: 'Sole Trader',
  ngo: 'NGO / Non-Profit',
  cooperative: 'Cooperative',
  other: 'Other',
};

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addNotification } = useNotification();
  const { hasRole, user } = useAuth();
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
  const [verifyingGuarantorId, setVerifyingGuarantorId] = useState<string | null>(null);

  const canDeleteDoc = (doc: Document) => hasRole(['admin', 'manager']) || doc.uploaded_by === user?.id;
  const canVerifyKyc = hasRole(['admin', 'manager']);

  useEffect(() => { if (id) loadClientData(); }, [id]);

  async function loadClientData() {
    try {
      const [clientData, guarantorsData, loansData, docsData] = await Promise.all([
        getClient(id!),
        getGuarantors(id!),
        getClientLoans(id!),
        getEntityDocuments('client_kyc', id!),
      ]);
      setClient(clientData);
      setLoans(loansData || []);
      setDocuments(docsData || []);

      setGuarantors(guarantorsData || []);

      if (guarantorsData.length > 0) {
        const gDocResults = await Promise.all(
          guarantorsData.map((g) => getEntityDocuments('guarantor_kyc', g.id))
        );
        const gDocsMap: Record<string, Document[]> = {};
        guarantorsData.forEach((g, i) => { gDocsMap[g.id] = gDocResults[i] || []; });
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
      await addGuarantor(id!, data);
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
      await updateGuarantorKyc(id!, g.id, !g.kyc_verified);
      addNotification('success', g.kyc_verified ? 'KYC verification removed' : 'Guarantor KYC verified');
      setGuarantors((prev) => prev.map((x) => x.id === g.id ? { ...x, kyc_verified: !x.kyc_verified } : x));
    } catch {
      addNotification('error', 'Failed to update guarantor KYC status');
    } finally {
      setVerifyingGuarantorId(null);
    }
  }

  async function toggleKyc() {
    if (!client) return;
    try {
      await updateClientKyc(client.id, !client.kyc_verified);
      addNotification('success', client.kyc_verified ? 'KYC verification removed' : 'KYC verified');
      loadClientData();
    } catch {
      addNotification('error', 'Failed to update KYC status');
    }
  }

  async function handleDeleteDocument() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteTarget.id);
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
    } catch {
      addNotification('error', 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  }

  function getDocumentViewUrl(doc: Document): string {
    return getStorageUrl('documents', doc.file_path);
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>;
  if (!client) return <div className="text-center py-12 text-gray-500">Client not found</div>;

  const isBusiness = client.client_type === 'business';
  const directors: Director[] = Array.isArray(client.directors) ? client.directors : [];
  const uploadedDocTypes = new Set<string>(documents.map((d) => d.document_type));
  const clientDocTypes = isBusiness ? BUSINESS_DOC_TYPES : INDIVIDUAL_DOC_TYPES;
  const pageTitle = isBusiness
    ? (client.business_name || `${client.first_name} ${client.last_name}`)
    : `${client.first_name} ${client.last_name}`;
  const pageSubtitle = isBusiness
    ? `${client.client_number}${client.business_reg_number ? ` · CR: ${client.business_reg_number}` : ''}`
    : `${client.client_number} · ${client.id_number}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" onClick={() => navigate('/clients')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isBusiness && <Building2 className="h-5 w-5 text-brand-600 shrink-0" />}
            <h1 className="text-2xl font-bold text-gray-900 truncate">{pageTitle}</h1>
          </div>
          <p className="text-sm text-gray-500">{pageSubtitle}</p>
        </div>
        <Badge colorClass={CLIENT_STATUS_COLORS[client.status]}>{client.status}</Badge>
        <Badge colorClass={client.kyc_verified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}>
          KYC: {client.kyc_verified ? 'Verified' : 'Pending'}
        </Badge>
        {canVerifyKyc && (
          <Button variant="outline" onClick={toggleKyc}>
            {client.kyc_verified ? 'Unverify KYC' : 'Verify KYC'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── MAIN COLUMN ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* BUSINESS: Business Information */}
          {isBusiness && (
            <Card>
              <CardHeader><CardTitle>Business Information</CardTitle></CardHeader>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="md:col-span-2">
                  <p className="text-gray-500">Registered Name</p>
                  <p className="font-semibold text-gray-900">{client.business_name || '—'}</p>
                </div>
                {client.trading_name && (
                  <div>
                    <p className="text-gray-500">Trading Name</p>
                    <p className="font-medium">{client.trading_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500">CR Number</p>
                  <p className="font-medium">{client.business_reg_number || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Incorporation Date</p>
                  <p className="font-medium">{formatDate(client.date_of_incorporation) || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Business Type</p>
                  <p className="font-medium">{BUSINESS_TYPE_LABELS[client.business_type] || client.business_type || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Industry / Sector</p>
                  <p className="font-medium capitalize">{client.industry_sector?.replace(/_/g, ' ') || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Employees</p>
                  <p className="font-medium">{client.num_employees > 0 ? client.num_employees.toLocaleString() : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Annual Turnover</p>
                  <p className="font-medium">{client.annual_turnover > 0 ? formatCurrency(client.annual_turnover) : '—'}</p>
                </div>
              </div>
            </Card>
          )}

          {/* BUSINESS: Directors */}
          {isBusiness && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-600" />
                  <CardTitle>Directors ({directors.length})</CardTitle>
                </div>
              </CardHeader>
              {directors.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No directors recorded</p>
              ) : (
                <div className="space-y-3">
                  {directors.map((d, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                      <div className="h-9 w-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm shrink-0">
                        {d.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                        <p className="text-xs text-gray-500">
                          {d.id_type === 'national_id' ? 'National ID' : 'Passport'}: {d.id_number || '—'}
                        </p>
                        {(d.phone || d.email) && (
                          <p className="text-xs text-gray-400">
                            {[d.phone, d.email].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* INDIVIDUAL: Personal Information */}
          {!isBusiness && (
            <Card>
              <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><p className="text-gray-500">Phone</p><p className="font-medium">{client.phone || '—'}</p></div>
                <div><p className="text-gray-500">Email</p><p className="font-medium">{client.email || '—'}</p></div>
                <div><p className="text-gray-500">Gender</p><p className="font-medium capitalize">{client.gender}</p></div>
                <div><p className="text-gray-500">Date of Birth</p><p className="font-medium">{formatDate(client.date_of_birth) || '—'}</p></div>
                <div><p className="text-gray-500">ID Type</p><p className="font-medium">{client.id_type === 'national_id' ? 'National ID' : 'Passport'}</p></div>
                <div><p className="text-gray-500">Client Type</p><p className="font-medium capitalize">{client.client_type}</p></div>
              </div>
            </Card>
          )}

          {/* INDIVIDUAL: Employment & Address */}
          {!isBusiness && (
            <Card>
              <CardHeader><CardTitle>Employment &amp; Address</CardTitle></CardHeader>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><p className="text-gray-500">Employment</p><p className="font-medium">{EMPLOYMENT_LABELS[client.employment_status]}</p></div>
                <div><p className="text-gray-500">Employer</p><p className="font-medium">{client.employer || '—'}</p></div>
                <div><p className="text-gray-500">Monthly Income</p><p className="font-medium">{formatCurrency(client.monthly_income)}</p></div>
                <div><p className="text-gray-500">Address</p><p className="font-medium">{client.address || '—'}</p></div>
                <div><p className="text-gray-500">City</p><p className="font-medium">{client.city || '—'}</p></div>
                <div><p className="text-gray-500">Province</p><p className="font-medium">{client.province || '—'}</p></div>
              </div>
            </Card>
          )}

          {/* BUSINESS: Contact & Address */}
          {isBusiness && (
            <Card>
              <CardHeader><CardTitle>Contact Person &amp; Address</CardTitle></CardHeader>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div><p className="text-gray-500">Contact Person</p><p className="font-medium">{client.first_name} {client.last_name}</p></div>
                <div><p className="text-gray-500">Phone</p><p className="font-medium">{client.phone || '—'}</p></div>
                <div><p className="text-gray-500">Email</p><p className="font-medium">{client.email || '—'}</p></div>
                <div><p className="text-gray-500">Address</p><p className="font-medium">{client.address || '—'}</p></div>
                <div><p className="text-gray-500">City</p><p className="font-medium">{client.city || '—'}</p></div>
                <div><p className="text-gray-500">Province</p><p className="font-medium">{client.province || '—'}</p></div>
              </div>
            </Card>
          )}

          {/* Loans */}
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
                  <div key={loan.id} onClick={() => navigate(`/loans/${loan.id}`)}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                    <div>
                      <p className="text-sm font-medium">{loan.loan_number}</p>
                      <p className="text-xs text-gray-500">{formatCurrency(loan.principal)} · {loan.term_months} months</p>
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

        {/* ── SIDEBAR ── */}
        <div className="space-y-6">

          {/* BUSINESS: Required Documents Checklist */}
          {isBusiness && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand-600" />
                  <CardTitle>Required Documents</CardTitle>
                </div>
              </CardHeader>
              <div className="space-y-2">
                {BUSINESS_REQUIRED_DOCS.map((req) => {
                  const uploaded = uploadedDocTypes.has(req.type);
                  return (
                    <div key={req.type} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${uploaded ? 'bg-green-50' : 'bg-gray-50'}`}>
                      {uploaded
                        ? <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                        : <XCircle className="h-4 w-4 text-gray-400 shrink-0" />}
                      <span className={uploaded ? 'text-green-800 font-medium' : 'text-gray-500'}>{req.label}</span>
                    </div>
                  );
                })}
                <p className="text-xs text-gray-400 pt-1">
                  {uploadedDocTypes.size} of {BUSINESS_REQUIRED_DOCS.length} required docs uploaded
                </p>
              </div>
            </Card>
          )}

          {/* Guarantors */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Guarantors ({guarantors.length})</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowGuarantorForm(true)}><Plus className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            {guarantors.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No guarantors</p>
            ) : (
              <div className="space-y-3">
                {guarantors.map((g) => {
                  const gDocs = guarantorDocuments[g.id] || [];
                  return (
                    <div key={g.id} className="p-3 rounded-lg border border-gray-100 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{g.first_name} {g.last_name}</p>
                          <p className="text-xs text-gray-500">{g.relationship} · {g.phone}</p>
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <Badge colorClass={g.kyc_verified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}>
                              {g.kyc_verified ? 'KYC Verified' : 'KYC Pending'}
                            </Badge>
                            <Badge colorClass={gDocs.length > 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}>
                              {gDocs.length > 0 ? `${gDocs.length} doc${gDocs.length === 1 ? '' : 's'}` : 'No docs'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {canVerifyKyc && (
                            <Button
                              size="sm"
                              variant={g.kyc_verified ? 'outline' : 'primary'}
                              onClick={() => toggleGuarantorKyc(g)}
                              loading={verifyingGuarantorId === g.id}
                            >
                              {g.kyc_verified ? 'Unverify' : 'Verify KYC'}
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setUploadingGuarantorId(g.id)}>
                            <Upload className="h-3 w-3 mr-1" /> Doc
                          </Button>
                        </div>
                      </div>
                      {gDocs.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-gray-100">
                          {gDocs.map((doc) => (
                            <div key={doc.id} className="flex items-center gap-2 text-xs">
                              <DocThumbnail mimeType={doc.mime_type} viewUrl={getDocumentViewUrl(doc)} fileName={doc.file_name} size="sm" />
                              <span className="flex-1 truncate text-gray-700" title={doc.file_name}>{doc.file_name}</span>
                              <Badge colorClass={doc.verified ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}>
                                {doc.verified ? 'Verified' : 'Unverified'}
                              </Badge>
                              <a href={getDocumentViewUrl(doc)} target="_blank" rel="noopener noreferrer"
                                className="text-teal-600 hover:text-teal-800 shrink-0">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              {canDeleteDoc(doc) && (
                                <button onClick={() => setDeleteTarget(doc)}
                                  className="text-red-400 hover:text-red-600 shrink-0">
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

          {/* Documents */}
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
                  <Upload className="h-4 w-4 mr-1" /> Upload Document
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-2 p-2 rounded border border-gray-100 text-sm">
                    <DocThumbnail mimeType={doc.mime_type} viewUrl={getDocumentViewUrl(doc)} fileName={doc.file_name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate" title={doc.file_name}>{doc.file_name}</p>
                      <p className="text-xs text-gray-400 capitalize">{doc.document_type.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge colorClass={doc.verified ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}>
                      {doc.verified ? 'Verified' : 'Unverified'}
                    </Badge>
                    <a href={getDocumentViewUrl(doc)} target="_blank" rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-800 shrink-0" title="View / Download">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    {canDeleteDoc(doc) && (
                      <button onClick={() => setDeleteTarget(doc)}
                        className="text-red-400 hover:text-red-600 shrink-0" title="Delete document">
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

      {/* Modals */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Document" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to permanently delete <span className="font-semibold">{deleteTarget?.file_name}</span>? This cannot be undone.
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
          documentTypes={clientDocTypes}
        />
      )}

      {uploadingGuarantorId && (
        <UploadDocumentModal
          isOpen={true}
          onClose={() => setUploadingGuarantorId(null)}
          entityType="guarantor_kyc"
          entityId={uploadingGuarantorId}
          onSuccess={() => loadClientData()}
        />
      )}
    </div>
  );
}
