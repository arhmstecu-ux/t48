import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Coins, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import qrisImg from '@/assets/qris.jpg';

const COIN_PACKAGES = [
  { coins: 2, price: 5000 },
  { coins: 4, price: 10000 },
  { coins: 8, price: 20000 },
  { coins: 13, price: 32500 },
  { coins: 18, price: 45000 },
  { coins: 23, price: 57500 },
  { coins: 30, price: 75000 },
  { coins: 38, price: 95000 },
  { coins: 45, price: 112500 },
  { coins: 55, price: 137500 },
  { coins: 65, price: 162500 },
];

const CoinTopup = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [selected, setSelected] = useState<typeof COIN_PACKAGES[0] | null>(null);
  const [step, setStep] = useState<'select' | 'pay' | 'done'>('select');
  const [requestCode, setRequestCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [myRequests, setMyRequests] = useState<any[]>([]);

  const formatPrice = (p: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

  // Load balance
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from('coin_balances' as any).select('balance').eq('user_id', user.id).single();
      if (data) setBalance((data as any).balance || 0);
      else {
        // Create balance if not exists
        await supabase.from('coin_balances' as any).insert({ user_id: user.id, balance: 0 } as any);
        setBalance(0);
      }
    };
    load();

    const ch = supabase.channel('coin-balance-rt')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'coin_balances' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Load my requests
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from('coin_topup_requests' as any).select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setMyRequests(data as any[]);
    };
    load();

    const ch = supabase.channel('coin-topup-rt')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'coin_topup_requests' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (!user) { navigate('/login'); return null; }

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '#';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
  };

  const handleSelectPackage = (pkg: typeof COIN_PACKAGES[0]) => {
    setSelected(pkg);
    setStep('pay');
  };

  const handleConfirmPayment = async () => {
    if (!selected || !user) return;
    const code = generateCode();
    setRequestCode(code);

    const { error } = await supabase.from('coin_topup_requests' as any).insert({
      user_id: user.id,
      code,
      coin_amount: selected.coins,
      price: selected.price,
      status: 'pending',
    } as any);

    if (error) {
      toast.error('Gagal membuat request');
      return;
    }
    setStep('done');
    toast.success('Request topup dibuat! Kirim kode ke admin.');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(requestCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getWhatsAppUrl = () => {
    const msg = `Halo admin, saya ${profile?.username || 'User'} ingin topup ${selected?.coins} koin (${formatPrice(selected?.price || 0)}). Kode: ${requestCode}. Sudah dibayar via QRIS. Mohon konfirmasi!`;
    return `https://wa.me/6282135963767?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-lg">
        {/* Balance */}
        <div className="glass-card rounded-2xl p-5 mb-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Coins className="w-6 h-6 text-warning" />
            <span className="text-2xl font-extrabold text-foreground">{balance}</span>
          </div>
          <p className="text-sm text-muted-foreground">Koin kamu</p>
        </div>

        {step === 'select' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-xl font-bold text-foreground mb-4">Pilih Paket Koin</h2>
            <p className="text-xs text-muted-foreground mb-4">1 Koin = Rp 2.500</p>
            <div className="grid grid-cols-2 gap-3">
              {COIN_PACKAGES.map(pkg => (
                <button
                  key={pkg.coins}
                  onClick={() => handleSelectPackage(pkg)}
                  className="glass-card rounded-xl p-4 text-center hover:border-primary/50 transition-all active:scale-95"
                >
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Coins className="w-4 h-4 text-warning" />
                    <span className="text-lg font-extrabold text-foreground">{pkg.coins}</span>
                  </div>
                  <p className="text-xs font-semibold text-primary">{formatPrice(pkg.price)}</p>
                </button>
              ))}
            </div>

            {/* History */}
            {myRequests.length > 0 && (
              <div className="mt-8">
                <h3 className="font-bold text-foreground mb-3">Riwayat Topup</h3>
                <div className="space-y-2">
                  {myRequests.slice(0, 10).map((r: any) => (
                    <div key={r.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-foreground">{r.coin_amount} Koin</span>
                        <span className="text-xs text-muted-foreground ml-2">{r.code}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.status === 'confirmed' ? 'bg-green-100 text-green-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {r.status === 'confirmed' ? '✅ Dikonfirmasi' : r.status === 'rejected' ? '❌ Ditolak' : '⏳ Menunggu'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {step === 'pay' && selected && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-xl font-bold text-foreground mb-4">Bayar via QRIS</h2>
            <div className="glass-card rounded-2xl p-5 mb-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Topup {selected.coins} Koin</p>
              <p className="text-2xl font-extrabold text-gradient">{formatPrice(selected.price)}</p>
            </div>
            <div className="glass-card rounded-2xl p-4 mb-4">
              <img src={qrisImg} alt="QRIS" className="w-full max-w-[250px] mx-auto rounded-xl" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setStep('select'); setSelected(null); }} className="flex-1 py-3 rounded-xl border border-border text-foreground font-bold">Kembali</button>
              <button onClick={handleConfirmPayment} className="flex-1 py-3 rounded-xl gradient-primary text-primary-foreground font-bold">Sudah Bayar</button>
            </div>
          </motion.div>
        )}

        {step === 'done' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-foreground mb-2">Request Topup Dibuat!</h2>
            <p className="text-sm text-muted-foreground mb-4">Kirim kode berikut ke admin untuk konfirmasi:</p>
            <div className="glass-card rounded-xl p-4 mb-4 flex items-center justify-center gap-3">
              <span className="text-2xl font-mono font-extrabold text-foreground tracking-wider">{requestCode}</span>
              <button onClick={copyCode} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition">
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[hsl(142,70%,45%)] text-white font-bold text-sm hover:opacity-90 transition-opacity mb-4"
            >
              📱 Hubungi Admin via WhatsApp
            </a>
            <br />
            <button onClick={() => { setStep('select'); setSelected(null); }} className="mt-3 text-sm text-primary font-medium">Kembali ke Paket</button>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default CoinTopup;
