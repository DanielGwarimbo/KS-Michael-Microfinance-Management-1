import { useEffect, useState } from 'react';
import { getAuditLogs } from '../../lib/api';
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

function fmt(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

function fmtMoney(val: unknown): string {
  const n = Number(val);
  if (isNaN(n)) return fmt(val);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function summariseDetails(action: string, d: Record<string, unknown> | null | undefined): string | null {
  if (!d) return null;

  switch (action) {
    // ── Clients ──────────────────────────────────────────────────────
    case 'client_created': {
      const type = d.client_type ? ` (${d.client_type})` : '';
      return `Client: ${fmt(d.name)}${type}`;
    }
    case 'client_updated':
      return `Client: ${fmt(d.name || d.client_number)}`;
    case 'client_kyc_verified':
      return `KYC verified: ${fmt(d.name)} (${fmt(d.client_number)})`;
    case 'client_kyc_unverified':
      return `KYC unverified: ${fmt(d.name)} (${fmt(d.client_number)})`;

    // ── Guarantors ───────────────────────────────────────────────────
    case 'guarantor_added':
      return `Guarantor added: ${fmt(d.guarantor_name)}`;
    case 'guarantor_kyc_verified':
      return `Guarantor KYC verified: ${fmt(d.guarantor_name)}`;
    case 'guarantor_kyc_unverified':
      return `Guarantor KYC unverified: ${fmt(d.guarantor_name)}`;

    // ── Loans ────────────────────────────────────────────────────────
    case 'loan_application_submitted': {
      const principal = fmtMoney(d.principal);
      const term = d.term_months ? ` — ${d.term_months} months` : '';
      return `Loan ${fmt(d.loan_number)} — ${principal}${term}`;
    }
    case 'loan_approved':
      return `Loan ${fmt(d.loan_number)} — ${fmtMoney(d.principal)} approved`;
    case 'loan_rejected': {
      const reason = d.rejection_reason ? `: ${d.rejection_reason}` : '';
      return `Loan ${fmt(d.loan_number)} rejected${reason}`;
    }
    case 'loan_disbursed': {
      const inst = d.installments ? `, ${d.installments} installments` : '';
      return `Loan ${fmt(d.loan_number)} — ${fmtMoney(d.principal)} disbursed${inst}`;
    }

    // ── Repayments ───────────────────────────────────────────────────
    case 'repayment_recorded': {
      const receipt = d.receipt_number ? ` (Receipt: ${d.receipt_number})` : '';
      const loan = d.loan_number ? ` on ${d.loan_number}` : '';
      return `Repayment of ${fmtMoney(d.amount)}${loan}${receipt}`;
    }
    case 'loan_fully_repaid': {
      const receipt = d.receipt_number ? ` (Receipt: ${d.receipt_number})` : '';
      const loan = d.loan_number ? ` — ${d.loan_number}` : '';
      return `Loan fully repaid${loan}${receipt}`;
    }

    // ── Users ────────────────────────────────────────────────────────
    case 'user_created': {
      const email = d.email ? ` (${d.email})` : '';
      return `${fmt(d.full_name)}${email}`;
    }
    case 'profile_updated':
      return `Profile updated: ${fmt(d.full_name)}`;
    case 'user_activated':
      return `${fmt(d.target_user_name || d.full_name)} activated`;
    case 'user_deactivated':
      return `${fmt(d.target_user_name || d.full_name)} deactivated`;
    case 'user_password_reset': {
      const who = d.target_user_name || d.full_name;
      const email = d.target_user_email ? ` (${d.target_user_email})` : '';
      return `Password reset: ${fmt(who)}${email}`;
    }
    case 'password_changed':
      return `Password changed (${fmt(d.email)})`;

    // ── Auth ─────────────────────────────────────────────────────────
    case 'user_login':
      return `${fmt(d.full_name)} (${fmt(d.email)})`;
    case 'user_logout':
      return `${fmt(d.full_name)}`;

    // ── Documents ────────────────────────────────────────────────────
    case 'document_uploaded':
    case 'delete':
    case 'document_deleted':
    case 'document_verified': {
      const parts: string[] = [];
      if (d.document_type) parts.push(fmt(d.document_type));
      if (d.file_name) parts.push(fmt(d.file_name));
      const base = parts.join(' — ');
      const suffix = d.entity_type ? ` (${d.entity_type})` : '';
      return base ? `${base}${suffix}` : null;
    }

    default:
      return null;
  }
}

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
      const filters: { module?: string; action?: string; from?: string; to?: string } = {};
      if (moduleFilter) filters.module = moduleFilter;
      if (actionFilter) filters.action = actionFilter;
      if (dateFrom) filters.from = dateFrom;
      if (dateTo) filters.to = dateTo;
      const data = await getAuditLogs(filters);
      setLogs(data);
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
      const raw = JSON.stringify(details || {});
      const summary = summariseDetails(log.action, details);
      if (summary) {
        return (
          <span className="text-xs text-gray-700" title={raw}>
            {summary}
          </span>
        );
      }
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
