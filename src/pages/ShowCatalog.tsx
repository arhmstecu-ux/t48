import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Coins, CreditCard, MessageCircle, X, CheckCircle, Clock, Calendar, Tag } from 'lucide-react';
import { toast } from 'sonner';
import ReviewSection from '@/components/ReviewSection';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import qrisImg from '@/assets/qris.jpg';
import PurchaseAnimation from '@/components/PurchaseAnimation';

type Product = Tables<'products'> & { coin_price?: number; show_date?: string | null };

const CountdownTimer = ({ targetDate, onExpired }: { targetDate: string; onExpired?: () => void }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        onExpired?.();
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
        expired: false,
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onExpired]);

  if (timeLeft.expired) return null;

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-border/50">
      <div className="flex items-center justify-center gap-3">
        {[
          { val: timeLeft.days, label: 'Hari' },
          { val: timeLeft.hours, label: 'Jam' },
          { val: timeLeft.minutes, label: 'Menit' },
          { val: timeLeft.seconds, label: 'Detik' },
        ].map((t, i) => (
          <div key={i} className="text-center">
            <div className="text-2xl md:text-3xl font-extrabold text-foreground tabular-nums">
              {String(t.val).padStart(2, '0')}
            </div>
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
  const [coinBalance, setCoinBalance] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [buyMethod, setBuyMethod] = useState<'qris' | 'coin' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [purchaseDone, setPurchaseDone] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherResult, setVoucherResult] = useState<string | null>(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{ id: string; code: string; discount_percent: number } | null>(null);

  const { data: products, loading } = useRealtimeTable<Product>('products');

  // Filter only show products (not PM)
  const showProducts = products.filter(p => (p.category || '').toLowerCase() !== 'pm');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from('coin_balances').select('balance').eq('user_id', user.id).maybeSingle();
      if (data) setCoinBalance(data.balance);
    };
    load();
    const ch = supabase.channel('coin-bal-catalog')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'coin_balances' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Auto-delete expired products
  const handleProductExpired = useCallback(async (productId: string) => {
    await supabase.from('products').delete().eq('id', productId);
  }, []);

  const filtered = showProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  const discount = appliedVoucher?.discount_percent || 0;
  const getDiscountedPrice = (price: number) => Math.round(price * (1 - discount / 100));

  const getWhatsAppUrl = (product: Product, finalPrice: number, method: string) => {
    const username = profile?.username || 'User';
    const voucherText = appliedVoucher ? ` (Voucher: ${appliedVoucher.code}, diskon ${appliedVoucher.discount_percent}%)` : '';
    const message = `Halo admin, saya ${username} sudah melakukan pembayaran ${method} sebesar ${formatPrice(finalPrice)} untuk: ${product.name}.${voucherText} Mohon konfirmasi pembelian saya. Terima kasih!`;
    return `https://wa.me/6282135963767?text=${encodeURIComponent(message)}`;
  };

  const openDetail = (product: Product) => {
    setSelectedProduct(product);
    setBuyMethod(null);
    setPurchaseDone(false);
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherResult(null);
  };

  const openBuyModal = (method: 'qris' | 'coin') => {
    if (!user) { toast.error('Silakan login terlebih dahulu!'); navigate('/login'); return; }
    if (!selectedProduct) return;
    if (method === 'coin') {
      const coinPrice = selectedProduct.coin_price || 0;
      if (coinPrice <= 0) { toast.error('Produk ini tidak bisa dibeli dengan koin'); return; }
      if (coinBalance < coinPrice) { toast.error(`Koin tidak cukup! Butuh ${coinPrice} koin, saldo: ${coinBalance}`); return; }
    }
    setBuyMethod(method);
    setPurchaseDone(false);
  };

  const closeAll = () => {
    setSelectedProduct(null);
    setBuyMethod(null);
    setPurchaseDone(false);
    setAppliedVoucher(null);
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim() || checkingVoucher || !user) return;
    setCheckingVoucher(true);
    try {
      const { data: voucher } = await supabase
        .from('vouchers').select('*').eq('code', voucherCode.trim().toUpperCase()).eq('is_active', true).maybeSingle();
      if (!voucher) { toast.error('Kode voucher tidak valid!'); setCheckingVoucher(false); return; }
      if (voucher.used_count >= voucher.max_uses) { toast.error('Voucher sudah habis!'); setCheckingVoucher(false); return; }
      if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) { toast.error('Voucher sudah kedaluwarsa!'); setCheckingVoucher(false); return; }
      const { data: usage } = await supabase.from('voucher_usage').select('id').eq('voucher_id', voucher.id).eq('user_id', user.id).maybeSingle();
      if (usage) { toast.error('Kamu sudah pernah menggunakan voucher ini!'); setCheckingVoucher(false); return; }
      setAppliedVoucher({ id: voucher.id, code: voucher.code, discount_percent: voucher.discount_percent });
      setVoucherResult(`✅ Diskon ${voucher.discount_percent}%`);
      toast.success(`Voucher ${voucher.code} berhasil!`);
    } catch { toast.error('Gagal memvalidasi voucher'); }
    setCheckingVoucher(false);
  };

  const handleConfirmPayment = async () => {
    if (!user || !selectedProduct || !buyMethod || processing) return;
    setProcessing(true);
    try {
      if (buyMethod === 'coin') {
        const coinPrice = selectedProduct.coin_price || 0;
        await supabase.from('coin_balances').update({ balance: coinBalance - coinPrice }).eq('user_id', user.id);
        await supabase.from('coin_transactions').insert({ user_id: user.id, amount: -coinPrice, type: 'purchase', description: `Beli: ${selectedProduct.name}` });
        const { data: purchase } = await supabase.from('purchases').insert({
          user_id: user.id, total: 0, status: 'completed', payment_method: 'coin',
        }).select().single();
        if (purchase) {
          await supabase.from('purchase_items').insert({
            purchase_id: purchase.id, product_id: selectedProduct.id, product_name: selectedProduct.name, product_price: coinPrice, quantity: 1,
          });
        }
        setCoinBalance(prev => prev - coinPrice);
      } else {
        const finalPrice = getDiscountedPrice(selectedProduct.price);
        const { data: purchase } = await supabase.from('purchases').insert({
          user_id: user.id, total: finalPrice, status: 'pending', payment_method: 'qris',
        }).select().single();
        if (purchase) {
          await supabase.from('purchase_items').insert({
            purchase_id: purchase.id, product_id: selectedProduct.id, product_name: selectedProduct.name, product_price: selectedProduct.price, quantity: 1,
          });
          if (appliedVoucher) {
            await supabase.from('voucher_usage').insert({ voucher_id: appliedVoucher.id, user_id: user.id, purchase_id: purchase.id });
          }
        }
      }
      setShowAnimation(true);
      setTimeout(() => {
        setShowAnimation(false);
        setPurchaseDone(true);
      }, 1500);
      toast.success(`${selectedProduct.name} berhasil dibeli! 🎉`);
    } catch {
      toast.error('Gagal memproses pembayaran');
    }
    setProcessing(false);
  };

  const formatShowDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
      d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PurchaseAnimation show={showAnimation} onComplete={() => {}} />
      <main className="container mx-auto px-4 py-6 max-w-lg">
        <div className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-gradient mb-1">Katalog Show</h1>
          <p className="text-muted-foreground text-sm">Pilih show JKT48 favoritmu</p>
          {user && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
              <Coins className="w-4 h-4" /> Saldo: {coinBalance} Koin
            </div>
          )}
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
              const coinPrice = product.coin_price || 0;
              const hasImage = product.image && product.image.length > 10;
              const showDate = (product as any).show_date;
              return (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="rounded-2xl overflow-hidden bg-card border border-border/50 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                  onClick={() => openDetail(product)}>
                  {/* Image area */}
                  <div className="relative h-44 bg-gradient-to-br from-primary/20 to-accent/20">
                    {hasImage ? (
                      <img src={product.image!} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-5xl">🎤</span>
                      </div>
                    )}
                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    {/* Category badge */}
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-card/90 text-foreground backdrop-blur-sm">
                        {showDate && new Date(showDate) > new Date() ? 'Terjadwal' : product.category}
                      </span>
                    </div>
                    {/* Coin price badge */}
                    {coinPrice > 0 && (
                      <div className="absolute bottom-3 right-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold">
                          <Coins className="w-3.5 h-3.5" /> {coinPrice}
                        </span>
                      </div>
                    )}
                    {/* Title on image */}
                    <div className="absolute bottom-3 left-3 right-16">
                      <h3 className="font-bold text-white text-base leading-tight drop-shadow-lg">{product.name}</h3>
                      {showDate && (
                        <p className="text-white/80 text-xs mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatShowDate(showDate)}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Bottom info */}
                  <div className="p-3 flex items-center justify-between">
                    <span className="text-lg font-extrabold text-gradient">{formatPrice(product.price)}</span>
                    <span className="text-xs text-primary font-medium">Lihat Detail →</span>
                  </div>
                  {/* Auto-delete countdown handler */}
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

      {/* Detail + Buy Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={closeAll}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute inset-x-0 bottom-0 max-h-[92vh] bg-card rounded-t-3xl overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              
              {/* Product header image */}
              <div className="relative h-52 bg-gradient-to-br from-primary/20 to-accent/20">
                {selectedProduct.image && selectedProduct.image.length > 10 ? (
                  <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><span className="text-6xl">🎤</span></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <button onClick={closeAll} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm">
                  <X className="w-5 h-5 text-white" />
                </button>
                {(selectedProduct as any).show_date && (
                  <div className="absolute bottom-3 left-4">
                    <span className="px-2 py-0.5 rounded-md bg-card/80 text-foreground text-xs font-medium backdrop-blur-sm">Terjadwal</span>
                  </div>
                )}
                {(selectedProduct.coin_price || 0) > 0 && (
                  <div className="absolute bottom-3 right-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold">
                      <Coins className="w-4 h-4" /> {selectedProduct.coin_price}
                    </span>
                  </div>
                )}
              </div>

              <div className="px-5 py-4">
                {!buyMethod && !purchaseDone ? (
                  /* Detail view */
                  <div className="space-y-4">
                    <div className="text-center">
                      <h2 className="text-xl font-extrabold text-foreground">{selectedProduct.name}</h2>
                      {(selectedProduct as any).show_date && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1">
                          <Calendar className="w-4 h-4" /> {formatShowDate((selectedProduct as any).show_date)}
                        </p>
                      )}
                    </div>

                    {/* Countdown */}
                    {(selectedProduct as any).show_date && new Date((selectedProduct as any).show_date) > new Date() && (
                      <CountdownTimer targetDate={(selectedProduct as any).show_date} onExpired={() => handleProductExpired(selectedProduct.id)} />
                    )}

                    {/* Description */}
                    {selectedProduct.description && (
                      <div>
                        <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-1">Deskripsi</p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedProduct.description}</p>
                      </div>
                    )}

                    {/* Buy buttons */}
                    <div className="space-y-2.5 pt-2">
                      {(selectedProduct.coin_price || 0) > 0 && (
                        <button onClick={() => openBuyModal('coin')}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold text-base hover:opacity-90 transition-opacity">
                          <Coins className="w-5 h-5" /> Beli dengan {selectedProduct.coin_price} Koin
                        </button>
                      )}
                      {/* QRIS temporarily disabled */}
                    </div>

                    <ReviewSection productId={selectedProduct.id} productName={selectedProduct.name} />
                  </div>
                ) : purchaseDone ? (
                  /* Success */
                  <div className="text-center space-y-4 py-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg">{selectedProduct.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {buyMethod === 'coin'
                          ? `Dibayar dengan ${selectedProduct.coin_price} Koin`
                          : `Total: ${formatPrice(getDiscountedPrice(selectedProduct.price))}`}
                      </p>
                    </div>
                    <a href={getWhatsAppUrl(selectedProduct, buyMethod === 'coin' ? 0 : getDiscountedPrice(selectedProduct.price), buyMethod === 'coin' ? 'Koin' : 'QRIS')}
                      target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-base text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: 'hsl(142, 70%, 45%)' }}>
                      <MessageCircle className="w-5 h-5" /> Hubungi Admin via WhatsApp
                    </a>
                    <button onClick={closeAll} className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium">Tutup</button>
                  </div>
                ) : (
                  /* Payment form */
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setBuyMethod(null)} className="p-1.5 rounded-lg hover:bg-secondary transition">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <h2 className="font-bold text-foreground text-lg">
                        Bayar {buyMethod === 'qris' ? 'QRIS' : 'Koin'}
                      </h2>
                    </div>

                    {buyMethod === 'qris' && (
                      <>
                        <div className="bg-card rounded-xl p-3 text-center border border-border">
                          <p className="text-sm text-muted-foreground mb-2">Scan QRIS untuk membayar</p>
                          <img src={qrisImg} alt="QRIS" width={200} height={200} className="mx-auto rounded-lg" />
                        </div>
                        {/* Voucher */}
                        <div className="glass-card rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Tag className="w-4 h-4 text-primary" />
                            <span className="text-sm font-semibold text-foreground">Voucher</span>
                          </div>
                          {appliedVoucher ? (
                            <div className="flex items-center justify-between bg-green-500/10 rounded-lg px-3 py-2">
                              <span className="text-sm font-medium text-green-600">✅ {appliedVoucher.code} (-{appliedVoucher.discount_percent}%)</span>
                              <button onClick={() => { setAppliedVoucher(null); setVoucherCode(''); }} className="text-xs text-destructive hover:underline">Hapus</button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <input value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())} placeholder="Kode voucher..."
                                className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
                              <button onClick={handleApplyVoucher} disabled={checkingVoucher}
                                className="px-3 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
                                {checkingVoucher ? '...' : 'Pakai'}
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Total */}
                    <div className="glass-card rounded-xl p-4 text-center">
                      <p className="text-sm text-muted-foreground">Total Pembayaran</p>
                      {buyMethod === 'coin' ? (
                        <p className="text-2xl font-extrabold text-accent flex items-center justify-center gap-2">
                          <Coins className="w-6 h-6" /> {selectedProduct.coin_price} Koin
                        </p>
                      ) : (
                        <>
                          {discount > 0 && <p className="text-lg text-muted-foreground line-through">{formatPrice(selectedProduct.price)}</p>}
                          <p className="text-2xl font-extrabold text-gradient">{formatPrice(getDiscountedPrice(selectedProduct.price))}</p>
                          {discount > 0 && <p className="text-xs text-green-600 font-medium mt-1">Hemat {formatPrice(selectedProduct.price - getDiscountedPrice(selectedProduct.price))}!</p>}
                        </>
                      )}
                    </div>

                    <button onClick={handleConfirmPayment} disabled={processing}
                      className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50">
                      {processing ? 'Memproses...' : buyMethod === 'coin' ? 'Bayar dengan Koin ✓' : 'Sudah Bayar ✓'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShowCatalog;
