import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Star } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Tables } from '@/integrations/supabase/types';

const MyPage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: purchases, loading } = useRealtimeTable<Tables<'purchases'>>(
    'purchases',
    user ? { column: 'user_id', value: user.id, order: { column: 'created_at', ascending: false } } : undefined,
    !!user
  );

  const { data: purchaseItems } = useRealtimeTable<Tables<'purchase_items'>>('purchase_items', undefined, !!user);

  useEffect(() => {
    if (!authLoading && (!user || !profile)) {
      navigate('/login');
    }
  }, [authLoading, user, profile, navigate]);

  if (authLoading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Maksimal 2MB!'); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const { error } = await supabase.from('profiles').update({ profile_photo: base64 }).eq('user_id', user.id);
      if (error) toast.error('Gagal mengubah foto');
      else toast.success('Foto profil diubah!');
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-card rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                {profile.profile_photo ? (
                  <img src={profile.profile_photo} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                ) : (
                  <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                    {profile.username[0].toUpperCase()}
                  </div>
                )}
                <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:opacity-80 transition">
                  <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-extrabold text-foreground">{profile.username}</h1>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <p className="text-sm text-muted-foreground">{profile.phone}</p>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-foreground mb-4">Riwayat Pembelian</h2>
          {loading ? (
            <p className="text-muted-foreground">Memuat...</p>
          ) : purchases.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-5xl block mb-3">📦</span>
              <p className="text-muted-foreground">Belum ada pembelian</p>
            </div>
          ) : (
            <div className="space-y-4">
              {purchases.map((p, i) => {
                const items = purchaseItems.filter(pi => pi.purchase_id === p.id);
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="glass-card rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${p.status === 'completed' ? 'bg-success/20 text-success' : p.status === 'confirmed' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'}`}>
                            {p.status === 'pending' ? 'Menunggu' : p.status === 'confirmed' ? 'Dikonfirmasi' : 'Selesai'}
                          </span>
                          <span className="text-xs text-muted-foreground">via {p.payment_method.toUpperCase()}</span>
                        </div>
                      </div>
                      <span className="font-bold text-gradient">{formatPrice(p.total)}</span>
                    </div>
                    <div className="space-y-1">
                      {items.map(item => (
                        <p key={item.id} className="text-sm text-foreground">{item.product_name} x{item.quantity}</p>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default MyPage;
