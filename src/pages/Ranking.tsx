import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { Trophy, Crown, Medal, Camera, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RankingEntry {
  user_id: string;
  username: string;
  profile_photo: string | null;
  total_spent: number;
  total_items: number;
  purchase_count: number;
}

const Ranking = () => {
  const { user, profile, isOwner } = useAuth();
  const [rankingData, setRankingData] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rewardText, setRewardText] = useState('');
  const [editingReward, setEditingReward] = useState(false);
  const [rewardInput, setRewardInput] = useState('');

  const fetchRanking = async () => {
    const { data, error } = await supabase.rpc('get_ranking_data');
    if (!error && data) setRankingData(data as RankingEntry[]);
    setLoading(false);
  };

  const fetchReward = async () => {
    const { data } = await supabase.from('app_settings').select('value').eq('key', 'ranking_reward_text').maybeSingle();
    if (data) { setRewardText(data.value); setRewardInput(data.value); }
  };

  useEffect(() => {
    fetchRanking();
    fetchReward();
    // Realtime: refetch when purchases change
    const channel = supabase
      .channel('ranking-realtime')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'purchases' }, () => fetchRanking())
      .subscribe();
    
    const settingsChannel = supabase
      .channel('ranking-settings')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'app_settings' }, () => fetchReward())
      .subscribe();

    return () => { supabase.removeChannel(channel); supabase.removeChannel(settingsChannel); };
  }, []);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  const rankIcons = [
    <Crown key="1" className="w-6 h-6 text-warning" />,
    <Medal key="2" className="w-6 h-6 text-muted-foreground" />,
    <Medal key="3" className="w-6 h-6 text-accent" />,
  ];

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Ukuran file maksimal 2MB!'); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const { error } = await supabase.from('profiles').update({ profile_photo: base64 }).eq('user_id', user.id);
      if (error) toast.error('Gagal mengubah foto');
      else { toast.success('Foto profil berhasil diubah!'); fetchRanking(); }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveReward = async () => {
    await supabase.from('app_settings').upsert({ key: 'ranking_reward_text', value: rewardInput });
    setRewardText(rewardInput);
    setEditingReward(false);
    toast.success('Keterangan hadiah disimpan!');
  };

  // Owner: view profile of a ranked user
  const [viewProfile, setViewProfile] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gradient mb-2">
            <Trophy className="inline w-8 h-8 mr-2" />Ranking Pembeli
          </h1>
          <p className="text-muted-foreground">Top buyer T48ID Store</p>
        </div>

        {/* Reward info */}
        {(rewardText || isOwner) && (
          <div className="glass-card rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-warning" />
              <h3 className="font-bold text-foreground text-sm">Hadiah Top 10</h3>
              {isOwner && (
                <button onClick={() => setEditingReward(!editingReward)} className="ml-auto text-xs text-primary hover:underline">
                  {editingReward ? 'Batal' : 'Edit'}
                </button>
              )}
            </div>
            {editingReward && isOwner ? (
              <div className="space-y-2">
                <textarea value={rewardInput} onChange={e => setRewardInput(e.target.value)} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" placeholder="Tulis keterangan hadiah ranking..." />
                <button onClick={handleSaveReward} className="px-4 py-1.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">Simpan</button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{rewardText || 'Belum ada keterangan hadiah.'}</p>
            )}
          </div>
        )}

        {user && profile && (
          <div className="glass-card rounded-2xl p-5 mb-6">
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
              <div>
                <h3 className="font-bold text-foreground">{profile.username}</h3>
                <p className="text-xs text-muted-foreground">Klik ikon kamera untuk ganti foto profil</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : rankingData.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">🏆</span>
            <p className="text-muted-foreground">Belum ada data pembelian.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rankingData.slice(0, 10).map((data, i) => (
              <motion.div key={data.user_id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                className={`glass-card rounded-2xl p-4 ${i === 0 ? 'border-2 border-warning/50 bg-warning/5' : i === 1 ? 'border border-muted-foreground/30' : i === 2 ? 'border border-accent/30' : ''}`}>
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-lg">
                    {i < 3 ? rankIcons[i] : <span className="text-muted-foreground">#{i + 1}</span>}
                  </div>
                  <div className="flex-shrink-0">
                    {data.profile_photo ? (
                      <img src={data.profile_photo} alt={data.username} className="w-12 h-12 rounded-full object-cover border-2 border-border" />
                    ) : (
                      <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-lg font-bold text-primary-foreground">
                        {data.username[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground truncate">{data.username}</h3>
                    <p className="text-xs text-muted-foreground">{data.purchase_count} pembelian • {data.total_items} item</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="font-extrabold text-gradient text-sm">{formatPrice(data.total_spent)}</span>
                    {isOwner && (
                      <button onClick={() => setViewProfile(viewProfile === data.user_id ? null : data.user_id)} className="block text-xs text-primary hover:underline mt-1">
                        Profil
                      </button>
                    )}
                  </div>
                </div>
                {/* Owner can view profile details */}
                {isOwner && viewProfile === data.user_id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">User ID: {data.user_id}</p>
                    <p className="text-xs text-muted-foreground">Total Belanja: {formatPrice(data.total_spent)}</p>
                    <p className="text-xs text-muted-foreground">{data.purchase_count} transaksi, {data.total_items} item dibeli</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Ranking;
