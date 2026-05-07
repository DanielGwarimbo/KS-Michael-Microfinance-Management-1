import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import DataTable from '../../components/ui/DataTable';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import ClientForm from '../../components/clients/ClientForm';
import { Plus, Eye } from 'lucide-react';
import { formatCurrency, CLIENT_STATUS_COLORS } from '../../lib/utils';
import type { Client, UserProfile } from '../../lib/types';

export default function ClientListPage() {
  const { profile } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [officers, setOfficers] = useState<UserProfile[]>([]);

  useEffect(() => {
    loadClients();
    loadOfficers();
  }, []);

  async function loadClients() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*, assigned_officer:user_profiles!clients_assigned_officer_id_fkey(id, full_name, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients((data as unknown as Client[]) || []);
    } catch (err) {
      console.error(err);
      addNotification('error', 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  }

  async function loadOfficers() {
    const { data } = await supabase
      .from('user_profiles')
      .select('*, role:roles(*)')
      .eq('is_active', true);
    const loanOfficers = (data || []).filter((u: any) => u.role?.name === 'loan_officer');
    setOfficers(loanOfficers);
  }

  async function handleSave(clientData: Partial<Client>) {
    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update({ ...clientData, updated_at: new Date().toISOString() })
          .eq('id', editingClient.id);
        if (error) throw error;
        addNotification('success', 'Client updated successfully');
      } else {
        const { error } = await supabase
          .from('clients')
          .insert({ ...clientData, created_by: profile?.id });
        if (error) throw error;
        addNotification('success', 'Client created successfully');
      }
      setShowForm(false);
      setEditingClient(null);
      loadClients();
    } catch (err: any) {
      addNotification('error', err.message || 'Failed to save client');
    }
  }

  const columns = [
    { key: 'client_number', header: 'Client No.' },
    { key: 'full_name', header: 'Full Name', render: (c: Client) => `${c.first_name} ${c.last_name}` },
    { key: 'phone', header: 'Phone' },
    { key: 'id_number', header: 'ID Number' },
    { key: 'client_type', header: 'Type', render: (c: Client) => (
      <Badge colorClass={c.client_type === 'business' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700'}>
        {c.client_type === 'business' ? 'Business' : 'Individual'}
      </Badge>
    )},
    { key: 'monthly_income', header: 'Income', render: (c: Client) => formatCurrency(c.monthly_income) },
    { key: 'kyc_verified', header: 'KYC', render: (c: Client) => (
      <Badge colorClass={c.kyc_verified ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}>
        {c.kyc_verified ? 'Verified' : 'Pending'}
      </Badge>
    )},
    { key: 'status', header: 'Status', render: (c: Client) => (
      <Badge colorClass={CLIENT_STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-800'}>{c.status}</Badge>
    )},
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
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">Manage client registrations and KYC</p>
        </div>
        <Button onClick={() => { setEditingClient(null); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" /> New Client
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={clients}
        searchPlaceholder="Search clients..."
        onRowClick={(item) => navigate(`/clients/${item.id}`)}        actions={(item) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/clients/${item.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
      />

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingClient(null); }}
        title={editingClient ? 'Edit Client' : 'New Client'}
        size="xl"
      >
        <ClientForm
          client={editingClient}
          officers={officers}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingClient(null); }}
        />
      </Modal>
    </div>
  );
}
