import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { RoleName } from '../../lib/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: RoleName[];
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, profile, loading, roleName } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (!profile.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Account Deactivated</h2>
          <p className="mt-2 text-gray-600">Your account has been deactivated. Contact your administrator.</p>
        </div>
      </div>
    );
  }

  if (roles && roleName && !roles.includes(roleName)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-600">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
