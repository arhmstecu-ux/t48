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

  const [userLevel, setUserLevel] = useState<{ level: number; total_topup_coins: number } | null>(null);
  const [levelRewards, setLevelRewards] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from('user_levels' as any).select('*').eq('user_id', user.id).single();
      if (data) setUserLevel(data as any);
    };
    load();
    const ch = supabase.channel('my-level-rt').on('postgres_changes' as any, { event: '*', schema: 'public', table: 'user_levels' }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  useEffect(() => {
    const load = async () => { const { data } = await supabase.from('level_rewards' as any).select('*').order('level'); if (data) setLevelRewards(data as any[]); };
    load();
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  // Show loading only while auth is loading, not while waiting for profile
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
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

  const displayName = profile?.username || user.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user.email || '';
  const displayPhone = profile?.phone || '';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="glass-card rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                {profile?.profile_photo ? (
                  <img src={profile.profile_photo} alt="Profile" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
                ) : (
                  <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                    {displayName[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:opacity-80 transition">
                  <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-extrabold text-foreground">{displayName}</h1>
                {profile?.profile_code && (
                  <div className="inline-flex items-center gap-1.5 mt-0.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                    <span className="text-xs font-mono font-bold text-primary">#{profile.profile_code}</span>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{displayEmail}</p>
                {displayPhone && <p className="text-sm text-muted-foreground">{displayPhone}</p>}
                {userLevel && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Star className="w-4 h-4 text-warning" />
                    <span className="text-sm font-bold text-warning">Level {userLevel.level}</span>
                    <span className="text-xs text-muted-foreground">({userLevel.total_topup_coins} koin total topup)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Level Progress */}
          {userLevel && userLevel.level < 20 && (
            <div className="glass-card rounded-2xl p-5 mb-6">
              <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2"><Star className="w-5 h-5 text-warning" /> Progress Level</h2>
              <div className="text-sm text-muted-foreground mb-2">
                {(() => {
                  const lv = userLevel.level;
                  const coinsNeeded = lv < 3 ? 4 : lv < 8 ? 8 : 13;
                  return `Topup ${coinsNeeded} koin lagi untuk naik ke Level ${lv + 1}`;
                })()}
              </div>
              {(() => {
                const reward = levelRewards.find((r: any) => r.level === userLevel.level);
                return reward?.reward_name ? (
                  <div className="bg-warning/10 rounded-lg p-3 mt-2">
                    <p className="text-xs font-bold text-warning">🎁 Hadiah Level {userLevel.level}: {reward.reward_name}</p>
                    {reward.reward_description && <p className="text-xs text-muted-foreground mt-0.5">{reward.reward_description}</p>}
                  </div>
                ) : null;
              })()}
            </div>
          )}

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
