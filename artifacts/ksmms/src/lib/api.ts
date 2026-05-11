import { supabase } from './supabase';
import type {
  Client, Guarantor, Loan, Repayment, RepaymentSchedule,
  AccountingEntry, Document, AuditLog, UserProfile, Role,
} from './types';

// Helper to get current user ID
async function getCurrentUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

// ─── Dashboard ───────────────────────────────────────────────

export async function getDashboardStats() {
  const [clientsRes, loansRes, repaymentsRes, accountingRes] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase.from('loans').select('id, status, principal, outstanding_balance, total_paid'),
    supabase.from('repayments').select('amount'),
    supabase.from('accounting_entries').select('transaction_type, amount'),
  ]);

  const loans = loansRes.data ?? [];
  const activeLoans = loans.filter(l => l.status === 'active');
  const overdueLoans = loans.filter(l => l.status === 'overdue');
  const pendingLoans = loans.filter(l => l.status === 'pending');

  const totalDisbursed = activeLoans.reduce((s, l) => s + Number(l.principal), 0);
  const outstandingBalance = activeLoans.reduce((s, l) => s + Number(l.outstanding_balance), 0);
  const totalCollected = activeLoans.reduce((s, l) => s + Number(l.total_paid), 0);

  const entries = accountingRes.data ?? [];
  const interestEarned = entries
    .filter(e => e.transaction_type === 'interest_earned')
    .reduce((s, e) => s + Number(e.amount), 0);

  const recentLoansRes = await supabase
    .from('loans')
    .select('id, loan_number, principal, status, created_at, clients(first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(5);

  const recentRepaymentsRes = await supabase
    .from('repayments')
    .select('id, receipt_number, amount, payment_date, loans(loan_number)')
    .order('created_at', { ascending: false })
    .limit(5);

  const pendingDocsRes = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('verified', false);

  return {
    totalClients: clientsRes.count ?? 0,
    activeLoans: activeLoans.length,
    totalDisbursed,
    totalCollected,
    outstandingBalance,
    overdueLoans: overdueLoans.length,
    pendingLoans: pendingLoans.length,
    interestEarned,
    pendingDocuments: pendingDocsRes.count ?? 0,
    recentLoans: recentLoansRes.data ?? [],
    recentRepayments: recentRepaymentsRes.data ?? [],
  };
}

// ─── Clients ─────────────────────────────────────────────────

export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*, assigned_officer:user_profiles!assigned_officer_id(id, email, full_name, role_id, is_active, phone, avatar_url, roles(name))')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapClient);
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*, assigned_officer:user_profiles!assigned_officer_id(id, email, full_name, role_id, is_active, phone, avatar_url, roles(name))')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapClient(data) : null;
}

function mapClient(c: Record<string, unknown>): Client {
  return { ...c } as unknown as Client;
}

export async function createClient(client: Partial<Client>): Promise<Client> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...client, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Client;
}

