import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface AuthContextType {
  user: SupabaseUser | null;
  profile: Profile | null;
  session: Session | null;
  isOwner: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (data: { email: string; password: string; username: string; phone: string }) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> => {
  return await new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const [{ data: profileData }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);
      setProfile(profileData ?? null);
      setIsOwner(roles?.some(r => r.role === 'admin') || false);
    } catch (e) {
      console.warn('[auth] profile fetch failed', e);
    }
  };

  useEffect(() => {
    let mounted = true;
    // Fail-safe: never keep the app in "loading" forever
    const failSafe = setTimeout(() => { if (mounted) setLoading(false); }, 2500);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    }).catch((e) => {
      console.warn('[auth] getSession failed', e);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        window.setTimeout(() => {
          if (!mounted) return;
          void fetchProfile(session.user!.id);
        }, 0);
      } else {
        setProfile(null);
        setIsOwner(false);
      }
    });

    return () => { mounted = false; clearTimeout(failSafe); subscription.unsubscribe(); };
  }, []);

  // Realtime profile updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('profile-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` }, (payload) => {
        setProfile(payload.new as Profile);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const login = async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        12000,
        'Login terlalu lama. Coba lagi sebentar atau refresh halaman.'
      );

      if (error) return { error: error.message };
      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Login gagal. Coba lagi.',
      };
    }
  };

  const register = async (data: { email: string; password: string; username: string; phone: string }): Promise<{ error?: string }> => {
    try {
      const { error } = await withTimeout(
        supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: { username: data.username, phone: data.phone },
            emailRedirectTo: window.location.origin,
          },
        }),
        12000,
        'Pendaftaran terlalu lama. Coba lagi sebentar.'
      );

      if (error) return { error: error.message };
      return {};
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Pendaftaran gagal. Coba lagi.',
      };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsOwner(false);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, isOwner, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
