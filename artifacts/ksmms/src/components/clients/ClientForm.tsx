import { useState, type FormEvent } from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { Plus, Trash2, UserCheck, Users, ChevronDown, ChevronUp, Building2, User } from 'lucide-react';
import type { Client, Director, UserProfile } from '../../lib/types';

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
  first_name: '', last_name: '', id_number: '', id_type: 'national_id',
  phone: '', email: '', address: '', relationship: '',
  employment_status: 'employed', employer: '', monthly_income: 0,
};

const EMPTY_DIRECTOR: Director = {
  name: '', id_number: '', id_type: 'national_id', phone: '', email: '',
};

const ID_TYPE_OPTIONS = [
  { value: 'national_id', label: 'National ID' },
  { value: 'passport', label: 'Passport' },
];

const EMPLOYMENT_OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'retired', label: 'Retired' },
];

const PROVINCES = [
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

const BUSINESS_TYPES = [
  { value: '', label: 'Select Business Type' },
  { value: 'pvt_ltd', label: 'Private Limited (Pvt Ltd)' },
  { value: 'pbc', label: 'Public Business Corporation (PBC)' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'sole_trader', label: 'Sole Trader' },
  { value: 'ngo', label: 'NGO / Non-Profit' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'other', label: 'Other' },
];

const INDUSTRY_SECTORS = [
  { value: '', label: 'Select Industry' },
  { value: 'agriculture', label: 'Agriculture & Farming' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail_trade', label: 'Retail & Trade' },
  { value: 'wholesale', label: 'Wholesale & Distribution' },
  { value: 'construction', label: 'Construction & Real Estate' },
  { value: 'transport', label: 'Transport & Logistics' },
  { value: 'hospitality', label: 'Hospitality & Tourism' },
  { value: 'professional_services', label: 'Professional Services' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'financial_services', label: 'Financial Services' },
  { value: 'mining', label: 'Mining & Resources' },
  { value: 'technology', label: 'Technology & ICT' },
  { value: 'other', label: 'Other' },
];

function SectionHeading({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-brand-600 shrink-0" />
      <h3 className="text-sm font-semibold text-gray-700">{children}</h3>
    </div>
  );
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
    trading_name: client?.trading_name || '',
    date_of_incorporation: client?.date_of_incorporation || '',
    business_type: client?.business_type || '',
    industry_sector: client?.industry_sector || '',
    num_employees: client?.num_employees || 0,
    annual_turnover: client?.annual_turnover || 0,
    assigned_officer_id: client?.assigned_officer_id || '',
    status: client?.status || 'active',
  });

  const [directorsList, setDirectorsList] = useState<Director[]>(client?.directors || []);
  const [addingDirector, setAddingDirector] = useState(false);
  const [draftDirector, setDraftDirector] = useState<Director>({ ...EMPTY_DIRECTOR });
  const [expandedDirectorIdx, setExpandedDirectorIdx] = useState<number | null>(null);

  const [guarantors, setGuarantors] = useState<GuarantorDraft[]>([]);
  const [addingGuarantor, setAddingGuarantor] = useState(false);
  const [draftGuarantor, setDraftGuarantor] = useState<GuarantorDraft>({ ...EMPTY_GUARANTOR });
  const [expandedGuarantorIdx, setExpandedGuarantorIdx] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  const isBusiness = form.client_type === 'business';

  function set(field: string, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onSave(
      {
        ...form,
        monthly_income: Number(form.monthly_income),
        num_employees: Number(form.num_employees),
        annual_turnover: Number(form.annual_turnover),
        assigned_officer_id: form.assigned_officer_id || null,
        directors: directorsList,
      } as Partial<Client>,
      guarantors,
    );
    setSaving(false);
  }

  function commitDirector() {
    if (!draftDirector.name.trim() || !draftDirector.id_number.trim() || !draftDirector.phone.trim()) return;
    setDirectorsList((prev) => [...prev, { ...draftDirector }]);
    setDraftDirector({ ...EMPTY_DIRECTOR });
    setAddingDirector(false);
    setExpandedDirectorIdx(directorsList.length);
  }

  function removeDirector(idx: number) {
    setDirectorsList((prev) => prev.filter((_, i) => i !== idx));
    if (expandedDirectorIdx === idx) setExpandedDirectorIdx(null);
  }

  function updateDirector(idx: number, field: keyof Director, value: string) {
    setDirectorsList((prev) => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  }

  function commitGuarantor() {
    if (!draftGuarantor.first_name.trim() || !draftGuarantor.last_name.trim() || !draftGuarantor.id_number.trim() || !draftGuarantor.phone.trim() || !draftGuarantor.relationship.trim()) return;
    setGuarantors((prev) => [...prev, { ...draftGuarantor, monthly_income: Number(draftGuarantor.monthly_income) }]);
    setDraftGuarantor({ ...EMPTY_GUARANTOR });
    setAddingGuarantor(false);
    setExpandedGuarantorIdx(guarantors.length);
  }

  function removeGuarantor(idx: number) {
    setGuarantors((prev) => prev.filter((_, i) => i !== idx));
    if (expandedGuarantorIdx === idx) setExpandedGuarantorIdx(null);
  }

  function updateGuarantor(idx: number, field: keyof GuarantorDraft, value: string | number) {
    setGuarantors((prev) => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Client Type Toggle */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Client Type</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'individual', label: 'Individual', Icon: User, desc: 'Personal borrower' },
            { value: 'business', label: 'Business / Company', Icon: Building2, desc: 'Company or organisation' },
          ].map(({ value, label, Icon, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => set('client_type', value)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                form.client_type === value
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${form.client_type === value ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className={`text-sm font-semibold ${form.client_type === value ? 'text-brand-700' : 'text-gray-700'}`}>{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── INDIVIDUAL FIELDS ── */}
      {!isBusiness && (
        <>
          <div className="border-t border-gray-200 pt-4">
            <SectionHeading icon={User}>Personal Details</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="First Name" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
              <Input label="Last Name" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
              <Input label="ID Number" value={form.id_number} onChange={(e) => set('id_number', e.target.value)} required />
              <Select label="ID Type" value={form.id_type} onChange={(e) => set('id_type', e.target.value)} options={ID_TYPE_OPTIONS} />
              <Input label="Date of Birth" type="date" value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
              <Select label="Gender" value={form.gender} onChange={(e) => set('gender', e.target.value)} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
              <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} required placeholder="+263..." />
              <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <SectionHeading icon={User}>Address</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <Input label="Address" value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>
              <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} />
              <Select label="Province" value={form.province} onChange={(e) => set('province', e.target.value)} options={PROVINCES} />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <SectionHeading icon={User}>Employment</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select label="Employment Status" value={form.employment_status} onChange={(e) => set('employment_status', e.target.value)} options={EMPLOYMENT_OPTIONS} />
              <Input label="Employer" value={form.employer} onChange={(e) => set('employer', e.target.value)} />
              <Input label="Monthly Income (USD)" type="number" value={String(form.monthly_income)} onChange={(e) => set('monthly_income', e.target.value)} />
            </div>
          </div>
        </>
      )}

      {/* ── BUSINESS FIELDS ── */}
      {isBusiness && (
        <>
          <div className="border-t border-gray-200 pt-4">
            <SectionHeading icon={Building2}>Business Details</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Registered Business Name" value={form.business_name} onChange={(e) => set('business_name', e.target.value)} required placeholder="e.g. ABC Holdings (Pvt) Ltd" />
              <Input label="Trading / Brand Name" value={form.trading_name} onChange={(e) => set('trading_name', e.target.value)} placeholder="If different from registered name" />
              <Input label="CR Number (Registration No.)" value={form.business_reg_number} onChange={(e) => set('business_reg_number', e.target.value)} required placeholder="e.g. 1234/2019" />
              <Input label="Date of Incorporation" type="date" value={form.date_of_incorporation} onChange={(e) => set('date_of_incorporation', e.target.value)} />
              <Select label="Business Type" value={form.business_type} onChange={(e) => set('business_type', e.target.value)} options={BUSINESS_TYPES} />
              <Select label="Industry / Sector" value={form.industry_sector} onChange={(e) => set('industry_sector', e.target.value)} options={INDUSTRY_SECTORS} />
              <Input label="Number of Employees" type="number" value={String(form.num_employees)} onChange={(e) => set('num_employees', e.target.value)} />
              <Input label="Annual Turnover (USD)" type="number" value={String(form.annual_turnover)} onChange={(e) => set('annual_turnover', e.target.value)} />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <SectionHeading icon={User}>Contact Person & Business Contact</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Contact Person First Name" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
              <Input label="Contact Person Last Name" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
              <Input label="Business Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} required placeholder="+263..." />
              <Input label="Business Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <SectionHeading icon={Building2}>Business Address</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <Input label="Street Address" value={form.address} onChange={(e) => set('address', e.target.value)} />
              </div>
              <Input label="City / Town" value={form.city} onChange={(e) => set('city', e.target.value)} />
              <Select label="Province" value={form.province} onChange={(e) => set('province', e.target.value)} options={PROVINCES} />
            </div>
          </div>

          {/* Directors Section */}
          {!client && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-brand-600" />
                  <h3 className="text-sm font-semibold text-gray-700">
                    Directors
                    {directorsList.length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center h-5 w-5 rounded-full bg-brand-600 text-white text-xs font-bold">
                        {directorsList.length}
                      </span>
                    )}
                  </h3>
                </div>
                {!addingDirector && (
                  <button type="button" onClick={() => { setAddingDirector(true); setExpandedDirectorIdx(null); }}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                    <Plus className="h-4 w-4" /> Add Director
                  </button>
                )}
              </div>

              {directorsList.length > 0 && (
                <div className="space-y-2 mb-4">
                  {directorsList.map((d, idx) => (
                    <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                        onClick={() => setExpandedDirectorIdx(expandedDirectorIdx === idx ? null : idx)}>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-xs">
                            {d.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                            <p className="text-xs text-gray-500">{d.id_type === 'national_id' ? 'National ID' : 'Passport'}: {d.id_number} &bull; {d.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeDirector(idx); }}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {expandedDirectorIdx === idx ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </div>
                      </div>
                      {expandedDirectorIdx === idx && (
                        <div className="border-t border-gray-200 px-4 py-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                              <Input label="Full Name" value={d.name} onChange={(e) => updateDirector(idx, 'name', e.target.value)} required />
                            </div>
                            <Input label="ID Number" value={d.id_number} onChange={(e) => updateDirector(idx, 'id_number', e.target.value)} required />
                            <Select label="ID Type" value={d.id_type} onChange={(e) => updateDirector(idx, 'id_type', e.target.value)} options={ID_TYPE_OPTIONS} />
                            <Input label="Phone" value={d.phone} onChange={(e) => updateDirector(idx, 'phone', e.target.value)} />
                            <Input label="Email" type="email" value={d.email} onChange={(e) => updateDirector(idx, 'email', e.target.value)} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {addingDirector && (
                <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4 space-y-3">
                  <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">New Director</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <Input label="Full Name" value={draftDirector.name} onChange={(e) => setDraftDirector(p => ({ ...p, name: e.target.value }))} required />
                    </div>
                    <Input label="ID Number" value={draftDirector.id_number} onChange={(e) => setDraftDirector(p => ({ ...p, id_number: e.target.value }))} required />
                    <Select label="ID Type" value={draftDirector.id_type} onChange={(e) => setDraftDirector(p => ({ ...p, id_type: e.target.value as 'national_id' | 'passport' }))} options={ID_TYPE_OPTIONS} />
                    <Input label="Phone" value={draftDirector.phone} onChange={(e) => setDraftDirector(p => ({ ...p, phone: e.target.value }))} required placeholder="+263..." />
                    <Input label="Email" type="email" value={draftDirector.email} onChange={(e) => setDraftDirector(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button type="button" onClick={() => { setAddingDirector(false); setDraftDirector({ ...EMPTY_DIRECTOR }); }}
                      className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
                      Cancel
                    </button>
                    <button type="button" onClick={commitDirector}
                      disabled={!draftDirector.name.trim() || !draftDirector.id_number.trim() || !draftDirector.phone.trim()}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      <Plus className="h-3.5 w-3.5" /> Add Director
                    </button>
                  </div>
                </div>
              )}

              {directorsList.length === 0 && !addingDirector && (
                <p className="text-xs text-gray-400 italic">No directors added. You can add directors now or later from the business profile.</p>
              )}
            </div>
          )}
        </>
      )}

      {/* Assignment */}
      <div className="border-t border-gray-200 pt-4">
        <SectionHeading icon={User}>Assignment</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Assigned Loan Officer"
            value={form.assigned_officer_id}
            onChange={(e) => set('assigned_officer_id', e.target.value)}
            options={[{ value: '', label: 'Select Officer' }, ...officers.map((o) => ({ value: o.id, label: o.full_name }))]}
          />
          {client && (
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'blacklisted', label: 'Blacklisted' },
              ]}
            />
          )}
        </div>
      </div>

      {/* Guarantors — new clients only */}
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
              <button type="button" onClick={() => { setAddingGuarantor(true); setExpandedGuarantorIdx(null); }}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors">
                <Plus className="h-4 w-4" /> Add Guarantor
              </button>
            )}
          </div>

          {guarantors.length > 0 && (
            <div className="space-y-2 mb-4">
              {guarantors.map((g, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                    onClick={() => setExpandedGuarantorIdx(expandedGuarantorIdx === idx ? null : idx)}>
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
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeGuarantor(idx); }}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                      {expandedGuarantorIdx === idx ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                  {expandedGuarantorIdx === idx && (
                    <div className="border-t border-gray-200 px-4 py-4 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input label="First Name" value={g.first_name} onChange={(e) => updateGuarantor(idx, 'first_name', e.target.value)} required />
                        <Input label="Last Name" value={g.last_name} onChange={(e) => updateGuarantor(idx, 'last_name', e.target.value)} required />
                        <Input label="ID Number" value={g.id_number} onChange={(e) => updateGuarantor(idx, 'id_number', e.target.value)} required />
                        <Select label="ID Type" value={g.id_type} onChange={(e) => updateGuarantor(idx, 'id_type', e.target.value)} options={ID_TYPE_OPTIONS} />
                        <Input label="Phone" value={g.phone} onChange={(e) => updateGuarantor(idx, 'phone', e.target.value)} required />
                        <Input label="Email" type="email" value={g.email} onChange={(e) => updateGuarantor(idx, 'email', e.target.value)} />
                        <Input label="Address" value={g.address} onChange={(e) => updateGuarantor(idx, 'address', e.target.value)} />
                        <Input label="Relationship" value={g.relationship} onChange={(e) => updateGuarantor(idx, 'relationship', e.target.value)} required />
                        <Select label="Employment Status" value={g.employment_status} onChange={(e) => updateGuarantor(idx, 'employment_status', e.target.value)} options={EMPLOYMENT_OPTIONS} />
                        <Input label="Employer" value={g.employer} onChange={(e) => updateGuarantor(idx, 'employer', e.target.value)} />
                        <Input label="Monthly Income (USD)" type="number" value={String(g.monthly_income)} onChange={(e) => updateGuarantor(idx, 'monthly_income', Number(e.target.value))} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {addingGuarantor && (
            <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">New Guarantor</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="First Name" value={draftGuarantor.first_name} onChange={(e) => setDraftGuarantor(p => ({ ...p, first_name: e.target.value }))} required />
                <Input label="Last Name" value={draftGuarantor.last_name} onChange={(e) => setDraftGuarantor(p => ({ ...p, last_name: e.target.value }))} required />
                <Input label="ID Number" value={draftGuarantor.id_number} onChange={(e) => setDraftGuarantor(p => ({ ...p, id_number: e.target.value }))} required />
                <Select label="ID Type" value={draftGuarantor.id_type} onChange={(e) => setDraftGuarantor(p => ({ ...p, id_type: e.target.value as 'national_id' | 'passport' }))} options={ID_TYPE_OPTIONS} />
                <Input label="Phone" value={draftGuarantor.phone} onChange={(e) => setDraftGuarantor(p => ({ ...p, phone: e.target.value }))} required placeholder="+263..." />
                <Input label="Email" type="email" value={draftGuarantor.email} onChange={(e) => setDraftGuarantor(p => ({ ...p, email: e.target.value }))} />
                <Input label="Address" value={draftGuarantor.address} onChange={(e) => setDraftGuarantor(p => ({ ...p, address: e.target.value }))} />
                <Input label="Relationship to Client" value={draftGuarantor.relationship} onChange={(e) => setDraftGuarantor(p => ({ ...p, relationship: e.target.value }))} required placeholder="e.g. Spouse, Sibling..." />
                <Select label="Employment Status" value={draftGuarantor.employment_status} onChange={(e) => setDraftGuarantor(p => ({ ...p, employment_status: e.target.value as GuarantorDraft['employment_status'] }))} options={EMPLOYMENT_OPTIONS} />
                <Input label="Employer" value={draftGuarantor.employer} onChange={(e) => setDraftGuarantor(p => ({ ...p, employer: e.target.value }))} />
                <Input label="Monthly Income (USD)" type="number" value={String(draftGuarantor.monthly_income)} onChange={(e) => setDraftGuarantor(p => ({ ...p, monthly_income: Number(e.target.value) }))} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => { setAddingGuarantor(false); setDraftGuarantor({ ...EMPTY_GUARANTOR }); }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={commitGuarantor}
                  disabled={!draftGuarantor.first_name.trim() || !draftGuarantor.last_name.trim() || !draftGuarantor.id_number.trim() || !draftGuarantor.phone.trim() || !draftGuarantor.relationship.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <Plus className="h-3.5 w-3.5" /> Add Guarantor
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
