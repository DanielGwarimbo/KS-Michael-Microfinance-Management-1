import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import { Plus, UserCheck, UserX } from 'lucide-react';
import { formatDate, ROLE_LABELS } from '../../lib/utils';
import type { UserProfile, Role } from '../../lib/types';

interface UserForm {
  full_name: string;
  email: string;
  password: string;
  role_id: string;
  phone: string;
  is_active: boolean;
}

const emptyForm: UserForm = { full_name: '', email: '', password: '', role_id: '', phone: '', is_active: true };

export default function UserListPage() {
  const { profile } = useAuth();
  const { addNotification } = useNotification();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);

  useEffect(() => { loadUsers(); loadRoles(); }, []);

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, role:roles(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsers((data as UserProfile[]) || []);
    } catch {
      addNotification('error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function loadRoles() {
    const { data } = await supabase.from('roles').select('*').order('name');
    setRoles((data as Role[]) || []);
  }

  async function handleCreate() {
    if (!form.full_name || !form.email || !form.password || !form.role_id) {
      addNotification('error', 'Please fill in all required fields');
      return;
    }
    setSaving(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      });
      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('User ID not returned from sign up');
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: userId,
        email: form.email,
        full_name: form.full_name,
        role_id: form.role_id,
        phone: form.phone,
        is_active: form.is_active,
      });
      if (profileError) throw profileError;
      addNotification('success', 'User created successfully');
      setShowForm(false);
      setForm(emptyForm);
      loadUsers();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: UserProfile) {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !user.is_active, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      addNotification('success', `User ${user.is_active ? 'deactivated' : 'activated'}`);
      loadUsers();
    } catch {
      addNotification('error', 'Failed to update user status');
    }
  }

  const columns = [
    { key: 'full_name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'role', header: 'Role', render: (u: UserProfile) => (
      <Badge colorClass="bg-teal-50 text-teal-700">
        {u.role ? ROLE_LABELS[u.role.name] || u.role.name : '—'}
      </Badge>
    )},
    { key: 'is_active', header: 'Status', render: (u: UserProfile) => (
      <Badge colorClass={u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
        {u.is_active ? 'Active' : 'Inactive'}
      </Badge>
    )},
    { key: 'created_at', header: 'Created', render: (u: UserProfile) => formatDate(u.created_at) },
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage system users and their roles</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New User
        </Button>
      </div>

      <Card padding={false}>
        <DataTable
          columns={columns}
          data={users}
          searchPlaceholder="Search users..."
          actions={(item) => {
            const u = item as unknown as UserProfile;
            const isSelf = u.id === profile?.id;
            return (
              <Button
                variant="ghost"
                size="sm"
                disabled={isSelf}
                onClick={() => toggleActive(u)}
                title={isSelf ? 'Cannot deactivate yourself' : u.is_active ? 'Deactivate user' : 'Activate user'}
              >
                {u.is_active ? <UserX className="h-4 w-4 text-red-500" /> : <UserCheck className="h-4 w-4 text-green-500" />}
              </Button>
            );
          }}
        />
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Create New User">
        <div className="space-y-4">
          <Input label="Full Name *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password *" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select
            label="Role *"
            value={form.role_id}
            onChange={(e) => setForm({ ...form, role_id: e.target.value })}
            options={roles.map((r) => ({ value: r.id, label: ROLE_LABELS[r.name] || r.name }))}
            placeholder="Select a role"
          />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div className="flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-gray-700">Active</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Create User</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
