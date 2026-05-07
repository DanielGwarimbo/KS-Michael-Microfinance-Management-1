import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
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

const MODULE_COLORS: Record<string, string> = {
  clients: 'bg-blue-100 text-blue-800',
  loans: 'bg-purple-100 text-purple-800',
  repayments: 'bg-green-100 text-green-800',
  users: 'bg-teal-100 text-teal-800',
  accounting: 'bg-yellow-100 text-yellow-800',
  documents: 'bg-gray-100 text-gray-800',
};

export default function AuditLogPage() {
  const { addNotification } = useNotification();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => { loadLogs(); }, []);

  async function loadLogs() {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*, user:user_profiles!audit_logs_user_id_fkey(full_name)')
        .order('created_at', { ascending: false });
      if (moduleFilter) query = query.eq('module', moduleFilter);
      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');
      const { data, error } = await query;
      if (error) throw error;
      setLogs((data as AuditLog[]) || []);
    } catch {
      addNotification('error', 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  function handleFilter() { setLoading(true); loadLogs(); }

  const columns = [
    { key: 'user', header: 'User', render: (log: AuditLog) => log.user?.full_name || '—' },
    { key: 'user_role', header: 'Role', render: (log: AuditLog) => (
      <Badge colorClass="bg-gray-100 text-gray-700">{ROLE_LABELS[log.user_role] || log.user_role}</Badge>
    )},
    { key: 'action', header: 'Action', render: (log: AuditLog) => <span className="font-medium">{log.action}</span> },
    { key: 'module', header: 'Module', render: (log: AuditLog) => (
      <Badge colorClass={MODULE_COLORS[log.module] || 'bg-gray-100 text-gray-800'}>{log.module}</Badge>
    )},
    { key: 'entity_type', header: 'Entity Type', render: (log: AuditLog) => log.entity_type },
    { key: 'details', header: 'Details', className: 'max-w-[200px]', render: (log: AuditLog) => (
      <span className="text-xs font-mono text-gray-500" title={JSON.stringify(log.details)}>
        {JSON.stringify(log.details).slice(0, 50)}{JSON.stringify(log.details).length > 50 ? '...' : ''}
      </span>
    )},
    { key: 'ip_address', header: 'IP Address', render: (log: AuditLog) => <span className="font-mono text-xs">{log.ip_address}</span> },
    { key: 'created_at', header: 'Timestamp', render: (log: AuditLog) => formatDateTime(log.created_at) },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Track all system activity and changes</p>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <Select label="Module" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)} options={MODULE_OPTIONS} />
          <Input label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input label="To" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button onClick={handleFilter} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors h-[38px] self-end">
            Apply Filter
          </button>
        </div>
      </Card>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={logs}
          searchPlaceholder="Search audit logs..."
          pageSize={15}
        />
      </Card>
    </div>
  );
}
