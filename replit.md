# KSMMS — KS Microfinance Management System

A full-stack microfinance management system for tracking clients, loans, repayments, accounting, and users with role-based access control.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/ksmms run dev` — run the frontend (port from `$PORT`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm dlx tsx artifacts/api-server/src/seed.ts` — seed roles + admin user
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 19 + Vite + React Router v7 + Tailwind CSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: Session cookies (httpOnly, `ksmms_session`), bcryptjs password hashing
- Build: esbuild (CJS bundle for API)

## Where things live

- `artifacts/ksmms/` — React+Vite frontend
- `artifacts/api-server/src/routes/` — Express API route handlers
- `artifacts/api-server/src/middleware/auth.ts` — session auth middleware
- `artifacts/api-server/src/seed.ts` — role + admin seeder
- `lib/db/src/schema/index.ts` — Drizzle ORM schema (source of truth)
- `artifacts/ksmms/src/lib/api.ts` — frontend API client (fetch wrapper)
- `artifacts/ksmms/src/contexts/AuthContext.tsx` — auth context (session-based)
- `artifacts/ksmms/src/lib/utils.ts` — formatCurrency, calculateLoan, constants

## Architecture decisions

- No Supabase — all data is in Replit's PostgreSQL via Drizzle ORM
- Session-based cookie auth (not JWT); sessions stored in `sessions` table; cookie name `ksmms_session`; 7-day expiry
- bcryptjs (pure JS) used instead of bcrypt to avoid native module issues in Replit sandbox
- Vite dev server proxies `/api/*` → `localhost:8080` (API server)
- All API routes require `requireAuth` middleware except `POST /api/auth/login` and `POST /api/auth/logout`
- Role-based access: admin, manager, loan_officer, cashier, accountant

## Product

- **Clients**: Register individuals and businesses with KYC verification, guarantors, and documents
- **Loans**: Full lifecycle — application → approval → disbursement → repayments → closure
- **Repayments**: Record payments, auto-update outstanding balance, generate receipts
- **Accounting**: Track disbursements, repayments, interest earned, write-offs
- **Reports**: Portfolio summary, overdue loans, officer performance (CSV export)
- **Users**: Create/activate/deactivate system users with role assignment
- **Audit Log**: Full activity trail with module/date filtering
- **Documents**: Upload and verify KYC/loan documents

## Default credentials (seed)

- Email: `admin@ksmms.co.zw`
- Password: `admin123`
- Role: Administrator (full access)

## Gotchas

- Run `pnpm dlx tsx artifacts/api-server/src/seed.ts` on a fresh DB before first login
- API server must be running on port 8080 for the Vite proxy to work
- `pnpm --filter @workspace/db run push` must be run after any schema changes
- Never use native `bcrypt` — only `bcryptjs` works in Replit's sandbox

## User preferences

- Session cookie auth, no Supabase, no JWT
- Zimbabwe locale (USD currency, en-ZW formatting)
