export type RoleName = 'admin' | 'manager' | 'loan_officer' | 'cashier' | 'accountant';

export interface Role {
  id: string;
  name: RoleName;
  description: string;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  is_active: boolean;
  phone: string;
  created_at: string;
  updated_at: string;
  role?: Role;
}

export interface LoginSession {
  id: string;
  user_id: string;
  ip_address: string;
  device_info: string;
  login_at: string;
  logout_at: string | null;
}

export interface Client {
  id: string;
  client_number: string;
  first_name: string;
  last_name: string;
  id_number: string;
  id_type: 'national_id' | 'passport';
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other';
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  employment_status: 'employed' | 'self_employed' | 'unemployed' | 'retired';
  employer: string;
  monthly_income: number;
  client_type: 'individual' | 'business';
  business_name: string;
  business_reg_number: string;
  kyc_verified: boolean;
  assigned_officer_id: string | null;
  status: 'active' | 'inactive' | 'blacklisted';
  created_by: string | null;
  created_at: string;
  updated_at: string;
  assigned_officer?: UserProfile;
}

export interface Guarantor {
  id: string;
  client_id: string;
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
  kyc_verified: boolean;
  created_at: string;
  updated_at: string;
}

export type LoanStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'overdue' | 'closed' | 'defaulted';

export type LoanProductType =
  | 'salary_based'
  | 'business_sme'
  | 'agricultural'
  | 'life_events'
  | 'product_based'
  | 'micro_housing'
  | 'specialized'
  | '';

export interface Loan {
  id: string;
  loan_number: string;
  client_id: string;
  principal: number;
  interest_rate: number;
  term_months: number;
  repayment_frequency: 'monthly' | 'biweekly' | 'weekly';
  total_payable: number;
  installment_amount: number;
  loan_product_type: LoanProductType;
  purpose: string;
  status: LoanStatus;
  created_by: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string;
  disbursed_by: string | null;
  disbursed_at: string | null;
  outstanding_balance: number;
  total_paid: number;
  start_date: string | null;
  maturity_date: string | null;
  created_at: string;
  updated_at: string;
  client?: Client;
  creator?: UserProfile;
  approver?: UserProfile;
  disburser?: UserProfile;
}

export interface RepaymentSchedule {
  id: string;
  loan_id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  principal_portion: number;
  interest_portion: number;
  amount_paid: number;
  paid_date: string | null;
  status: 'pending' | 'paid' | 'partial' | 'overdue';
  created_at: string;
}

export interface Repayment {
  id: string;
  loan_id: string;
  receipt_number: string;
  amount: number;
  principal_amount: number;
  interest_amount: number;
  payment_date: string;
  payment_method: 'cash' | 'mobile_money' | 'bank_transfer';
  received_by: string;
  notes: string;
  created_at: string;
  receiver?: UserProfile;
  loan?: Loan;
}

export interface AccountingEntry {
  id: string;
  transaction_type: 'disbursement' | 'repayment' | 'interest_earned' | 'penalty' | 'write_off';
  reference_id: string | null;
  reference_type: '' | 'loan' | 'repayment';
  amount: number;
  description: string;
  created_by: string;
  created_at: string;
  creator?: UserProfile;
}

export interface Document {
  id: string;
  entity_type: 'client_kyc' | 'guarantor_kyc' | 'loan' | 'collateral';
  entity_id: string;
  document_type: 'national_id' | 'passport' | 'proof_of_residence' | 'proof_of_employment' | 'payslip' | 'bank_statement' | 'guarantor_document' | 'collateral_insurance' | 'disbursement_form' | 'other';
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_role: string;
  action: string;
  module: string;
  entity_id: string | null;
  entity_type: string;
  details: Record<string, unknown>;
  ip_address: string;
  device_info: string;
  created_at: string;
  user?: UserProfile;
}
