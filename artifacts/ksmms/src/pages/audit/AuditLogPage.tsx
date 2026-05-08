import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { formatDateTime, ROLE_LABELS } from '../../lib/utils';
import type { AuditLog } from '../../lib/types';

const MODULE_OPTIONS = [
  { value: '', label: 'All Modules' },
  { value: 'clients', label: 'Clients' },
  { value: 'loans', label: 'Loans' },
  { value: 'repayments', label: 'Repayments' },
  { value: 'users', label: 'Users' },
  { value: 'accounting', label: 'Accounting' },
  { value: 'documents', label: 'Documents' },
];

const ACTION_OPTIONS_BY_MODULE: Record<string, { value: string; label: string }[]> = {
  documents: [
    { value: '', label: 'All Actions' },
    { value: 'document_uploaded', label: 'Uploaded' },
    { value: 'document_deleted', label: 'Deleted' },
    { value: 'document_verified', label: 'Verified' },
  ],
  clients: [
    { value: '', label: 'All Actions' },
    { value: 'client_created', label: 'Created' },
    { value: 'client_updated', label: 'Updated' },
    { value: 'client_deleted', label: 'Deleted' },
  ],
  loans: [
    { value: '', label: 'All Actions' },
    { value: 'loan_created', label: 'Created' },
    { value: 'loan_approved', label: 'Approved' },
    { value: 'loan_rejected', label: 'Rejected' },
    { value: 'loan_disbursed', label: 'Disbursed' },
    { value: 'loan_closed', label: 'Closed' },
  ],
  repayments: [
    { value: '', label: 'All Actions' },
    { value: 'repayment_recorded', label: 'Recorded' },
  ],
  users: [
    { value: '', label: 'All Actions' },
    { value: 'user_created', label: 'Created' },
    { value: 'user_updated', label: 'Updated' },
    { value: 'user_activated', label: 'Activated' },
    { value: 'user_deactivated', label: 'Deactivated' },
    { value: 'password_reset', label: 'Password Reset' },
  ],
};

const DEFAULT_ACTION_OPTIONS = [{ value: '', label: 'All Actions' }];

const MODULE_COLORS: Record<string, string> = {
  clients: 'bg-blue-100 text-blue-800',
  loans: 'bg-purple-100 text-purple-800',
  repayments: 'bg-green-100 text-green-800',
  users: 'bg-brand-100 text-brand-800',
  accounting: 'bg-yellow-100 text-yellow-800',
  documents: 'bg-gray-100 text-gray-800',
};

export default function AuditLogPage() {
  const { addNotification } = useNotification();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const actionOptions = moduleFilter
    ? (ACTION_OPTIONS_BY_MODULE[moduleFilter] ?? DEFAULT_ACTION_OPTIONS)
    : DEFAULT_ACTION_OPTIONS;

  function handleModuleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setModuleFilter(e.target.value);
    setActionFilter('');
  }

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (moduleFilter) params.set('module', moduleFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const { data, error } = await api.get<AuditLog[]>(`/audit${params.toString() ? '?' + params : ''}`);
      if (error) throw new Error(error);
      setLogs(data || []);
    } catch {
      addNotification('error', 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    { key: 'user', header: 'User', render: (log: AuditLog) => (log as any).user?.full_name || '—' },
    { key: 'user_role', header: 'Role', render: (log: AuditLog) => <Badge colorClass="bg-gray-100 text-gray-700">{ROLE_LABELS[log.user_role] || log.user_role}</Badge> },
    { key: 'action', header: 'Action', render: (log: AuditLog) => <span className="font-medium">{log.action}</span> },
    { key: 'module', header: 'Module', render: (log: AuditLog) => <Badge colorClass={MODULE_COLORS[log.module] || 'bg-gray-100 text-gray-800'}>{log.module}</Badge> },
    { key: 'entity_type', header: 'Entity Type' },
    { key: 'details', header: 'Details', render: (log: AuditLog) => {
      const details = log.details as Record<string, unknown> | null | undefined;
      const isDocumentAction = ['document_uploaded', 'document_deleted', 'document_verified'].includes(log.action);
      if (isDocumentAction && details) {
        const parts: string[] = [];
        if (details.document_type) parts.push(String(details.document_type));
        if (details.file_name) parts.push(String(details.file_name));
        const base = parts.join(' — ');
        const suffix = details.entity_type ? `(${details.entity_type})` : '';
        const summary = [base, suffix].filter(Boolean).join(' ');
        return (
          <span className="text-xs text-gray-700" title={JSON.stringify(details)}>
            {summary || '—'}
          </span>
        );
      }
      const raw = JSON.stringify(details || {});
      return (
        <span className="text-xs font-mono text-gray-500" title={raw}>
          {raw.slice(0, 50)}{raw.length > 50 ? '...' : ''}
        </span>
      );
    }},
    { key: 'ip_address', header: 'IP', render: (log: AuditLog) => <span className="font-mono text-xs">{log.ip_address}</span> },
    { key: 'created_at', header: 'Timestamp', render: (log: AuditLog) => formatDateTime(log.created_at) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Track all system activity and changes</p>
      </div>
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
          <Select label="Module" value={moduleFilter} onChange={handleModuleChange} options={MODULE_OPTIONS} />
          <Select label="Action" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} options={actionOptions} disabled={actionOptions.length <= 1} />
          <Input label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button onClick={loadLogs} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors h-[38px] self-end">Apply Filter</button>
        </div>
      </Card>
      <Card padding={false}>
        {loading ? (
          <div className="flex items-center justify-center h-32"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>
        ) : (
          <DataTable columns={columns} data={logs} searchPlaceholder="Search audit logs..." pageSize={15} />
        )}
      </Card>
    </div>
  );
}
