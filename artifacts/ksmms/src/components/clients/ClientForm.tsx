import { useState, type FormEvent } from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import type { Client, UserProfile } from '../../lib/types';

interface ClientFormProps {
  client: Client | null;
  officers: UserProfile[];
  onSave: (data: Partial<Client>) => void;
  onCancel: () => void;
}

export default function ClientForm({ client, officers, onSave, onCancel }: ClientFormProps) {
  const [form, setForm] = useState({
    first_name: client?.first_name || '',
    last_name: client?.last_name || '',
    id_number: client?.id_number || '',
    id_type: client?.id_type || 'national_id',
    date_of_birth: client?.date_of_birth || '',
    gender: client?.gender || 'male',
    phone: client?.phone || '',
    email: client?.email || '',
    address: client?.address || '',
    city: client?.city || '',
    province: client?.province || '',
    employment_status: client?.employment_status || 'employed',
    employer: client?.employer || '',
    monthly_income: client?.monthly_income || 0,
    client_type: client?.client_type || 'individual',
    business_name: client?.business_name || '',
    business_reg_number: client?.business_reg_number || '',
    assigned_officer_id: client?.assigned_officer_id || '',
    status: client?.status || 'active',
  });
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSave({
      ...form,
      monthly_income: Number(form.monthly_income),
      assigned_officer_id: form.assigned_officer_id || null,
    });
    setSaving(false);
  }

  function updateField(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const provinces = [
    { value: '', label: 'Select Province' },
    { value: 'Harare', label: 'Harare' },
    { value: 'Bulawayo', label: 'Bulawayo' },
    { value: 'Manicaland', label: 'Manicaland' },
    { value: 'Mashonaland Central', label: 'Mashonaland Central' },
    { value: 'Mashonaland East', label: 'Mashonaland East' },
    { value: 'Mashonaland West', label: 'Mashonaland West' },
    { value: 'Masvingo', label: 'Masvingo' },
    { value: 'Matabeleland North', label: 'Matabeleland North' },
    { value: 'Matabeleland South', label: 'Matabeleland South' },
    { value: 'Midlands', label: 'Midlands' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="First Name" value={form.first_name} onChange={(e) => updateField('first_name', e.target.value)} required />
        <Input label="Last Name" value={form.last_name} onChange={(e) => updateField('last_name', e.target.value)} required />
        <Input label="ID Number" value={form.id_number} onChange={(e) => updateField('id_number', e.target.value)} required />
        <Select
          label="ID Type"
          value={form.id_type}
          onChange={(e) => updateField('id_type', e.target.value)}
          options={[
            { value: 'national_id', label: 'National ID' },
            { value: 'passport', label: 'Passport' },
          ]}
        />
        <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={(e) => updateField('date_of_birth', e.target.value)} />
        <Select
          label="Gender"
          value={form.gender}
          onChange={(e) => updateField('gender', e.target.value)}
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Input label="Phone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} required placeholder="+263..." />
        <Input label="Email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <Input label="Address" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
          </div>
          <Input label="City" value={form.city} onChange={(e) => updateField('city', e.target.value)} />
          <Select label="Province" value={form.province} onChange={(e) => updateField('province', e.target.value)} options={provinces} />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Employment</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Employment Status"
            value={form.employment_status}
            onChange={(e) => updateField('employment_status', e.target.value)}
            options={[
              { value: 'employed', label: 'Employed' },
              { value: 'self_employed', label: 'Self Employed' },
              { value: 'unemployed', label: 'Unemployed' },
              { value: 'retired', label: 'Retired' },
            ]}
          />
          <Input label="Employer" value={form.employer} onChange={(e) => updateField('employer', e.target.value)} />
          <Input label="Monthly Income (USD)" type="number" value={String(form.monthly_income)} onChange={(e) => updateField('monthly_income', e.target.value)} />
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Client Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Client Type"
            value={form.client_type}
            onChange={(e) => updateField('client_type', e.target.value)}
            options={[
              { value: 'individual', label: 'Individual' },
              { value: 'business', label: 'Business' },
            ]}
          />
          {form.client_type === 'business' && (
            <>
              <Input label="Business Name" value={form.business_name} onChange={(e) => updateField('business_name', e.target.value)} />
              <Input label="Business Reg. Number" value={form.business_reg_number} onChange={(e) => updateField('business_reg_number', e.target.value)} />
            </>
          )}
          <Select
            label="Assigned Loan Officer"
            value={form.assigned_officer_id}
            onChange={(e) => updateField('assigned_officer_id', e.target.value)}
            options={[
              { value: '', label: 'Select Officer' },
              ...officers.map((o) => ({ value: o.id, label: o.full_name })),
            ]}
          />
          {client && (
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => updateField('status', e.target.value)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'blacklisted', label: 'Blacklisted' },
              ]}
            />
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onCancel} type="button">Cancel</Button>
        <Button type="submit" loading={saving}>{client ? 'Update Client' : 'Create Client'}</Button>
      </div>
    </form>
  );
}
