import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import PurchaseAnimation from '@/components/PurchaseAnimation';
import qrisImg from '@/assets/qris.jpg';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Tag, MessageCircle } from 'lucide-react';

const Payment = () => {
  const { total, completePurchase, items } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [payMethod, setPayMethod] = useState<'qris' | 'dana' | 'gopay'>('qris');
  const [processing, setProcessing] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [appliedVoucher, setAppliedVoucher] = useState<{ id: string; code: string; discount_percent: number } | null>(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  const discountedTotal = Math.round(total * (1 - discount / 100));

  const getWhatsAppUrl = () => {
    const itemNames = items.map(i => `${i.product.name} x${i.quantity}`).join(', ');
    const methodLabel = payMethod === 'qris' ? 'QRIS' : payMethod === 'dana' ? 'DANA' : 'GoPay';
    const username = profile?.username || 'User';
    const voucherText = appliedVoucher ? ` (Voucher: ${appliedVoucher.code}, diskon ${appliedVoucher.discount_percent}%)` : '';
    const message = `Halo admin, saya ${username} sudah melakukan pembayaran ${methodLabel} sebesar ${formatPrice(discountedTotal)} untuk: ${itemNames}.${voucherText} Mohon konfirmasi pembelian saya. Terima kasih!`;
    return `https://wa.me/6282135963767?text=${encodeURIComponent(message)}`;
  };

  const redirectToWhatsApp = () => {
    window.location.href = getWhatsAppUrl();
  };

  useEffect(() => {
    if (!showSuccess) return;
    const timer = setTimeout(() => {
      redirectToWhatsApp();
    }, 2000);
    return () => clearTimeout(timer);
  }, [showSuccess]);

  if (!user || items.length === 0) { navigate('/cart'); return null; }

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim() || applyingVoucher) return;
    setApplyingVoucher(true);
    try {
      const { data: voucher, error } = await supabase
        .from('vouchers').select('*').eq('code', voucherCode.trim().toUpperCase()).eq('is_active', true).maybeSingle();
      if (error || !voucher) { toast.error('Kode voucher tidak valid!'); setApplyingVoucher(false); return; }
      if (voucher.used_count >= voucher.max_uses) { toast.error('Voucher sudah habis!'); setApplyingVoucher(false); return; }
      if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) { toast.error('Voucher sudah kedaluwarsa!'); setApplyingVoucher(false); return; }
      const { data: usage } = await supabase.from('voucher_usage').select('id').eq('voucher_id', voucher.id).eq('user_id', user.id).maybeSingle();
      if (usage) { toast.error('Kamu sudah pernah menggunakan voucher ini!'); setApplyingVoucher(false); return; }
      setDiscount(voucher.discount_percent);
      setAppliedVoucher({ id: voucher.id, code: voucher.code, discount_percent: voucher.discount_percent });
      toast.success(`Voucher ${voucher.code} berhasil! Diskon ${voucher.discount_percent}%`);
    } catch { toast.error('Gagal memvalidasi voucher'); }
    setApplyingVoucher(false);
  };

  const removeVoucher = () => { setDiscount(0); setAppliedVoucher(null); setVoucherCode(''); };

  const paymentInfo = {
    qris: { label: 'QRIS', image: qrisImg, desc: 'Scan QR code di bawah untuk membayar' },
    dana: { label: 'DANA', image: null, desc: 'Transfer ke nomor DANA berikut', number: '082234650836' },
    gopay: { label: 'GoPay', image: null, desc: 'Transfer ke nomor GoPay berikut', number: '082228075442' },
  };
  const info = paymentInfo[payMethod];

  const handleConfirmPayment = async () => {
    if (processing) return;
    setProcessing(true);
    try {
      await completePurchase(user.id, payMethod, discountedTotal);
      if (appliedVoucher) {
        const { data: latestPurchase } = await supabase.from('purchases').select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
        if (latestPurchase) {
          await supabase.from('voucher_usage').insert({ voucher_id: appliedVoucher.id, user_id: user.id, purchase_id: latestPurchase.id });
        }
      }
      setShowSuccess(true);
    } catch { toast.error('Gagal memproses pembayaran'); }
    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PurchaseAnimation show={showSuccess} onComplete={() => {}} />
      <main className="container mx-auto px-4 py-8 max-w-md">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex gap-2 mb-6">
            {(['qris', 'dana', 'gopay'] as const).map(m => (
              <button key={m} onClick={() => setPayMethod(m)}
                className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 ${payMethod === m ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                {m === 'qris' ? 'QRIS' : m === 'dana' ? 'DANA' : 'GoPay'}
              </button>
            ))}
          </div>

          <div className="glass-card rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-extrabold text-gradient mb-2">Pembayaran {info.label}</h1>
            <p className="text-muted-foreground mb-6">{info.desc}</p>

            {payMethod === 'qris' ? (
              <div className="bg-card rounded-xl p-4 mb-4 inline-block border border-border">
                <img src={qrisImg} alt="QRIS Payment" width={250} height={250} className="mx-auto rounded-lg" />
              </div>
            ) : (
              <div className="glass-card rounded-xl p-6 mb-4">
                <p className="text-sm text-muted-foreground mb-2">Nomor {info.label}</p>
                <p className="text-3xl font-extrabold text-gradient tracking-wider">{(info as any).number}</p>
                <p className="text-xs text-muted-foreground mt-2">a.n. T48ID Store</p>
                <button onClick={() => { navigator.clipboard.writeText((info as any).number); toast.success('Nomor disalin!'); }}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-all">
                  📋 Salin Nomor
                </button>
              </div>
            )}

            {/* Voucher section */}
            <div className="glass-card rounded-xl p-4 mb-4 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Kode Voucher</span>
              </div>
              {appliedVoucher ? (
                <div className="flex items-center justify-between bg-success/10 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium text-success">✅ {appliedVoucher.code} (-{appliedVoucher.discount_percent}%)</span>
                  <button onClick={removeVoucher} className="text-xs text-destructive hover:underline">Hapus</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())} placeholder="Masukkan kode..."
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
                  <button onClick={handleApplyVoucher} disabled={applyingVoucher}
                    className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-50 transition-all">
                    {applyingVoucher ? '...' : 'Pakai'}
                  </button>
                </div>
              )}
            </div>

            <div className="glass-card rounded-xl p-4 mb-6">
              <p className="text-sm text-muted-foreground">Total Pembayaran</p>
              {discount > 0 && <p className="text-lg text-muted-foreground line-through">{formatPrice(total)}</p>}
              <p className="text-3xl font-extrabold text-gradient">{formatPrice(discountedTotal)}</p>
              {discount > 0 && <p className="text-xs text-success font-medium mt-1">Hemat {formatPrice(total - discountedTotal)}!</p>}
            </div>

            <button onClick={handleConfirmPayment} disabled={processing}
              className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50">
              {processing ? 'Memproses...' : 'Sudah Bayar ✓'}
            </button>

            {showSuccess && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-3">
                <div className="glass-card rounded-xl p-4 bg-success/10 border border-success/20">
                  <p className="text-success font-bold text-lg mb-1">✅ Pembayaran Tercatat!</p>
                  <p className="text-sm text-muted-foreground">Kirim bukti pembayaran ke admin untuk konfirmasi</p>
                </div>
                <button onClick={redirectToWhatsApp}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-base text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: 'hsl(142, 70%, 45%)' }}>
                  <MessageCircle className="w-5 h-5" /> Hubungi Admin via WhatsApp
                </button>
              </motion.div>
            )}

            <p className="text-xs text-muted-foreground mt-4">
              ⚠️ Setelah konfirmasi, kamu akan <strong>otomatis diarahkan ke WhatsApp admin</strong> untuk verifikasi pembayaran.
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Payment;
