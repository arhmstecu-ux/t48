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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const [{ data: profileData }, { data: roles }] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);
    setProfile(profileData ?? null);
    setIsOwner(roles?.some(r => r.role === 'admin') || false);
  };

  useEffect(() => {
    let mounted = true;

    // Restore session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => mounted && setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for subsequent auth changes (non-blocking)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setIsOwner(false);
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
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
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return {};
  };

  const register = async (data: { email: string; password: string; username: string; phone: string }): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { username: data.username, phone: data.phone },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { error: error.message };
    return {};
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
