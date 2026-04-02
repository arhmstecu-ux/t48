import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('notifications' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) setNotifications(data as unknown as Notification[]);
    };
    load();
    const ch = supabase
      .channel('notif-rt')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const markAllRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.is_read);
    for (const n of unread) {
      await supabase.from('notifications' as any).update({ is_read: true } as any).eq('id', n.id);
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'announcement': return '📢';
      case 'product': return '🛍️';
      default: return 'ℹ️';
    }
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-secondary hover:scale-110 transition-all duration-200 relative">
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto z-50 glass-card rounded-2xl border border-border shadow-xl"
            >
              <div className="p-3 border-b border-border flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur-sm rounded-t-2xl">
                <h3 className="font-bold text-foreground text-sm">Notifikasi</h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary font-medium hover:underline">
                    Tandai semua dibaca
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Belum ada notifikasi</p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {notifications.map(n => (
                    <div key={n.id} className={`p-3 text-sm ${!n.is_read ? 'bg-primary/5' : ''}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-base flex-shrink-0">{getIcon(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(n.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
