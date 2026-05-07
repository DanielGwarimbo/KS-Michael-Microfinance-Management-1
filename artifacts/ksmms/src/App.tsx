import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Notifications from './components/ui/Notifications';
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ClientListPage = lazy(() => import('./pages/clients/ClientListPage'));
const ClientDetailPage = lazy(() => import('./pages/clients/ClientDetailPage'));
const LoanListPage = lazy(() => import('./pages/loans/LoanListPage'));
const LoanCreatePage = lazy(() => import('./pages/loans/LoanCreatePage'));
const LoanDetailPage = lazy(() => import('./pages/loans/LoanDetailPage'));
const RepaymentListPage = lazy(() => import('./pages/repayments/RepaymentListPage'));
const RepaymentCreatePage = lazy(() => import('./pages/repayments/RepaymentCreatePage'));
const UserListPage = lazy(() => import('./pages/users/UserListPage'));
const AccountingPage = lazy(() => import('./pages/accounting/AccountingPage'));
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const AuditLogPage = lazy(() => import('./pages/audit/AuditLogPage'));
const DocumentsPage = lazy(() => import('./pages/documents/DocumentsPage'));
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Notifications />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/clients" element={<ProtectedRoute roles={['admin', 'manager', 'loan_officer']}><ClientListPage /></ProtectedRoute>} />
                <Route path="/clients/:id" element={<ProtectedRoute roles={['admin', 'manager', 'loan_officer']}><ClientDetailPage /></ProtectedRoute>} />
                <Route path="/loans" element={<ProtectedRoute roles={['admin', 'manager', 'loan_officer', 'cashier']}><LoanListPage /></ProtectedRoute>} />
                <Route path="/loans/new" element={<ProtectedRoute roles={['admin', 'manager', 'loan_officer']}><LoanCreatePage /></ProtectedRoute>} />
                <Route path="/loans/:id" element={<ProtectedRoute roles={['admin', 'manager', 'loan_officer', 'cashier']}><LoanDetailPage /></ProtectedRoute>} />
                <Route path="/repayments" element={<ProtectedRoute roles={['admin', 'manager', 'cashier', 'accountant']}><RepaymentListPage /></ProtectedRoute>} />
                <Route path="/repayments/new" element={<ProtectedRoute roles={['admin', 'cashier']}><RepaymentCreatePage /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute roles={['admin']}><UserListPage /></ProtectedRoute>} />
                <Route path="/accounting" element={<ProtectedRoute roles={['admin', 'manager', 'accountant']}><AccountingPage /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute roles={['admin', 'manager', 'accountant']}><ReportsPage /></ProtectedRoute>} />
                <Route path="/audit" element={<ProtectedRoute roles={['admin', 'manager']}><AuditLogPage /></ProtectedRoute>} />
                <Route path="/documents" element={<ProtectedRoute roles={['admin', 'manager', 'loan_officer']}><DocumentsPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
