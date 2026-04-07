import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const NotificationPermissionBanner = () => {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      const dismissed = localStorage.getItem('notif_banner_dismissed');
      if (!dismissed) setShow(true);
    }
  }, [user]);

  const handleAllow = async () => {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      new Notification('🔔 Notifikasi Aktif!', {
        body: 'Kamu akan menerima update terbaru dari T48ID.',
        icon: '/placeholder.svg',
      });
    }
    setShow(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('notif_banner_dismissed', '1');
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md"
        >
          <div className="rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-xl shadow-2xl p-4">
            <button onClick={handleDismiss} className="absolute top-2 right-2 p-1 rounded-full hover:bg-secondary">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/10 shrink-0">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-sm mb-1">Aktifkan Notifikasi 🔔</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Dapatkan info terbaru tentang produk baru, pengumuman & promo langsung di perangkatmu!
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleAllow}
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition"
                  >
                    Izinkan
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-medium hover:opacity-90 transition"
                  >
                    Nanti
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NotificationPermissionBanner;
