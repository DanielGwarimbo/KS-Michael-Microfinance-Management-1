import { useState, type FormEvent } from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { Plus, Trash2, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';
import type { Client, UserProfile } from '../../lib/types';

export interface GuarantorDraft {
  first_name: string;
  last_name: string;
  id_number: string;
  id_type: 'national_id' | 'passport';
  phone: string;
  email: string;
  address: string;
  relationship: string;
  employment_status: 'employed' | 'self_employed' | 'unemployed' | 'retired';
  employer: string;
  monthly_income: number;
}

interface ClientFormProps {
  client: Client | null;
  officers: UserProfile[];
  onSave: (data: Partial<Client>, guarantors: GuarantorDraft[]) => void;
  onCancel: () => void;
}

const EMPTY_GUARANTOR: GuarantorDraft = {
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
};

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

  const [guarantors, setGuarantors] = useState<GuarantorDraft[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [addingGuarantor, setAddingGuarantor] = useState(false);
  const [draftGuarantor, setDraftGuarantor] = useState<GuarantorDraft>({ ...EMPTY_GUARANTOR });
  const [saving, setSaving] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSave(
      {
        ...form,
        monthly_income: Number(form.monthly_income),
        assigned_officer_id: form.assigned_officer_id || null,
      },
      guarantors,
    );
    setSaving(false);
  }

  function updateField(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateDraft(field: keyof GuarantorDraft, value: string | number) {
    setDraftGuarantor((prev) => ({ ...prev, [field]: value }));
  }

  function commitGuarantor() {
    if (!draftGuarantor.first_name.trim() || !draftGuarantor.last_name.trim() || !draftGuarantor.id_number.trim() || !draftGuarantor.phone.trim() || !draftGuarantor.relationship.trim()) return;
    setGuarantors((prev) => [...prev, { ...draftGuarantor, monthly_income: Number(draftGuarantor.monthly_income) }]);
    setDraftGuarantor({ ...EMPTY_GUARANTOR });
    setAddingGuarantor(false);
    setExpandedIndex(guarantors.length);
  }

  function removeGuarantor(idx: number) {
    setGuarantors((prev) => prev.filter((_, i) => i !== idx));
    if (expandedIndex === idx) setExpandedIndex(null);
  }

  function updateSavedGuarantor(idx: number, field: keyof GuarantorDraft, value: string | number) {
    setGuarantors((prev) => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Personal Info */}
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

      {/* Address */}
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

      {/* Employment */}
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

      {/* Client Details */}
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

      {/* Guarantors — only for new clients */}
      {!client && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-semibold text-gray-700">
                Guarantors
                {guarantors.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-brand-600 text-white text-xs font-bold">
                    {guarantors.length}
                  </span>
                )}
              </h3>
            </div>
            {!addingGuarantor && (
              <button
                type="button"
                onClick={() => { setAddingGuarantor(true); setExpandedIndex(null); }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Guarantor
              </button>
            )}
          </div>

          {/* Added guarantors list */}
          {guarantors.length > 0 && (
            <div className="space-y-2 mb-4">
              {guarantors.map((g, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                    onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-sm">
                        {g.first_name.charAt(0)}{g.last_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{g.first_name} {g.last_name}</p>
                        <p className="text-xs text-gray-500">{g.relationship} &bull; {g.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeGuarantor(idx); }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                        title="Remove guarantor"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {expandedIndex === idx ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                  {expandedIndex === idx && (
                    <div className="border-t border-gray-200 px-4 py-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input label="First Name" value={g.first_name} onChange={(e) => updateSavedGuarantor(idx, 'first_name', e.target.value)} required />
                        <Input label="Last Name" value={g.last_name} onChange={(e) => updateSavedGuarantor(idx, 'last_name', e.target.value)} required />
                        <Input label="ID Number" value={g.id_number} onChange={(e) => updateSavedGuarantor(idx, 'id_number', e.target.value)} required />
                        <Select label="ID Type" value={g.id_type} onChange={(e) => updateSavedGuarantor(idx, 'id_type', e.target.value)} options={[{ value: 'national_id', label: 'National ID' }, { value: 'passport', label: 'Passport' }]} />
                        <Input label="Phone" value={g.phone} onChange={(e) => updateSavedGuarantor(idx, 'phone', e.target.value)} required />
                        <Input label="Email" type="email" value={g.email} onChange={(e) => updateSavedGuarantor(idx, 'email', e.target.value)} />
                        <Input label="Address" value={g.address} onChange={(e) => updateSavedGuarantor(idx, 'address', e.target.value)} />
                        <Input label="Relationship" value={g.relationship} onChange={(e) => updateSavedGuarantor(idx, 'relationship', e.target.value)} required />
                        <Select label="Employment Status" value={g.employment_status} onChange={(e) => updateSavedGuarantor(idx, 'employment_status', e.target.value)} options={[{ value: 'employed', label: 'Employed' }, { value: 'self_employed', label: 'Self Employed' }, { value: 'unemployed', label: 'Unemployed' }, { value: 'retired', label: 'Retired' }]} />
                        <Input label="Employer" value={g.employer} onChange={(e) => updateSavedGuarantor(idx, 'employer', e.target.value)} />
                        <Input label="Monthly Income (USD)" type="number" value={String(g.monthly_income)} onChange={(e) => updateSavedGuarantor(idx, 'monthly_income', Number(e.target.value))} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Inline add-guarantor form */}
          {addingGuarantor && (
            <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">New Guarantor</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="First Name" value={draftGuarantor.first_name} onChange={(e) => updateDraft('first_name', e.target.value)} required />
                <Input label="Last Name" value={draftGuarantor.last_name} onChange={(e) => updateDraft('last_name', e.target.value)} required />
                <Input label="ID Number" value={draftGuarantor.id_number} onChange={(e) => updateDraft('id_number', e.target.value)} required />
                <Select label="ID Type" value={draftGuarantor.id_type} onChange={(e) => updateDraft('id_type', e.target.value)} options={[{ value: 'national_id', label: 'National ID' }, { value: 'passport', label: 'Passport' }]} />
                <Input label="Phone" value={draftGuarantor.phone} onChange={(e) => updateDraft('phone', e.target.value)} required placeholder="+263..." />
                <Input label="Email" type="email" value={draftGuarantor.email} onChange={(e) => updateDraft('email', e.target.value)} />
                <Input label="Address" value={draftGuarantor.address} onChange={(e) => updateDraft('address', e.target.value)} />
                <Input label="Relationship to Client" value={draftGuarantor.relationship} onChange={(e) => updateDraft('relationship', e.target.value)} required placeholder="e.g. Spouse, Sibling..." />
                <Select label="Employment Status" value={draftGuarantor.employment_status} onChange={(e) => updateDraft('employment_status', e.target.value)} options={[{ value: 'employed', label: 'Employed' }, { value: 'self_employed', label: 'Self Employed' }, { value: 'unemployed', label: 'Unemployed' }, { value: 'retired', label: 'Retired' }]} />
                <Input label="Employer" value={draftGuarantor.employer} onChange={(e) => updateDraft('employer', e.target.value)} />
                <Input label="Monthly Income (USD)" type="number" value={String(draftGuarantor.monthly_income)} onChange={(e) => updateDraft('monthly_income', e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setAddingGuarantor(false); setDraftGuarantor({ ...EMPTY_GUARANTOR }); }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={commitGuarantor}
                  disabled={!draftGuarantor.first_name.trim() || !draftGuarantor.last_name.trim() || !draftGuarantor.id_number.trim() || !draftGuarantor.phone.trim() || !draftGuarantor.relationship.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add to List
                </button>
              </div>
            </div>
          )}

          {guarantors.length === 0 && !addingGuarantor && (
            <p className="text-xs text-gray-400 italic">No guarantors added. You can add guarantors now or later from the client profile.</p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onCancel} type="button">Cancel</Button>
        <Button type="submit" loading={saving}>{client ? 'Update Client' : 'Create Client'}</Button>
      </div>
    </form>
  );
}
