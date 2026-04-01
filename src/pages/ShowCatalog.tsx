import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Tag, Coins, CreditCard, MessageCircle, X, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import ReviewSection from '@/components/ReviewSection';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import qrisImg from '@/assets/qris.jpg';
import PurchaseAnimation from '@/components/PurchaseAnimation';

const ShowCatalog = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [coinBalance, setCoinBalance] = useState(0);

  // Direct buy state
  const [buyingProduct, setBuyingProduct] = useState<(Tables<'products'> & { coin_price?: number }) | null>(null);
  const [buyMethod, setBuyMethod] = useState<'qris' | 'coin' | null>(null);
  const [processing, setProcessing] = useState(false);
  const [purchaseDone, setPurchaseDone] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  // Voucher
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherResult, setVoucherResult] = useState<string | null>(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{ id: string; code: string; discount_percent: number } | null>(null);

  const { data: products, loading } = useRealtimeTable<Tables<'products'> & { coin_price?: number }>('products');

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

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  const discount = appliedVoucher?.discount_percent || 0;
  const getDiscountedPrice = (price: number) => Math.round(price * (1 - discount / 100));

  const getWhatsAppUrl = (product: Tables<'products'>, finalPrice: number, method: string) => {
    const username = profile?.username || 'User';
    const voucherText = appliedVoucher ? ` (Voucher: ${appliedVoucher.code}, diskon ${appliedVoucher.discount_percent}%)` : '';
    const message = `Halo admin, saya ${username} sudah melakukan pembayaran ${method} sebesar ${formatPrice(finalPrice)} untuk: ${product.name}.${voucherText} Mohon konfirmasi pembelian saya. Terima kasih!`;
    return `https://wa.me/6282135963767?text=${encodeURIComponent(message)}`;
  };

  const openBuyModal = (product: Tables<'products'> & { coin_price?: number }, method: 'qris' | 'coin') => {
    if (!user) { toast.error('Silakan login terlebih dahulu!'); navigate('/login'); return; }
    if (method === 'coin') {
      const coinPrice = product.coin_price || 0;
      if (coinPrice <= 0) { toast.error('Produk ini tidak bisa dibeli dengan koin'); return; }
      if (coinBalance < coinPrice) { toast.error(`Koin tidak cukup! Butuh ${coinPrice} koin, saldo: ${coinBalance}`); return; }
    }
    setBuyingProduct(product);
    setBuyMethod(method);
    setPurchaseDone(false);
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherResult(null);
  };

  const closeBuyModal = () => {
    setBuyingProduct(null);
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
    if (!user || !buyingProduct || !buyMethod || processing) return;
    setProcessing(true);
    try {
      if (buyMethod === 'coin') {
        const coinPrice = buyingProduct.coin_price || 0;
        await supabase.from('coin_balances').update({ balance: coinBalance - coinPrice }).eq('user_id', user.id);
        await supabase.from('coin_transactions').insert({ user_id: user.id, amount: -coinPrice, type: 'purchase', description: `Beli: ${buyingProduct.name}` });
        const { data: purchase } = await supabase.from('purchases').insert({
          user_id: user.id, total: 0, status: 'completed', payment_method: 'coin',
        }).select().single();
        if (purchase) {
          await supabase.from('purchase_items').insert({
            purchase_id: purchase.id, product_id: buyingProduct.id, product_name: buyingProduct.name, product_price: coinPrice, quantity: 1,
          });
        }
        setCoinBalance(prev => prev - coinPrice);
      } else {
        const finalPrice = getDiscountedPrice(buyingProduct.price);
        const { data: purchase } = await supabase.from('purchases').insert({
          user_id: user.id, total: finalPrice, status: 'pending', payment_method: 'qris',
        }).select().single();
        if (purchase) {
          await supabase.from('purchase_items').insert({
            purchase_id: purchase.id, product_id: buyingProduct.id, product_name: buyingProduct.name, product_price: buyingProduct.price, quantity: 1,
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
      toast.success(`${buyingProduct.name} berhasil dibeli! 🎉`);
    } catch {
      toast.error('Gagal memproses pembayaran');
    }
    setProcessing(false);
  };

  const handleCheckVoucher = async () => {
    if (!voucherCode.trim() || checkingVoucher) return;
    setCheckingVoucher(true);
    try {
      const { data: voucher } = await supabase
        .from('vouchers').select('*').eq('code', voucherCode.trim().toUpperCase()).eq('is_active', true).maybeSingle();
      if (!voucher) {
        setVoucherResult('❌ Kode voucher tidak valid');
      } else if (voucher.used_count >= voucher.max_uses) {
        setVoucherResult('❌ Voucher sudah habis digunakan');
      } else if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
        setVoucherResult('❌ Voucher sudah kedaluwarsa');
      } else {
        setVoucherResult(`✅ Voucher valid! Diskon ${voucher.discount_percent}%`);
      }
    } catch {
      setVoucherResult('❌ Gagal memeriksa voucher');
    }
    setCheckingVoucher(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PurchaseAnimation show={showAnimation} onComplete={() => {}} />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gradient mb-2">Katalog Show & PM</h1>
          <p className="text-muted-foreground">Pilih show atau PM JKT48 favoritmu</p>
          {user && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-sm font-medium">
              <Coins className="w-4 h-4" /> Saldo: {coinBalance} Koin
            </div>
          )}
        </div>

        {/* Voucher Check */}
        <div className="glass-card rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">Cek Kode Voucher</h3>
          </div>
          <div className="flex gap-2">
            <input value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())} placeholder="Masukkan kode voucher..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm" />
            <button onClick={handleCheckVoucher} disabled={checkingVoucher}
              className="px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
              {checkingVoucher ? '...' : 'Cek'}
            </button>
          </div>
          {voucherResult && (
            <p className={`text-sm mt-2 font-medium ${voucherResult.startsWith('✅') ? 'text-success' : 'text-destructive'}`}>
              {voucherResult}
            </p>
          )}
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari show atau PM..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>

        {loading ? (
          <div className="text-center py-12"><p className="text-muted-foreground">Memuat produk...</p></div>
        ) : (
          <div className="space-y-4">
            {filtered.map((product, i) => {
              const coinPrice = product.coin_price || 0;
              return (
                <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="glass-card rounded-2xl p-5 hover:shadow-xl transition-shadow">
                  <div className="flex-1 mb-3">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-accent/10 text-accent mb-2">{product.category}</span>
                    <h3 className="font-bold text-foreground text-lg">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                  </div>
                  <div className="flex flex-col gap-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xl font-extrabold text-gradient">{formatPrice(product.price)}</span>
                      {coinPrice > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 text-accent text-sm font-bold">
                          <Coins className="w-3.5 h-3.5" /> {coinPrice} Koin
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => openBuyModal(product, 'qris')}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                        <CreditCard className="w-4 h-4" /> Beli QRIS
                      </button>
                      {coinPrice > 0 && (
                        <button onClick={() => openBuyModal(product, 'coin')}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-accent-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                          <Coins className="w-4 h-4" /> Beli Koin
                        </button>
                      )}
                    </div>
                  </div>
                  <ReviewSection productId={product.id} productName={product.name} />
                </motion.div>
              );
            })}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground mt-12">Tidak ada produk yang cocok.</p>
        )}
      </main>

      {/* Direct Buy Modal */}
      <AnimatePresence>
        {buyingProduct && buyMethod && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={closeBuyModal}>
            <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              className="w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-bold text-foreground text-lg">
                  {purchaseDone ? 'Pembayaran Berhasil!' : `Beli dengan ${buyMethod === 'qris' ? 'QRIS' : 'Koin'}`}
                </h2>
                <button onClick={closeBuyModal} className="p-1 rounded-lg hover:bg-secondary transition"><X className="w-5 h-5 text-muted-foreground" /></button>
              </div>

              <div className="p-5">
                {purchaseDone ? (
                  /* Success state with WhatsApp button */
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-lg">{buyingProduct.name}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {buyMethod === 'coin'
                          ? `Dibayar dengan ${buyingProduct.coin_price} Koin`
                          : `Total: ${formatPrice(getDiscountedPrice(buyingProduct.price))}`}
                      </p>
                    </div>
                    <a href={getWhatsAppUrl(buyingProduct, buyMethod === 'coin' ? 0 : getDiscountedPrice(buyingProduct.price), buyMethod === 'coin' ? 'Koin' : 'QRIS')}
                      target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-base text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: 'hsl(142, 70%, 45%)' }}>
                      <MessageCircle className="w-5 h-5" /> Hubungi Admin via WhatsApp
                    </a>
                    <button onClick={closeBuyModal} className="w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium">
                      Tutup
                    </button>
                  </div>
                ) : (
                  /* Payment form */
                  <div className="space-y-4">
                    {/* Product info */}
                    <div className="glass-card rounded-xl p-4">
                      <p className="font-bold text-foreground">{buyingProduct.name}</p>
                      <p className="text-sm text-muted-foreground">{buyingProduct.description}</p>
                    </div>

                    {buyMethod === 'qris' && (
                      <>
                        {/* QRIS image */}
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
                      <p className="text-sm text-muted-foreground">Total</p>
                      {buyMethod === 'coin' ? (
                        <p className="text-2xl font-extrabold text-accent flex items-center justify-center gap-2">
                          <Coins className="w-6 h-6" /> {buyingProduct.coin_price} Koin
                        </p>
                      ) : (
                        <>
                          {discount > 0 && <p className="text-lg text-muted-foreground line-through">{formatPrice(buyingProduct.price)}</p>}
                          <p className="text-2xl font-extrabold text-gradient">{formatPrice(getDiscountedPrice(buyingProduct.price))}</p>
                          {discount > 0 && <p className="text-xs text-green-600 font-medium mt-1">Hemat {formatPrice(buyingProduct.price - getDiscountedPrice(buyingProduct.price))}!</p>}
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
