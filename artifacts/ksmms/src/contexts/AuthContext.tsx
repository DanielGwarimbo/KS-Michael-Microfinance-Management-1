import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api } from '../lib/api';
import type { UserProfile, RoleName } from '../lib/types';

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role_id: string;
  role_name: string;
  is_active: boolean;
  phone: string;
  avatar_url: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  session: null;
  loading: boolean;
  roleName: RoleName | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null; user: AuthUser | null }>;
  signOut: () => Promise<void>;
  hasRole: (roles: RoleName[]) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toProfile(u: AuthUser): UserProfile {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role_id: u.role_id,
    is_active: u.is_active,
    phone: u.phone,
    avatar_url: u.avatar_url,
    role: { id: u.role_id, name: u.role_name, description: '', created_at: '' },
    created_at: '',
    updated_at: '',
  } as unknown as UserProfile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const { data } = await api.get<{ user: AuthUser }>('/auth/me');
    setUser(data?.user ?? null);
  }, []);

  useEffect(() => {
    fetchMe().finally(() => setLoading(false));
  }, [fetchMe]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null; user: AuthUser | null }> => {
    const { data, error } = await api.post<{ user: AuthUser }>('/auth/login', { email, password });
    if (error) return { error, user: null };
    if (data?.user) setUser(data.user);
    return { error: null, user: data?.user ?? null };
  };

  const signOut = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  const refreshProfile = async () => { await fetchMe(); };

  const profile = user ? toProfile(user) : null;
  const roleName = (user?.role_name as RoleName) ?? null;
  const hasRole = (roles: RoleName[]) => !!roleName && roles.includes(roleName);

  return (
    <AuthContext.Provider value={{ user, profile, session: null, loading, roleName, signIn, signOut, hasRole, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
