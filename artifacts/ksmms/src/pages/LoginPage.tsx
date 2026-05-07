import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import Button from '../components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { addNotification } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      addNotification('error', error);
      setLoading(false);
      return;
    }

    addNotification('success', 'Welcome back!');
    navigate('/dashboard');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-600 rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-bold text-3xl">KS</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">KS Michael Finance</h1>
          <p className="text-sm text-teal-700 font-medium mt-1">(Pvt) Ltd</p>
          <p className="text-xs text-gray-500 mt-2">Microfinance Management System</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Sign in to your account</h2>

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
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-0"
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
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:ring-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-0"
                placeholder="Enter your password"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Sign In
            </Button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-1">
          <p className="text-xs text-gray-400">
            SSC Center, 1st Floor, Harare, Zimbabwe
          </p>
          <p className="text-xs text-gray-400">
            +263 242 254 905 &bull; info@ksmcapital.biz
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Internal staff system. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}
