import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { UserProfile, RoleName } from '../lib/types';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  roleName: RoleName | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  hasRole: (roles: RoleName[]) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const profileUserId = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    if (profileUserId.current === userId) return;
    profileUserId.current = userId;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*, role:roles(*)')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      profileUserId.current = null;
      return null;
    }
    return data as UserProfile | null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      profileUserId.current = null;
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          setSession(session);
          setUser(session.user);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          (async () => {
            const p = await fetchProfile(session.user.id);
            setProfile(p);
          })();
        } else if (event === 'SIGNED_OUT') {
          profileUserId.current = null;
          setProfile(null);
        }
      }
    );

    if (!initialized.current) {
      initialized.current = true;
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id).then((p) => {
            setProfile(p);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      });
    }

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    profileUserId.current = null;
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  const roleName = (profile?.role?.name as RoleName) ?? null;

  const hasRole = (roles: RoleName[]) => {
    if (!roleName) return false;
    return roles.includes(roleName);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, roleName, signIn, signOut, hasRole, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
