import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Play, Lock, Eye, EyeOff, Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import { useAuth } from '@/contexts/AuthContext';
import type { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const REPLAY_COIN_PRICE = 2;

const getYoutubeEmbedUrl = (url: string): string => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : '';
};

const ReplayShow = () => {
  const { user } = useAuth();
  const { data: videos, loading } = useRealtimeTable<Tables<'replay_videos'>>('replay_videos', {
    order: { column: 'created_at', ascending: false }
  });
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [coinBalance, setCoinBalance] = useState(0);
  const [purchasedVideos, setPurchasedVideos] = useState<Set<string>>(new Set());
  const [buyingVideo, setBuyingVideo] = useState<string | null>(null);

  // Load coin balance and purchased replays
  useEffect(() => {
    if (!user) return;
    const loadBalance = async () => {
      const { data } = await supabase.from('coin_balances').select('balance').eq('user_id', user.id).maybeSingle();
      if (data) setCoinBalance(data.balance);
    };
    const loadPurchases = async () => {
      const { data } = await supabase.from('replay_purchases' as any).select('video_id').eq('user_id', user.id);
      if (data) setPurchasedVideos(new Set((data as any[]).map(d => d.video_id)));
    };
    loadBalance();
    loadPurchases();
    
    const ch = supabase.channel('replay-coin-bal')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'coin_balances' }, () => loadBalance())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'replay_purchases' }, () => loadPurchases())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Auto-unlock purchased videos
  useEffect(() => {
    purchasedVideos.forEach(videoId => {
      setUnlocked(prev => ({ ...prev, [videoId]: true }));
    });
  }, [purchasedVideos]);

  const handleUnlock = (video: Tables<'replay_videos'>) => {
    const input = passwordInputs[video.id] || '';
    if (input === video.password) {
      setUnlocked(prev => ({ ...prev, [video.id]: true }));
      setErrors(prev => ({ ...prev, [video.id]: '' }));
    } else {
      setErrors(prev => ({ ...prev, [video.id]: 'Sandi salah!' }));
    }
  };

  const handleBuyWithCoin = async (video: Tables<'replay_videos'>) => {
    if (!user) { toast.error('Silakan login terlebih dahulu!'); return; }
    if (coinBalance < REPLAY_COIN_PRICE) { toast.error(`Koin tidak cukup! Butuh ${REPLAY_COIN_PRICE} koin, saldo: ${coinBalance}`); return; }
    
    setBuyingVideo(video.id);
    try {
      // Deduct coins
      await supabase.from('coin_balances').update({ balance: coinBalance - REPLAY_COIN_PRICE }).eq('user_id', user.id);
      // Record transaction
      await supabase.from('coin_transactions').insert({ user_id: user.id, amount: -REPLAY_COIN_PRICE, type: 'purchase', description: `Replay: ${video.title}` });
      // Record replay purchase
      await supabase.from('replay_purchases' as any).insert({ user_id: user.id, video_id: video.id, coin_amount: REPLAY_COIN_PRICE } as any);
      
      setCoinBalance(prev => prev - REPLAY_COIN_PRICE);
      setPurchasedVideos(prev => new Set([...prev, video.id]));
      setUnlocked(prev => ({ ...prev, [video.id]: true }));
      toast.success(`Replay "${video.title}" berhasil dibuka! 🎉`);
    } catch {
      toast.error('Gagal membeli replay');
    }
    setBuyingVideo(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gradient mb-2">
            <Play className="inline w-8 h-8 mr-2" />Replay Show
          </h1>
          <p className="text-muted-foreground">Tonton ulang pertunjukan JKT48 favoritmu</p>
          {user && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
              <Coins className="w-4 h-4" /> Saldo: {coinBalance} Koin
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20"><p className="text-muted-foreground">Memuat video...</p></div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">🎬</span>
            <p className="text-muted-foreground">Belum ada video replay.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {videos.map((video, i) => (
              <motion.div key={video.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5">
                  <h3 className="font-bold text-foreground text-lg mb-1">{video.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    {new Date(video.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {unlocked[video.id] ? (
                    <div>
                      {purchasedVideos.has(video.id) && (
                        <p className="text-xs text-accent font-medium mb-2">✅ Dibeli dengan koin — akses permanen</p>
                      )}
                      <div className="aspect-video rounded-xl overflow-hidden bg-black">
                        <iframe src={getYoutubeEmbedUrl(video.youtube_url)} title={video.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen className="w-full h-full" />
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video rounded-xl bg-secondary/50 flex flex-col items-center justify-center gap-4">
                      <Lock className="w-12 h-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-medium">Video ini dilindungi</p>
                      
                      {/* Coin purchase option */}
                      {user && (
                        <button onClick={() => handleBuyWithCoin(video)} disabled={buyingVideo === video.id}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:opacity-90 transition disabled:opacity-50">
                          <Coins className="w-4 h-4" />
                          {buyingVideo === video.id ? 'Memproses...' : `Beli dengan ${REPLAY_COIN_PRICE} Koin`}
                        </button>
                      )}
                      
                      <div className="flex items-center gap-3 w-64">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">atau</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>

                      <div className="flex flex-col items-center gap-2 w-64">
                        <div className="relative w-full">
                          <input type={showPassword[video.id] ? 'text' : 'password'}
                            value={passwordInputs[video.id] || ''}
                            onChange={e => setPasswordInputs(prev => ({ ...prev, [video.id]: e.target.value }))}
                            placeholder="Masukkan sandi..."
                            className="w-full px-4 py-2 pr-10 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            onKeyDown={e => e.key === 'Enter' && handleUnlock(video)} />
                          <button onClick={() => setShowPassword(prev => ({ ...prev, [video.id]: !prev[video.id] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
                            {showPassword[video.id] ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                          </button>
                        </div>
                        {errors[video.id] && <p className="text-xs text-destructive">{errors[video.id]}</p>}
                        <button onClick={() => handleUnlock(video)}
                          className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition">
                          Buka Video
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReplayShow;
