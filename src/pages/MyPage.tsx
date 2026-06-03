import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Heart, Trash2, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Tables } from '@/integrations/supabase/types';
import { jkt48Members } from '@/data/members';
import OshiPicker from '@/components/OshiPicker';

const MyPage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [oshiOpen, setOshiOpen] = useState(false);
  const [oshiId, setOshiId] = useState<number | null>(null);

  const { data: purchases, loading } = useRealtimeTable<Tables<'purchases'>>(
    'purchases',
    user ? { column: 'user_id', value: user.id, order: { column: 'created_at', ascending: false } } : undefined,
    !!user
  );

  const { data: purchaseItems } = useRealtimeTable<Tables<'purchase_items'>>('purchase_items', undefined, !!user);

  useEffect(() => {
    setOshiId((profile as any)?.oshi_member_id ?? null);
  }, [profile]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [authLoading, user, navigate]);

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
  if (!user) return null;

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

  const handleSelectOshi = async (memberId: number) => {
    setOshiId(memberId);
    const { error } = await supabase.from('profiles').update({ oshi_member_id: memberId } as any).eq('user_id', user.id);
    if (error) toast.error('Gagal menyimpan oshi');
    else toast.success('Oshi disimpan! 💖');
  };

  const handleClearOshi = async () => {
    setOshiId(null);
    await supabase.from('profiles').update({ oshi_member_id: null } as any).eq('user_id', user.id);
    toast.success('Oshi dihapus');
  };

  const oshi = oshiId ? jkt48Members.find(m => m.id === oshiId) : null;

  const displayName = profile?.username || user.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user.email || '';
  const displayPhone = profile?.phone || '';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
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
              </div>
            </div>
          </div>

          {/* Oshi card */}
          <div className="glass-card rounded-2xl p-5 mb-6 border-l-4 border-primary">
            <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary fill-primary" /> Oshi-ku
            </h2>
            {oshi ? (
              <div className="flex items-center gap-4">
                <img
                  src={oshi.photo}
                  alt={oshi.nickname}
                  loading="lazy"
                  decoding="async"
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-primary shadow-lg"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-extrabold text-foreground">{oshi.nickname}</h3>
                  <p className="text-sm text-muted-foreground truncate">{oshi.name}</p>
                  <p className="text-xs text-muted-foreground">Gen {oshi.generation} · {oshi.fanbase}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => setOshiOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition">
                      Ganti
                    </button>
                    <button onClick={handleClearOshi}
                      className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-bold hover:bg-destructive/20 transition flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-sm text-muted-foreground mb-3">Belum pilih oshi. Pilih member JKT48 favoritmu!</p>
                <button onClick={() => setOshiOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl gradient-primary text-primary-foreground font-bold text-sm">
                  <Heart className="w-4 h-4" /> Pilih Oshi
                </button>
              </div>
            )}
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
              {purchases.map((p) => {
                const items = purchaseItems.filter(pi => pi.purchase_id === p.id);
                return (
                  <div key={p.id} className="glass-card rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${p.status === 'completed' ? 'bg-success/20 text-success' : p.status === 'confirmed' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'}`}>
                            {p.status === 'pending' ? 'Menunggu' : p.status === 'confirmed' ? 'Dikonfirmasi' : 'Selesai'}
                          </span>
                          <span className="text-xs text-muted-foreground">via WA</span>
                        </div>
                      </div>
                      <span className="font-bold text-gradient">{formatPrice(p.total)}</span>
                    </div>
                    <div className="space-y-1">
                      {items.map(item => (
                        <p key={item.id} className="text-sm text-foreground">{item.product_name} x{item.quantity}</p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>

      <OshiPicker open={oshiOpen} onClose={() => setOshiOpen(false)} onSelect={handleSelectOshi} currentId={oshiId} />
    </div>
  );
};

export default MyPage;
