import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageCircle, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import ReviewSection from '@/components/ReviewSection';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import PurchaseAnimation from '@/components/PurchaseAnimation';
import { openWhatsAppBuy } from '@/lib/wa';

type Product = Tables<'products'> & { show_date?: string | null };

const CountdownTimer = ({ targetDate, onExpired }: { targetDate: string; onExpired?: () => void }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }); onExpired?.(); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
        expired: false,
      });
    };
    calc();
    const i = setInterval(calc, 1000);
    return () => clearInterval(i);
  }, [targetDate, onExpired]);

  if (timeLeft.expired) return null;
  return (
    <div className="bg-card/80 rounded-xl p-4 border border-border/50">
      <div className="flex items-center justify-center gap-3">
        {[
          { val: timeLeft.days, label: 'Hari' },
          { val: timeLeft.hours, label: 'Jam' },
          { val: timeLeft.minutes, label: 'Menit' },
          { val: timeLeft.seconds, label: 'Detik' },
        ].map((t, i) => (
          <div key={i} className="text-center">
            <div className="text-2xl md:text-3xl font-extrabold text-foreground tabular-nums">{String(t.val).padStart(2, '0')}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ShowCatalog = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const { data: products, loading } = useRealtimeTable<Product>('products');
  const showProducts = products.filter(p => (p.category || '').toLowerCase() !== 'pm');

  const handleProductExpired = useCallback(async (productId: string) => {
    await supabase.from('products').delete().eq('id', productId);
  }, []);

  const filtered = showProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  const formatShowDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
      d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  };

  const closeAll = () => setSelectedProduct(null);

  const handleBuy = async () => {
    if (!user) { toast.error('Silakan login terlebih dahulu!'); navigate('/login'); return; }
    if (!selectedProduct || processing) return;
    setProcessing(true);
    try {
      const { data: purchase } = await supabase.from('purchases').insert({
        user_id: user.id, total: selectedProduct.price, status: 'pending', payment_method: 'qris',
      }).select().single();
      if (purchase) {
        await supabase.from('purchase_items').insert({
          purchase_id: purchase.id, product_id: selectedProduct.id,
          product_name: selectedProduct.name, product_price: selectedProduct.price, quantity: 1,
        });
      }
      setShowAnimation(true);
      setTimeout(() => setShowAnimation(false), 1200);
      openWhatsAppBuy({
        productName: selectedProduct.name,
        price: selectedProduct.price,
        username: profile?.username,
        profileCode: profile?.profile_code,
      });
      toast.success('Mengarahkan ke WhatsApp Owner...');
      closeAll();
    } catch {
      toast.error('Gagal memproses');
    }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PurchaseAnimation show={showAnimation} onComplete={() => {}} />
      <main className="container mx-auto px-4 py-6 max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gradient mb-1">Katalog Show</h1>
          <p className="text-muted-foreground text-sm">Pilih show JKT48 favoritmu</p>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari show..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>

        {loading ? (
          <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>
        ) : (
          <div className="space-y-4">
            {filtered.map((product, i) => {
              const hasImage = product.image && product.image.length > 10;
              const showDate = (product as any).show_date;
              return (
                <motion.div key={product.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.04 }}
                  className="rounded-2xl overflow-hidden bg-card border border-border/50 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                  onClick={() => setSelectedProduct(product)}>
                  <div className="relative h-44 bg-gradient-to-br from-primary/20 to-accent/20">
                    {hasImage ? (
                      <img src={product.image!} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><span className="text-5xl">🎤</span></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-card/90 text-foreground">
                        {showDate && new Date(showDate) > new Date() ? 'Terjadwal' : product.category}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-16">
                      <h3 className="font-bold text-white text-base leading-tight drop-shadow-lg">{product.name}</h3>
                      {showDate && (
                        <p className="text-white/80 text-xs mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatShowDate(showDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-lg font-extrabold text-gradient">{formatPrice(product.price)}</span>
                    <span className="text-xs text-primary font-medium">Lihat Detail →</span>
                  </div>
                  {showDate && new Date(showDate) > new Date() && (
                    <div className="hidden">
                      <CountdownTimer targetDate={showDate} onExpired={() => handleProductExpired(product.id)} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground mt-12">Tidak ada show yang tersedia.</p>
        )}
      </main>

      <AnimatePresence>
        {selectedProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50" onClick={closeAll}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="absolute inset-x-0 bottom-0 max-h-[92vh] bg-card rounded-t-3xl overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="relative h-52 bg-gradient-to-br from-primary/20 to-accent/20">
                {selectedProduct.image && selectedProduct.image.length > 10 ? (
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><span className="text-6xl">🎤</span></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <button onClick={closeAll} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="px-5 py-4 space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-extrabold text-foreground">{selectedProduct.name}</h2>
                  {(selectedProduct as any).show_date && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                      <Calendar className="w-4 h-4" /> {formatShowDate((selectedProduct as any).show_date)}
                    </p>
                  )}
                </div>

                {(selectedProduct as any).show_date && new Date((selectedProduct as any).show_date) > new Date() && (
                  <CountdownTimer targetDate={(selectedProduct as any).show_date} />
                )}

                {selectedProduct.description && (
                  <p className="text-sm text-muted-foreground text-center">{selectedProduct.description}</p>
                )}

                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground">Harga</p>
                  <p className="text-3xl font-extrabold text-gradient">{formatPrice(selectedProduct.price)}</p>
                </div>

                <button onClick={handleBuy} disabled={processing}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[hsl(142,70%,45%)] text-white font-bold text-base hover:opacity-90 transition-opacity disabled:opacity-50">
                  <MessageCircle className="w-5 h-5" /> {processing ? 'Memproses...' : 'Beli via WhatsApp Owner'}
                </button>

                <div className="pt-2">
                  <ReviewSection productId={selectedProduct.id} productName={selectedProduct.name} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShowCatalog;
