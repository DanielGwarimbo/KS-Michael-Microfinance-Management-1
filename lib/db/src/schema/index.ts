import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  doublePrecision,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  password_hash: text("password_hash").notNull(),
  full_name: text("full_name").notNull(),
  role_id: uuid("role_id")
    .notNull()
    .references(() => roles.id),
  is_active: boolean("is_active").notNull().default(true),
  phone: text("phone").notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: uuid("user_id")
    .notNull()
    .references(() => userProfiles.id),
  expires_at: timestamp("expires_at").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  client_number: text("client_number").notNull().unique(),
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),
  id_number: text("id_number").notNull().default(""),
  id_type: text("id_type").notNull().default("national_id"),
  date_of_birth: text("date_of_birth"),
  gender: text("gender").notNull().default("male"),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  province: text("province").notNull().default(""),
  employment_status: text("employment_status").notNull().default("employed"),
  employer: text("employer").notNull().default(""),
  monthly_income: doublePrecision("monthly_income").notNull().default(0),
  client_type: text("client_type").notNull().default("individual"),
  business_name: text("business_name").notNull().default(""),
  business_reg_number: text("business_reg_number").notNull().default(""),
  kyc_verified: boolean("kyc_verified").notNull().default(false),
  assigned_officer_id: uuid("assigned_officer_id").references(
    () => userProfiles.id,
  ),
  status: text("status").notNull().default("active"),
  created_by: uuid("created_by").references(() => userProfiles.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const guarantors = pgTable("guarantors", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  client_id: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),
  id_number: text("id_number").notNull().default(""),
  id_type: text("id_type").notNull().default("national_id"),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  relationship: text("relationship").notNull().default(""),
  employment_status: text("employment_status").notNull().default("employed"),
  employer: text("employer").notNull().default(""),
  monthly_income: doublePrecision("monthly_income").notNull().default(0),
  kyc_verified: boolean("kyc_verified").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const loans = pgTable("loans", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  loan_number: text("loan_number").notNull().unique(),
  client_id: uuid("client_id")
    .notNull()
    .references(() => clients.id),
  principal: doublePrecision("principal").notNull(),
  interest_rate: doublePrecision("interest_rate").notNull(),
  term_months: integer("term_months").notNull(),
  repayment_frequency: text("repayment_frequency").notNull().default("monthly"),
  total_payable: doublePrecision("total_payable").notNull(),
  installment_amount: doublePrecision("installment_amount").notNull(),
  purpose: text("purpose").notNull().default(""),
  status: text("status").notNull().default("pending"),
  created_by: uuid("created_by")
    .notNull()
    .references(() => userProfiles.id),
  approved_by: uuid("approved_by").references(() => userProfiles.id),
  approved_at: timestamp("approved_at"),
  rejected_by: uuid("rejected_by").references(() => userProfiles.id),
  rejected_at: timestamp("rejected_at"),
  rejection_reason: text("rejection_reason").notNull().default(""),
  disbursed_by: uuid("disbursed_by").references(() => userProfiles.id),
  disbursed_at: timestamp("disbursed_at"),
  outstanding_balance: doublePrecision("outstanding_balance").notNull(),
  total_paid: doublePrecision("total_paid").notNull().default(0),
  start_date: text("start_date"),
  maturity_date: text("maturity_date"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const repaymentSchedules = pgTable("repayment_schedules", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  loan_id: uuid("loan_id")
    .notNull()
    .references(() => loans.id),
  installment_number: integer("installment_number").notNull(),
  due_date: text("due_date").notNull(),
  amount_due: doublePrecision("amount_due").notNull(),
  principal_portion: doublePrecision("principal_portion").notNull(),
  interest_portion: doublePrecision("interest_portion").notNull(),
  amount_paid: doublePrecision("amount_paid").notNull().default(0),
  paid_date: text("paid_date"),
  status: text("status").notNull().default("pending"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const repayments = pgTable("repayments", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  loan_id: uuid("loan_id")
    .notNull()
    .references(() => loans.id),
  receipt_number: text("receipt_number").notNull().unique(),
  amount: doublePrecision("amount").notNull(),
  principal_amount: doublePrecision("principal_amount").notNull(),
  interest_amount: doublePrecision("interest_amount").notNull(),
  payment_date: text("payment_date").notNull(),
  payment_method: text("payment_method").notNull().default("cash"),
  received_by: uuid("received_by")
    .notNull()
    .references(() => userProfiles.id),
  notes: text("notes").notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const accountingEntries = pgTable("accounting_entries", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  transaction_type: text("transaction_type").notNull(),
  reference_id: uuid("reference_id"),
  reference_type: text("reference_type").notNull().default(""),
  amount: doublePrecision("amount").notNull(),
  description: text("description").notNull().default(""),
  created_by: uuid("created_by")
    .notNull()
    .references(() => userProfiles.id),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  entity_type: text("entity_type").notNull(),
  entity_id: uuid("entity_id").notNull(),
  document_type: text("document_type").notNull(),
  file_name: text("file_name").notNull(),
  file_path: text("file_path").notNull().default(""),
  file_size: integer("file_size").notNull().default(0),
  mime_type: text("mime_type").notNull().default(""),
  uploaded_by: uuid("uploaded_by")
    .notNull()
    .references(() => userProfiles.id),
  verified: boolean("verified").notNull().default(false),
  verified_by: uuid("verified_by").references(() => userProfiles.id),
  verified_at: timestamp("verified_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: uuid("user_id")
    .notNull()
    .references(() => userProfiles.id),
  user_role: text("user_role").notNull(),
  action: text("action").notNull(),
  module: text("module").notNull(),
  entity_id: uuid("entity_id"),
  entity_type: text("entity_type").notNull().default(""),
  details: jsonb("details").notNull().default({}),
  ip_address: text("ip_address").notNull().default(""),
  device_info: text("device_info").notNull().default(""),
  created_at: timestamp("created_at").notNull().defaultNow(),
});
