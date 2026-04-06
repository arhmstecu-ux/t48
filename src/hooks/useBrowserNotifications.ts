import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useBrowserNotifications() {
  const { user } = useAuth();
  const permissionGranted = useRef(false);

  // Request notification permission on mount
  useEffect(() => {
    if (!user) return;
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      permissionGranted.current = true;
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        permissionGranted.current = perm === 'granted';
      });
    }
  }, [user]);

  // Listen for new notifications in realtime
  useEffect(() => {
    if (!user) return;

    const ch = supabase
      .channel('browser-notif-rt')
      .on('postgres_changes' as any, {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload: any) => {
        const n = payload.new;
        if (!n || !permissionGranted.current) return;
        if (document.visibilityState === 'visible') return; // Don't show if tab is active

        try {
          const icon = n.type === 'announcement' ? '📢' : n.type === 'product' ? '🛍️' : 'ℹ️';
          new Notification(`${icon} ${n.title}`, {
            body: n.message || '',
            icon: '/placeholder.svg',
            tag: n.id,
          });
        } catch {}
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user]);
}
