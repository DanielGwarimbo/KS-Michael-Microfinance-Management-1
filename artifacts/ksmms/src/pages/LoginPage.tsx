import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import Button from '../components/ui/Button';
import type { RoleName } from '../lib/types';

const ROLE_HOME: Record<RoleName, string> = {
  admin:        '/dashboard',
  manager:      '/dashboard',
  loan_officer: '/dashboard',
  cashier:      '/dashboard',
  accountant:   '/dashboard',
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, user, loading: authLoading } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  // Redirect already-authenticated users away from login
  useEffect(() => {
    if (!authLoading && user) {
      const role = user.role_name as RoleName;
      navigate(ROLE_HOME[role] ?? '/dashboard', { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error, user: loggedInUser } = await signIn(email, password);

    if (error) {
      addNotification('error', error);
      setLoading(false);
      return;
    }

    const role = loggedInUser?.role_name as RoleName | undefined;
    const destination = role ? (ROLE_HOME[role] ?? '/dashboard') : '/dashboard';
    addNotification('success', `Welcome back, ${loggedInUser?.full_name ?? ''}!`);
    navigate(destination, { replace: true });
    setLoading(false);
  };

  // Don't render the form while checking existing session
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600">
        <div className="animate-spin h-10 w-10 border-4 border-white border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-800 to-brand-600 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="KS Michael Finance" className="w-60 h-60 object-contain mx-auto mb-5" />
          <h1 className="text-3xl font-bold text-white tracking-tight">KS Michael Finance</h1>
          <p className="text-gold-400 font-semibold text-sm mt-1">(Pvt) Ltd</p>
          <p className="text-brand-200 text-xs mt-2 tracking-wide uppercase">Microfinance Management System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-brand-800 mb-6 text-center">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-0"
                placeholder="you@ksmcapital.biz"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:ring-brand-500 focus:outline-none focus:ring-2 focus:ring-offset-0"
                placeholder="Enter your password"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign In
            </Button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-1">
          <p className="text-brand-200 text-xs">
            SSC Center, 1st Floor, Harare, Zimbabwe
          </p>
          <p className="text-brand-200 text-xs">
            +263 242 254 905 &bull; info@ksmcapital.biz
          </p>
          <p className="text-brand-300 text-xs mt-3 opacity-70">
            Internal staff system. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}
