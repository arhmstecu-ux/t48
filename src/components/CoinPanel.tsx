import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Coins, Search, Send, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface TopupRequest {
  id: string;
  user_id: string;
  code: string;
  coin_amount: number;
  price: number;
  status: string;
  created_at: string;
}

const CoinPanel = () => {
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [searchCode, setSearchCode] = useState('');
  const [manualUserId, setManualUserId] = useState('');
  const [manualAmount, setManualAmount] = useState(1);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('coin_topup_requests' as any).select('*').order('created_at', { ascending: false });
      if (data) setRequests(data as unknown as TopupRequest[]);
    };
    load();
    const ch = supabase.channel('coin-admin-rt')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'coin_topup_requests' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('profiles').select('user_id, username');
      if (data) setProfiles(data);
    };
    load();
  }, []);

  const getLevelUpCoins = (level: number): number => {
    if (level < 3) return 4;
    if (level < 8) return 8;
    return 13;
  };

  const updateUserLevel = async (userId: string, topupCoins: number) => {
    const { data: levelData } = await supabase.from('user_levels' as any).select('*').eq('user_id', userId).single();
    if (!levelData) {
      await supabase.from('user_levels' as any).insert({ user_id: userId, level: 1, total_topup_coins: topupCoins } as any);
      return;
    }
    const current = levelData as any;
    let newTotal = current.total_topup_coins + topupCoins;
    let newLevel = current.level;
    // Calculate level ups
    while (newLevel < 20) {
      const needed = getLevelUpCoins(newLevel);
      if (newTotal >= needed) {
        newTotal -= needed;
        newLevel++;
      } else break;
    }
    await supabase.from('user_levels' as any).update({ level: newLevel, total_topup_coins: newTotal, updated_at: new Date().toISOString() } as any).eq('user_id', userId);
    if (newLevel > current.level) {
      // Notify user about level up
      await supabase.from('notifications').insert({
        user_id: userId,
        title: '⭐ Level Up!',
        message: `Selamat! Kamu naik ke Level ${newLevel}!`,
        type: 'level',
      } as any);
    }
  };

  const handleConfirm = async (req: TopupRequest) => {
    await supabase.from('coin_topup_requests' as any).update({ status: 'confirmed', confirmed_at: new Date().toISOString() } as any).eq('id', req.id);

    const { data: existing } = await supabase.from('coin_balances' as any).select('balance').eq('user_id', req.user_id).single();
    if (existing) {
      await supabase.from('coin_balances' as any).update({ balance: (existing as any).balance + req.coin_amount, updated_at: new Date().toISOString() } as any).eq('user_id', req.user_id);
    } else {
      await supabase.from('coin_balances' as any).insert({ user_id: req.user_id, balance: req.coin_amount } as any);
    }

    await supabase.from('coin_transactions' as any).insert({
      user_id: req.user_id,
      amount: req.coin_amount,
      type: 'topup',
      description: `Topup ${req.coin_amount} koin (Kode: ${req.code})`,
    } as any);

    // Update level
    await updateUserLevel(req.user_id, req.coin_amount);

    toast.success(`${req.coin_amount} koin dikirim!`);
  };

  const handleReject = async (req: TopupRequest) => {
    await supabase.from('coin_topup_requests' as any).update({ status: 'rejected' } as any).eq('id', req.id);
    toast.success('Request ditolak');
  };

  const handleManualSend = async () => {
    const target = profiles.find(p => p.username.toLowerCase() === manualUserId.toLowerCase() || p.user_id === manualUserId);
    if (!target) { toast.error('User tidak ditemukan'); return; }
    if (manualAmount < 1) { toast.error('Jumlah minimal 1'); return; }

    const { data: existing } = await supabase.from('coin_balances' as any).select('balance').eq('user_id', target.user_id).single();
    if (existing) {
      await supabase.from('coin_balances' as any).update({ balance: (existing as any).balance + manualAmount, updated_at: new Date().toISOString() } as any).eq('user_id', target.user_id);
    } else {
      await supabase.from('coin_balances' as any).insert({ user_id: target.user_id, balance: manualAmount } as any);
    }

    await supabase.from('coin_transactions' as any).insert({
      user_id: target.user_id,
      amount: manualAmount,
      type: 'manual',
      description: `Transfer manual ${manualAmount} koin dari admin`,
    } as any);

    toast.success(`${manualAmount} koin dikirim ke ${target.username}!`);
    setManualUserId('');
    setManualAmount(1);
  };

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);
  const getUsername = (userId: string) => profiles.find(p => p.user_id === userId)?.username || userId.slice(0, 8);

  const filteredRequests = searchCode
    ? requests.filter(r => r.code.toLowerCase().includes(searchCode.toLowerCase()))
    : requests;

  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const doneRequests = filteredRequests.filter(r => r.status !== 'pending');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Manual transfer */}
      <div className="glass-card rounded-xl p-4 mb-4">
        <h3 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2"><Send className="w-4 h-4 text-primary" /> Transfer Koin Manual</h3>
        <div className="flex gap-2 flex-wrap">
          <input value={manualUserId} onChange={e => setManualUserId(e.target.value)} placeholder="Username" className="flex-1 min-w-[120px] px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
          <input type="number" value={manualAmount} onChange={e => setManualAmount(Number(e.target.value))} min={1} className="w-20 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
          <button onClick={handleManualSend} className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">Kirim</button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={searchCode} onChange={e => setSearchCode(e.target.value)} placeholder="Cari kode topup..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm" />
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-6">
          <h3 className="font-bold text-foreground text-sm mb-2">⏳ Menunggu Konfirmasi ({pendingRequests.length})</h3>
          <div className="space-y-2">
            {pendingRequests.map(r => (
              <div key={r.id} className="glass-card rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-foreground">{r.code}</span>
                    <span className="text-xs text-muted-foreground">• {getUsername(r.user_id)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Coins className="w-3 h-3 text-warning" />
                    <span className="text-xs font-semibold text-foreground">{r.coin_amount} Koin</span>
                    <span className="text-xs text-muted-foreground">{formatPrice(r.price)}</span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => handleConfirm(r)} className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition">
                    <Check className="w-4 h-4 text-green-600" />
                  </button>
                  <button onClick={() => handleReject(r)} className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition">
                    <X className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      {doneRequests.length > 0 && (
        <div>
          <h3 className="font-bold text-foreground text-sm mb-2">Riwayat ({doneRequests.length})</h3>
          <div className="space-y-2">
            {doneRequests.slice(0, 20).map(r => (
              <div key={r.id} className="glass-card rounded-xl p-3 flex items-center justify-between opacity-70">
                <div>
                  <span className="font-mono text-xs text-foreground">{r.code}</span>
                  <span className="text-xs text-muted-foreground ml-2">{getUsername(r.user_id)} • {r.coin_amount} Koin</span>
                </div>
                <span className={`text-xs font-semibold ${r.status === 'confirmed' ? 'text-green-600' : 'text-destructive'}`}>
                  {r.status === 'confirmed' ? '✅' : '❌'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CoinPanel;
