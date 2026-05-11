import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
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
  session: unknown;
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

  const fetchProfile = useCallback(async (userId?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = userId || session?.user?.id;
    if (!uid) { setUser(null); return; }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role_id, is_active, phone, avatar_url, roles(name)')
      .eq('id', uid)
      .maybeSingle();

    if (profile) {
      const roleName = (profile.roles as unknown as { name: string })?.name ?? '';
      setUser({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role_id: profile.role_id,
        role_name: roleName,
        is_active: profile.is_active,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
      });
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchProfile().finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null; user: AuthUser | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, user: null };

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await fetchProfile(session.user.id);
    }
    return { error: null, user: user };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshProfile = async () => { await fetchProfile(); };

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
