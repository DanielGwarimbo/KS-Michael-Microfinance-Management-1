import { useState, type FormEvent } from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import type { Guarantor } from '../../lib/types';

interface GuarantorFormProps {
  onSave: (data: Partial<Guarantor>) => void;
  onCancel: () => void;
}

export default function GuarantorForm({ onSave, onCancel }: GuarantorFormProps) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    id_number: '',
    id_type: 'national_id',
    phone: '',
    email: '',
    address: '',
    relationship: '',
    employment_status: 'employed',
    employer: '',
    monthly_income: 0,
  });
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSave({ ...form, id_type: form.id_type as 'national_id' | 'passport', employment_status: form.employment_status as 'employed' | 'self_employed' | 'unemployed' | 'retired', monthly_income: Number(form.monthly_income) });
    setSaving(false);
  }

  function updateField(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <Input label="Phone" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} required />
        <Input label="Email" type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
        <Input label="Address" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
        <Input label="Relationship" value={form.relationship} onChange={(e) => updateField('relationship', e.target.value)} required />
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

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onCancel} type="button">Cancel</Button>
        <Button type="submit" loading={saving}>Add Guarantor</Button>
      </div>
    </form>
  );
}
