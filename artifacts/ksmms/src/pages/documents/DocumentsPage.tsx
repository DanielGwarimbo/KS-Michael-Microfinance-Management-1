import { useState, useEffect } from 'react';
import { FileText, CheckCircle, ExternalLink, Trash2 } from 'lucide-react';
import DocThumbnail from '../../components/documents/DocThumbnail';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import type { Document } from '../../lib/types';
import { formatDate } from '../../lib/utils';

interface DocumentRow extends Document { uploader?: { full_name: string }; }

const ENTITY_OPTIONS = [
  { value: '', label: 'All Entity Types' },
  { value: 'client_kyc', label: 'Client KYC' },
  { value: 'guarantor_kyc', label: 'Guarantor KYC' },
  { value: 'loan', label: 'Loan' },
  { value: 'collateral', label: 'Collateral' },
];

const VERIFIED_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'verified', label: 'Verified' },
  { value: 'unverified', label: 'Unverified' },
];

function getDocumentViewUrl(doc: DocumentRow): string {
  return `/api/storage${doc.file_path}`;
}

export default function DocumentsPage() {
  const { hasRole } = useAuth();
  const { addNotification } = useNotification();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [verifying, setVerifying] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canVerify = hasRole(['admin', 'manager']);
  const canDelete = hasRole(['admin', 'manager']);

  useEffect(() => { fetchDocuments(); }, [entityFilter, verifiedFilter]);

  async function fetchDocuments() {
    setLoading(true);
    const params = new URLSearchParams();
    if (entityFilter) params.set('entity_type', entityFilter);
    if (verifiedFilter) params.set('verified', verifiedFilter === 'verified' ? 'true' : 'false');
    const { data, error } = await api.get<DocumentRow[]>(`/documents${params.toString() ? '?' + params : ''}`);
    if (error) addNotification('error', 'Failed to load documents');
    else setDocuments(data || []);
    setLoading(false);
  }

  async function handleVerify(doc: DocumentRow) {
    setVerifying(doc.id);
    const { error } = await api.put(`/documents/${doc.id}/verify`);
    if (error) addNotification('error', 'Verification failed');
    else {
      addNotification('success', `Verified: ${doc.file_name}`);
      setDocuments((prev) => prev.map((d) => d.id === doc.id ? { ...d, verified: true } : d));
    }
    setVerifying(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await api.delete(`/documents/${deleteTarget.id}`);
    if (error) {
      addNotification('error', 'Failed to delete document');
    } else {
      addNotification('success', `Deleted: ${deleteTarget.file_name}`);
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
    setDeleting(false);
  }

  const fmtLabel = (s: string) => s.replace(/_/g, ' ');
  const columns = [
    { key: 'file_name', header: 'File Name', render: (d: DocumentRow) => (
      <span className="flex items-center gap-2">
        <DocThumbnail
          mimeType={d.mime_type}
          viewUrl={getDocumentViewUrl(d)}
          fileName={d.file_name}
        />
        <span className="truncate max-w-[180px]" title={d.file_name}>{d.file_name}</span>
      </span>
    )},
    { key: 'entity_type', header: 'Entity Type', render: (d: DocumentRow) => fmtLabel(d.entity_type) },
    { key: 'document_type', header: 'Doc Type', render: (d: DocumentRow) => fmtLabel(d.document_type) },
    { key: 'entity_id', header: 'Entity ID', className: 'font-mono text-xs' },
    { key: 'uploaded_by', header: 'Uploaded By', render: (d: DocumentRow) => d.uploader?.full_name || '—' },
    { key: 'verified', header: 'Status', render: (d: DocumentRow) => (
      <Badge colorClass={d.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>{d.verified ? 'Verified' : 'Unverified'}</Badge>
    )},
    { key: 'created_at', header: 'Created', render: (d: DocumentRow) => formatDate(d.created_at) },
    { key: 'view', header: 'View', render: (d: DocumentRow) => (
      d.file_path ? (
        <a
          href={getDocumentViewUrl(d)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 text-xs font-medium"
          title="View / Download"
        >
          <ExternalLink className="h-4 w-4" />
          View
        </a>
      ) : <span className="text-gray-400 text-xs">—</span>
    )},
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
      <Card>
        <div className="flex items-end gap-4 mb-4">
          <div className="w-48"><Select options={ENTITY_OPTIONS} value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} /></div>
          <div className="w-44"><Select options={VERIFIED_OPTIONS} value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)} /></div>
        </div>
        <DataTable columns={columns} data={documents} searchPlaceholder="Search documents..."
          emptyMessage={loading ? 'Loading...' : 'No documents found'}
          actions={canVerify || canDelete ? (d: any) => {
            const verifyBtn = canVerify && !d.verified ? (
              <Button key="verify" size="sm" variant="outline" onClick={() => handleVerify(d)} loading={verifying === d.id}>
                <CheckCircle className="h-4 w-4 mr-1" />Verify
              </Button>
            ) : null;
            const deleteBtn = canDelete ? (
              <Button key="delete" size="sm" variant="danger" onClick={() => setDeleteTarget(d)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null;
            if (!verifyBtn && !deleteBtn) return null;
            return <div className="flex items-center gap-1">{verifyBtn}{deleteBtn}</div>;
          } : undefined}
        />
      </Card>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Document" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to permanently delete <span className="font-semibold">{deleteTarget?.file_name}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
