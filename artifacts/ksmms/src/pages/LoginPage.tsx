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
    addNotification('success', `Welcome, ${loggedInUser?.full_name ?? ''}!`);
    navigate(destination, { replace: true });
    setLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0C0E13 0%, #141B26 50%, #1A2736 100%)' }}>
        <div className="animate-spin h-10 w-10 border-[3px] border-white/20 border-t-white rounded-full" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0C0E13 0%, #141B26 40%, #1A2736 100%)' }}
    >
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] right-[-5%] h-80 w-80 rounded-full bg-brand-600/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] h-96 w-96 rounded-full bg-gold-400/10 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-brand-800/20 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo + Brand */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="KS Michael Finance"
            className="h-[188px] w-[188px] object-contain mx-auto mb-[-42px] drop-shadow-xl"
          />
          <h1 className="font-display text-[26px] font-extrabold text-white tracking-tight leading-tight">
            KS Michael Finance
          </h1>
          <p className="text-gold-400 font-display font-600 text-sm mt-1 tracking-wide">
            (Pvt) Ltd
          </p>
          <p className="text-white/35 text-[11px] font-medium mt-2 tracking-[0.15em] uppercase font-display">
            Microfinance Management System
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.06] backdrop-blur-xl rounded-3xl border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.4)] p-8">
          <h2 className="font-display text-[15px] font-bold text-white/90 mb-6 text-center tracking-tight">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[12px] font-semibold text-white/50 mb-1.5 font-display uppercase tracking-widest">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@ksmcapital.biz"
                className="block w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-white/25 transition-all duration-150 focus:outline-none focus:border-gold-400/60 focus:bg-white/[0.12] focus:ring-2 focus:ring-gold-400/20"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[12px] font-semibold text-white/50 mb-1.5 font-display uppercase tracking-widest">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="block w-full rounded-xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm text-white placeholder:text-white/25 transition-all duration-150 focus:outline-none focus:border-gold-400/60 focus:bg-white/[0.12] focus:ring-2 focus:ring-gold-400/20"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-display font-bold text-[14px] text-brand-950 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.99]"
                style={{ background: 'linear-gradient(135deg, #D3B270 0%, #BB9B62 50%, #A07E48 100%)', boxShadow: '0 4px 16px rgba(187,155,98,0.35)' }}
              >
                {loading && (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-white/30 text-[11px] font-medium">
            SSC Center, 1st Floor, Harare, Zimbabwe
          </p>
          <p className="text-white/30 text-[11px] font-medium">
            +263 242 254 905 &bull; info@ksmcapital.biz
          </p>
          <p className="text-white/15 text-[10px] mt-3 font-display tracking-wide">
            Internal staff system &mdash; Unauthorized access is prohibited
          </p>
        </div>
      </div>
    </div>
  );
}
