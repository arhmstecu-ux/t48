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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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

const isNetworkLikeError = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return ["failed to fetch", "networkerror", "load failed", "network request failed", "backend tidak merespons"].some((part) =>
    message.includes(part)
  );
};

const getFriendlyAuthError = (error: unknown, fallback: string) => {
  if (isNetworkLikeError(error)) {
    return 'Backend sedang bermasalah, jadi login belum bisa diproses. Coba lagi beberapa saat.';
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const pingBackend = async () => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 3500);

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error('Backend tidak merespons normal');
    }
  } catch (error) {
    throw new Error(
      error instanceof DOMException && error.name === 'AbortError'
        ? 'Backend tidak merespons'
        : error instanceof Error
          ? error.message
          : 'Backend tidak merespons'
    );
  } finally {
    window.clearTimeout(timer);
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAuthRoute = typeof window !== 'undefined' && ['/login', '/register', '/reset-password', '/admin-login'].includes(window.location.pathname);

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
      if (session?.user && !isAuthRoute) {
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
      if (session?.user && !isAuthRoute) {
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
  }, [isAuthRoute]);

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
      await pingBackend();

      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        8000,
        'Login terlalu lama. Coba lagi beberapa saat.'
      );

      if (error) return { error: error.message };
      return {};
    } catch (error) {
      return {
        error: getFriendlyAuthError(error, 'Login gagal. Coba lagi.'),
      };
    }
  };

  const register = async (data: { email: string; password: string; username: string; phone: string }): Promise<{ error?: string }> => {
    try {
      await pingBackend();

      const { error } = await withTimeout(
        supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: { username: data.username, phone: data.phone },
            emailRedirectTo: window.location.origin,
          },
        }),
        8000,
        'Pendaftaran terlalu lama. Coba lagi beberapa saat.'
      );

      if (error) return { error: error.message };
      return {};
    } catch (error) {
      return {
        error: getFriendlyAuthError(error, 'Pendaftaran gagal. Coba lagi.'),
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
