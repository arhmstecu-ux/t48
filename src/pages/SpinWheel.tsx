import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Gift, Trophy, History } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface Prize {
  id: string;
  name: string;
  description: string;
  chance_percent: number;
  sort_order: number;
}

interface SpinRecord {
  id: string;
  user_id: string;
  purchase_id: string;
  spins_total: number;
  spins_used: number;
}

interface SpinResult {
  id: string;
  prize_name: string;
  created_at: string;
}

const COLORS = [
  'hsl(200, 80%, 50%)', // primary blue
  'hsl(350, 65%, 45%)', // accent red
  'hsl(160, 70%, 45%)', // success green
  'hsl(40, 90%, 55%)',  // warning yellow
  'hsl(280, 60%, 50%)', // purple
  'hsl(20, 80%, 55%)',  // orange
];

const SpinWheel = () => {
  const { user } = useAuth();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [spinsAvailable, setSpinsAvailable] = useState(0);
  const [spinRecords, setSpinRecords] = useState<SpinRecord[]>([]);
  const [results, setResults] = useState<SpinResult[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<Prize | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    // Load prizes
    const { data: prizesData } = await supabase.from('spin_prizes' as any).select('*').order('sort_order', { ascending: true });
    if (prizesData) setPrizes(prizesData as unknown as Prize[]);

    if (user) {
      const { data: spins } = await supabase.from('user_spins' as any).select('*').eq('user_id', user.id);
      if (spins) {
        const typed = spins as unknown as SpinRecord[];
        setSpinRecords(typed);
        const available = typed.reduce((sum, s) => sum + (s.spins_total - s.spins_used), 0);
        setSpinsAvailable(available);
      }

      const { data: resultsData } = await supabase.from('spin_results' as any).select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20);
      if (resultsData) setResults(resultsData as unknown as SpinResult[]);
    }
    setLoading(false);
  };

  // Draw wheel on canvas
  useEffect(() => {
    if (!canvasRef.current || prizes.length === 0) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const size = canvas.width;
    const center = size / 2;
    const radius = center - 10;
    const segAngle = (2 * Math.PI) / prizes.length;

    ctx.clearRect(0, 0, size, size);

    prizes.forEach((prize, i) => {
      const startAngle = i * segAngle - Math.PI / 2;
      const endAngle = startAngle + segAngle;

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + segAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
      const text = prize.name.length > 16 ? prize.name.slice(0, 14) + '..' : prize.name;
      ctx.fillText(text, radius - 20, 5);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, 25, 0, 2 * Math.PI);
    ctx.fillStyle = 'hsl(210, 50%, 10%)';
    ctx.fill();
    ctx.strokeStyle = 'hsl(200, 80%, 50%)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPIN', center, center + 4);
  }, [prizes]);

  const selectPrize = (): Prize => {
    const totalChance = prizes.reduce((s, p) => s + p.chance_percent, 0);
    let random = Math.random() * totalChance;
    for (const prize of prizes) {
      random -= prize.chance_percent;
      if (random <= 0) return prize;
    }
    return prizes[prizes.length - 1];
  };

  const handleSpin = async () => {
    if (spinning || spinsAvailable <= 0 || !user || prizes.length === 0) return;

    setSpinning(true);
    setShowResult(false);
    setWonPrize(null);

    const selectedPrize = selectPrize();
    const prizeIndex = prizes.findIndex(p => p.id === selectedPrize.id);
    const segAngle = 360 / prizes.length;
    // Target angle: the center of the prize segment, accounting for pointer at top
    const targetAngle = 360 - (prizeIndex * segAngle + segAngle / 2);
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
    const finalRotation = rotation + fullSpins * 360 + targetAngle - (rotation % 360);

    setRotation(finalRotation);

    // Wait for spin animation to finish
    setTimeout(async () => {
      setWonPrize(selectedPrize);
      setShowResult(true);
      setSpinning(false);

      // Record result
      await supabase.from('spin_results' as any).insert({
        user_id: user.id,
        prize_id: selectedPrize.id,
        prize_name: selectedPrize.name,
      });

      // Decrement spins - find first record with available spins
      const recordWithSpins = spinRecords.find(s => s.spins_total - s.spins_used > 0);
      if (recordWithSpins) {
        await supabase.from('user_spins' as any)
          .update({ spins_used: recordWithSpins.spins_used + 1 })
          .eq('id', recordWithSpins.id);
      }

      setSpinsAvailable(prev => prev - 1);
      loadData(); // Refresh data
    }, 4500); // Match CSS transition duration
  };

  if (loading) {
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
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <Sparkles className="w-16 h-16 text-warning mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-gradient mb-3">Spin & Win!</h1>
          <p className="text-muted-foreground mb-6">Login untuk memutar roda keberuntungan</p>
          <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-bold">
            Login
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-gradient mb-2">
            <Sparkles className="inline w-7 h-7 mr-2" />Spin & Win!
          </h1>
          <p className="text-muted-foreground text-sm">Putar roda dan menangkan hadiah menarik!</p>
        </div>

        {/* Spin counter */}
        <div className="glass-card rounded-2xl p-4 mb-6 text-center">
          <p className="text-sm text-muted-foreground">Spin Tersedia</p>
          <p className="text-4xl font-extrabold text-gradient">{spinsAvailable}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Beli produk &lt; Rp25.000 = 1 spin • ≥ Rp25.000 = 3 spin
          </p>
        </div>

        {/* Wheel */}
        <div className="relative flex justify-center mb-6">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
          </div>
          
          <div
            className="relative"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 4.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
            }}
          >
            <canvas ref={canvasRef} width={320} height={320} className="rounded-full shadow-2xl" />
          </div>
        </div>

        {/* Spin Button */}
        <div className="text-center mb-6">
          <button
            onClick={handleSpin}
            disabled={spinning || spinsAvailable <= 0}
            className="px-8 py-3 rounded-2xl gradient-primary text-primary-foreground font-extrabold text-lg hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
          >
            {spinning ? '🎰 Memutar...' : spinsAvailable <= 0 ? 'Tidak ada spin' : '🎯 PUTAR!'}
          </button>
        </div>

        {/* Won Prize Modal */}
        <AnimatePresence>
          {showResult && wonPrize && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-sm"
              onClick={() => setShowResult(false)}
            >
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="glass-card rounded-2xl p-8 text-center max-w-sm mx-4"
                onClick={e => e.stopPropagation()}
              >
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}>
                  <Gift className="w-16 h-16 text-warning mx-auto mb-3" />
                </motion.div>
                <h2 className="text-2xl font-extrabold text-gradient mb-2">🎉 Selamat!</h2>
                <p className="text-lg font-bold text-foreground mb-1">{wonPrize.name}</p>
                <p className="text-sm text-muted-foreground mb-4">{wonPrize.description}</p>
                <p className="text-xs text-muted-foreground">Hubungi admin untuk klaim hadiah</p>
                <button
                  onClick={() => setShowResult(false)}
                  className="mt-4 px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium"
                >
                  Tutup
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prize List */}
        <div className="glass-card rounded-2xl p-5 mb-6">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-warning" /> Daftar Hadiah
          </h3>
          <div className="space-y-2">
            {prizes.map((prize, i) => (
              <div key={prize.id} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">{prize.name}</p>
                  <p className="text-xs text-muted-foreground">{prize.description}</p>
                </div>
                <span className="text-xs font-medium text-muted-foreground">{prize.chance_percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Spin History */}
        {results.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
              <History className="w-5 h-5 text-primary" /> Riwayat Spin
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {results.map(r => (
                <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0">
                  <span className="text-sm font-medium text-foreground">🎁 {r.prize_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SpinWheel;