export async function updateClientKyc(id: string, kyc_verified: boolean): Promise<void> {
  const { error } = await supabase
    .from('clients')
    .update({ kyc_verified, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ─── Guarantors ──────────────────────────────────────────────

export async function getGuarantors(clientId: string): Promise<Guarantor[]> {
  const { data, error } = await supabase
    .from('guarantors')
    .select('*')
    .eq('client_id', clientId);
  if (error) throw error;
  return (data ?? []) as Guarantor[];
}

export async function addGuarantor(clientId: string, guarantor: Partial<Guarantor>): Promise<Guarantor> {
  const { data, error } = await supabase
    .from('guarantors')
    .insert({ ...guarantor, client_id: clientId })
    .select()
    .single();
  if (error) throw error;
  return data as Guarantor;
}

export async function updateGuarantorKyc(clientId: string, guarantorId: string, kyc_verified: boolean): Promise<void> {
  const { error } = await supabase
    .from('guarantors')
    .update({ kyc_verified, updated_at: new Date().toISOString() })
    .eq('id', guarantorId)
    .eq('client_id', clientId);
  if (error) throw error;
}

// ─── Loans ────────────────────────────────────────────────────

export async function getLoans(status?: string): Promise<Loan[]> {
  let query = supabase
    .from('loans')
    .select('*, clients(first_name, last_name, client_number), creator:user_profiles!created_by(id, email, full_name, roles(name))')
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Loan[];
}

export async function getActiveLoans(): Promise<Loan[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*, clients(first_name, last_name, client_number)')
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Loan[];
}

export async function getLoan(id: string): Promise<Loan | null> {
  const { data, error } = await supabase
    .from('loans')
    .select('*, clients(first_name, last_name, client_number, phone, email), creator:user_profiles!created_by(id, email, full_name, roles(name)), approver:user_profiles!approved_by(id, email, full_name), disburser:user_profiles!disbursed_by(id, email, full_name)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Loan | null;
}

export async function createLoan(loan: Partial<Loan>): Promise<Loan> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('loans')
    .insert({ ...loan, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Loan;
}

export async function approveLoan(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('loans')
    .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function rejectLoan(id: string, rejection_reason: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('loans')
    .update({ status: 'rejected', rejected_by: userId, rejected_at: new Date().toISOString(), rejection_reason, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function disburseLoan(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const today = new Date().toISOString().split('T')[0];
  const { data: loan } = await supabase.from('loans').select('principal, term_months').eq('id', id).maybeSingle();
  const maturity = loan ? new Date(Date.now() + Number(loan.term_months) * 30 * 86400000).toISOString().split('T')[0] : today;
  const { error } = await supabase
    .from('loans')
    .update({
      status: 'active',
      disbursed_by: userId,
      disbursed_at: new Date().toISOString(),
      start_date: today,
      maturity_date: maturity,
      outstanding_balance: loan?.principal ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function getClientLoans(clientId: string): Promise<Loan[]> {
  const { data, error } = await supabase
    .from('loans')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Loan[];
}

// ─── Repayment Schedules ─────────────────────────────────────

export async function getRepaymentSchedule(loanId: string): Promise<RepaymentSchedule[]> {
  const { data, error } = await supabase
    .from('repayment_schedules')
    .select('*')
    .eq('loan_id', loanId)
    .order('installment_number');
  if (error) throw error;
  return (data ?? []) as RepaymentSchedule[];
}

// ─── Repayments ──────────────────────────────────────────────

export async function getRepayments(): Promise<Repayment[]> {
  const { data, error } = await supabase
    .from('repayments')
    .select('*, loans(loan_number), receiver:user_profiles!received_by(id, email, full_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Repayment[];
}

export async function getLoanRepayments(loanId: string): Promise<Repayment[]> {
  const { data, error } = await supabase
    .from('repayments')
    .select('*')
    .eq('loan_id', loanId)
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Repayment[];
}

export async function createRepayment(repayment: Partial<Repayment>): Promise<Repayment> {
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('repayments')
    .insert({ ...repayment, received_by: userId })
    .select()
    .single();
  if (error) throw error;

  // Update loan outstanding balance
  if (repayment.loan_id) {
    const { data: loan } = await supabase.from('loans').select('outstanding_balance, total_paid').eq('id', repayment.loan_id).maybeSingle();
    if (loan) {
      await supabase
        .from('loans')
        .update({
          outstanding_balance: Math.max(0, Number(loan.outstanding_balance) - Number(repayment.amount)),
          total_paid: Number(loan.total_paid) + Number(repayment.amount),
          updated_at: new Date().toISOString(),
        })
        .eq('id', repayment.loan_id);
    }
  }

  return data as Repayment;
}

// ─── Accounting ──────────────────────────────────────────────

export async function getAccountingEntries(): Promise<AccountingEntry[]> {
  const { data, error } = await supabase
    .from('accounting_entries')
    .select('*, creator:user_profiles!created_by(id, email, full_name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AccountingEntry[];
}

export async function getAccountingStats() {
  const [entriesRes, activeLoansRes, overdueLoansRes] = await Promise.all([
    supabase.from('accounting_entries').select('transaction_type, amount'),
    supabase.from('loans').select('principal, outstanding_balance').in('status', ['active', 'overdue']),
    supabase.from('loans').select('outstanding_balance').eq('status', 'overdue'),
  ]);

  const entries = entriesRes.data ?? [];
  const activeLoans = activeLoansRes.data ?? [];
  const overdueLoans = overdueLoansRes.data ?? [];

  let totalDisbursed = 0;
  let totalCollected = 0;
  let interestEarned = 0;
  let penalties = 0;
  let writeOffs = 0;

  entries.forEach(e => {
    const amt = Number(e.amount);
    switch (e.transaction_type) {
      case 'disbursement': totalDisbursed += amt; break;
      case 'repayment': totalCollected += amt; break;
      case 'interest_earned': interestEarned += amt; break;
      case 'penalty': penalties += amt; break;
      case 'write_off': writeOffs += amt; break;
    }
  });

  const grossLoanPortfolio = activeLoans.reduce((s, l) => s + Number(l.outstanding_balance), 0);
  const principalOutstanding = grossLoanPortfolio;
  const portfolioAtRisk = overdueLoans.reduce((s, l) => s + Number(l.outstanding_balance), 0);
  const activeLoanCount = activeLoans.length;

  const totalCashIn = totalCollected;
  const totalCashOut = totalDisbursed;
  const netCashMovement = totalCashIn - totalCashOut;

  const interestIncome = interestEarned;
  const penaltyIncome = penalties;
  const totalRevenue = interestIncome + penaltyIncome;

  const loanLossProvisions = portfolioAtRisk * 0.5;
  const totalLosses = writeOffs + loanLossProvisions;

  const grossProfit = totalRevenue - totalLosses;

  return {
    portfolio: { totalDisbursed, grossLoanPortfolio, principalOutstanding, portfolioAtRisk, activeLoanCount },
    cashFlow: { totalCashIn, totalCashOut, netCashMovement },
    income: { interestIncome, penaltyIncome, totalRevenue },
    losses: { writeOffs, loanLossProvisions, totalLosses },
    profitability: { grossProfit },
  };
}

// ─── Documents ───────────────────────────────────────────────

export async function getDocuments(filters?: { entity_type?: string; entity_id?: string; verified?: boolean }): Promise<Document[]> {
  let query = supabase.from('documents').select('*').order('created_at', { ascending: false });
  if (filters?.entity_type) query = query.eq('entity_type', filters.entity_type);
  if (filters?.entity_id) query = query.eq('entity_id', filters.entity_id);
  if (filters?.verified !== undefined) query = query.eq('verified', filters.verified);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Document[];
}

export async function getEntityDocuments(entityType: string, entityId: string): Promise<Document[]> {
  return getDocuments({ entity_type: entityType, entity_id: entityId });
}

export async function verifyDocument(id: string): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('documents')
    .update({ verified: true, verified_by: userId, verified_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

// ─── Audit Logs ──────────────────────────────────────────────

export async function getAuditLogs(filters?: { module?: string; action?: string; from?: string; to?: string }): Promise<AuditLog[]> {
  let query = supabase
    .from('audit_logs')
    .select('*, user:user_profiles(id, email, full_name)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (filters?.module) query = query.eq('module', filters.module);
  if (filters?.action) query = query.eq('action', filters.action);
  if (filters?.from) query = query.gte('created_at', filters.from);
  if (filters?.to) query = query.lte('created_at', filters.to);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AuditLog[];
}

// ─── Users ───────────────────────────────────────────────────

export async function getUsers(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, roles(id, name, description)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserProfile[];
}

export async function getRoles(): Promise<Role[]> {
  const { data, error } = await supabase.from('roles').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as Role[];
}

export async function getOfficers(): Promise<UserProfile[]> {
  const { data: roleData } = await supabase.from('roles').select('id').eq('name', 'loan_officer').maybeSingle();
  if (!roleData) return [];
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*, roles(id, name, description)')
    .eq('role_id', roleData.id)
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []) as UserProfile[];
}

export async function createUser(userData: { full_name: string; email: string; password: string; role_id: string; phone: string; is_active: boolean }): Promise<UserProfile> {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
  });
  if (authError) throw authError;
  if (!authData.user) throw new Error('Failed to create user');

  const { data, error } = await supabase
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      email: userData.email,
      full_name: userData.full_name,
      role_id: userData.role_id,
      phone: userData.phone,
      is_active: userData.is_active,
    })
    .select('*, roles(id, name, description)')
    .single();
  if (error) throw error;
  return data as UserProfile;
}

export async function toggleUserActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.from('user_profiles').delete().eq('id', id);
  if (error) throw error;
}

export async function resetUserPassword(id: string, new_password: string): Promise<void> {
  const { error } = await supabase.auth.admin.updateUserById(id, { password: new_password });
  if (error) throw error;
}

export async function updateProfile(updates: { full_name?: string; phone?: string }): Promise<void> {
  const userId = await getCurrentUserId();
  const { error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: (await supabase.auth.getUser()).data.user?.email ?? '',
    password: current_password,
  });
  if (verifyError) throw new Error('Current password is incorrect');
  const { error } = await supabase.auth.updateUser({ password: new_password });
  if (error) throw error;
}

// ─── Reports ─────────────────────────────────────────────────

export async function getReportsSummary() {
  const [clientsRes, loansRes, repaymentsRes, overdueLoansRes, officersRes] = await Promise.all([
    supabase.from('clients').select('id, status, assigned_officer_id'),
    supabase.from('loans').select('id, status, principal, outstanding_balance, total_paid, created_by'),
    supabase.from('repayments').select('amount, payment_date'),
    supabase.from('loans').select('*, clients(first_name, last_name, client_number)').eq('status', 'overdue'),
    supabase.from('user_profiles').select('id, full_name, roles(name)'),
  ]);

  const clients = clientsRes.data ?? [];
  const loans = loansRes.data ?? [];
  const repayments = repaymentsRes.data ?? [];
  const overdueLoanData = overdueLoansRes.data ?? [];
  const officers = officersRes.data ?? [];

  const activeLoans = loans.filter(l => l.status === 'active');
  const totalDisbursed = activeLoans.reduce((s, l) => s + Number(l.principal), 0);
  const outstandingBalance = activeLoans.reduce((s, l) => s + Number(l.outstanding_balance), 0);
  const totalCollected = repayments.reduce((s, r) => s + Number(r.amount), 0);
  const interestEarned = activeLoans.reduce((s, l) => {
    const totalPayable = Number(l.principal) * (1 + (l as any).interest_rate / 100 * (l as any).term_months);
    const interestFraction = totalPayable > 0 ? (totalPayable - Number(l.principal)) / totalPayable : 0;
    return s + Number(l.total_paid) * interestFraction;
  }, 0);

  // Build officer lookup
  const officerNameMap = new Map<string, string>();
  officers.forEach(o => { officerNameMap.set(o.id, (o as any).full_name || o.id); });

  // Group by officer
  const officerMap = new Map<string, { name: string; totalClients: number; totalLoans: number; totalDisbursed: number; totalCollected: number }>();
  const activeClientIds = new Set(clients.filter(c => c.status === 'active').map(c => c.id));

  loans.forEach(l => {
    const officerId = l.created_by;
    if (!officerId) return;
    const existing = officerMap.get(officerId) ?? { name: officerNameMap.get(officerId) || officerId, totalClients: 0, totalLoans: 0, totalDisbursed: 0, totalCollected: 0 };
    existing.totalLoans++;
    existing.totalDisbursed += Number(l.principal);
    existing.totalCollected += Number(l.total_paid);
    officerMap.set(officerId, existing);
  });

  clients.forEach(c => {
    if (c.assigned_officer_id && activeClientIds.has(c.id)) {
      const existing = officerMap.get(c.assigned_officer_id) ?? { name: officerNameMap.get(c.assigned_officer_id) || c.assigned_officer_id, totalClients: 0, totalLoans: 0, totalDisbursed: 0, totalCollected: 0 };
      existing.totalClients++;
      officerMap.set(c.assigned_officer_id, existing);
    }
  });

  return {
    portfolio: { totalLoans: loans.length, activeLoans: activeLoans.length, totalDisbursed, totalCollected, outstandingBalance, interestEarned },
    overdueLoans: overdueLoanData as Loan[],
    officers: Array.from(officerMap.entries()).map(([_, data]) => data),
  };
}

export async function getOverdueInstallments() {
  const { data, error } = await supabase
    .from('repayment_schedules')
    .select('*, loans(loan_number, clients(first_name, last_name))')
    .eq('status', 'overdue')
    .order('due_date');
  if (error) throw error;
  return data ?? [];
}
