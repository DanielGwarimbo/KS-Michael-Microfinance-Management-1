import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { Plus, UserCheck, UserX, KeyRound } from 'lucide-react';
import { formatDate, ROLE_LABELS } from '../../lib/utils';
import type { UserProfile, Role } from '../../lib/types';

interface UserForm { full_name: string; email: string; password: string; role_id: string; phone: string; is_active: boolean; }
const emptyForm: UserForm = { full_name: '', email: '', password: '', role_id: '', phone: '', is_active: true };

interface ResetPasswordForm { new_password: string; confirm_password: string; }
const emptyResetForm: ResetPasswordForm = { new_password: '', confirm_password: '' };

export default function UserListPage() {
  const { profile } = useAuth();
  const { addNotification } = useNotification();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);

  const [resetTarget, setResetTarget] = useState<UserProfile | null>(null);
  const [resetForm, setResetForm] = useState<ResetPasswordForm>(emptyResetForm);
  const [resetting, setResetting] = useState(false);

  useEffect(() => { loadUsers(); loadRoles(); }, []);

  async function loadUsers() {
    try {
      const { data, error } = await api.get<UserProfile[]>('/users');
      if (error) throw new Error(error);
      setUsers(data || []);
    } catch { addNotification('error', 'Failed to load users'); }
    finally { setLoading(false); }
  }

  async function loadRoles() {
    const { data } = await api.get<Role[]>('/roles');
    setRoles(data || []);
  }

  async function handleCreate() {
    if (!form.full_name || !form.email || !form.password || !form.role_id) {
      addNotification('error', 'Please fill in all required fields'); return;
    }
    setSaving(true);
    try {
      const { error } = await api.post('/users', form);
      if (error) throw new Error(error);
      addNotification('success', 'User created successfully');
      setShowForm(false); setForm(emptyForm); loadUsers();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to create user');
    } finally { setSaving(false); }
  }

  async function toggleActive(user: UserProfile) {
    try {
      const { error } = await api.put(`/users/${user.id}/toggle-active`);
      if (error) throw new Error(error);
      addNotification('success', `User ${user.is_active ? 'deactivated' : 'activated'}`);
      loadUsers();
    } catch { addNotification('error', 'Failed to update user status'); }
  }

  function openResetModal(user: UserProfile) {
    setResetTarget(user);
    setResetForm(emptyResetForm);
  }

  async function handleResetPassword() {
    if (!resetTarget) return;
    if (!resetForm.new_password) {
      addNotification('error', 'Please enter a new password'); return;
    }
    if (resetForm.new_password.length < 6) {
      addNotification('error', 'Password must be at least 6 characters'); return;
    }
    if (resetForm.new_password !== resetForm.confirm_password) {
      addNotification('error', 'Passwords do not match'); return;
    }
    setResetting(true);
    try {
      const { error } = await api.put(`/users/${resetTarget.id}/reset-password`, { new_password: resetForm.new_password });
      if (error) throw new Error(error);
      addNotification('success', `Password reset successfully for ${resetTarget.full_name}`);
      setResetTarget(null);
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to reset password');
    } finally { setResetting(false); }
  }

  const columns = [
    { key: 'full_name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (u: UserProfile) => (
      <Badge colorClass="bg-brand-50 text-brand-700">{u.role ? ROLE_LABELS[u.role.name] || u.role.name : '—'}</Badge>
    )},
    { key: 'is_active', header: 'Status', render: (u: UserProfile) => (
      <Badge colorClass={u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>
    )},
    { key: 'created_at', header: 'Created', render: (u: UserProfile) => formatDate(u.created_at) },
  ];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage system users and their roles</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" /> New User</Button>
      </div>
      <Card padding={false}>
        <DataTable columns={columns} data={users} searchPlaceholder="Search users..."
          actions={(item) => {
            const u = item as unknown as UserProfile;
            const isSelf = u.id === profile?.id;
            return (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => openResetModal(u)} title="Reset password">
                  <KeyRound className="h-4 w-4 text-gray-500" />
                </Button>
                <Button variant="ghost" size="sm" disabled={isSelf} onClick={() => toggleActive(u)}
                  title={isSelf ? 'Cannot deactivate yourself' : u.is_active ? 'Deactivate' : 'Activate'}>
                  {u.is_active ? <UserX className="h-4 w-4 text-red-500" /> : <UserCheck className="h-4 w-4 text-green-500" />}
                </Button>
              </div>
            );
          }}
        />
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create New User">
        <div className="space-y-4">
          <Input label="Full Name *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password *" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select label="Role *" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}
            options={roles.map((r) => ({ value: r.id, label: ROLE_LABELS[r.name] || r.name }))} placeholder="Select a role" />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div className="flex items-center gap-2">
            <input id="is_active" type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Create User</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} title="Reset User Password">
        <div className="space-y-4">
          {resetTarget && (
            <p className="text-sm text-gray-600">
              Set a new password for <span className="font-semibold">{resetTarget.full_name}</span>. The user will need to use this new password to log in.
            </p>
          )}
          <Input
            label="New Password *"
            type="password"
            value={resetForm.new_password}
            onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })}
            placeholder="At least 6 characters"
          />
          <Input
            label="Confirm Password *"
            type="password"
            value={resetForm.confirm_password}
            onChange={(e) => setResetForm({ ...resetForm, confirm_password: e.target.value })}
            placeholder="Re-enter new password"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setResetTarget(null)}>Cancel</Button>
            <Button onClick={handleResetPassword} loading={resetting}>Reset Password</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
