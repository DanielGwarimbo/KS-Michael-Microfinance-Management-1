import { useState, useEffect } from 'react';
import { FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import Button from '../../components/ui/Button';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
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

  const canVerify = hasRole(['admin', 'manager']);

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

  const fmtLabel = (s: string) => s.replace(/_/g, ' ');
  const columns = [
    { key: 'file_name', header: 'File Name', render: (d: DocumentRow) => (
      <span className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-400 shrink-0" />
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
          className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-800 text-xs font-medium"
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
          actions={canVerify ? (d: any) => {
            return d.verified ? null : (
              <Button size="sm" variant="outline" onClick={() => handleVerify(d)} loading={verifying === d.id}>
                <CheckCircle className="h-4 w-4 mr-1" />Verify
              </Button>
            );
          } : undefined}
        />
      </Card>
    </div>
  );
}
