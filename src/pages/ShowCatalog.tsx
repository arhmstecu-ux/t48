import { useState } from 'react';
import Header from '@/components/Header';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Search, Tag } from 'lucide-react';
import { toast } from 'sonner';
import ReviewSection from '@/components/ReviewSection';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import qrisImg from '@/assets/qris.jpg';

const ShowCatalog = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherResult, setVoucherResult] = useState<string | null>(null);
  const [checkingVoucher, setCheckingVoucher] = useState(false);

  const { data: products, loading } = useRealtimeTable<Tables<'products'>>('products');

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  const handleAddToCart = (product: Tables<'products'>) => {
    if (!user) { toast.error('Silakan login terlebih dahulu!'); navigate('/login'); return; }
    addToCart(product);
    toast.success(`${product.name} ditambahkan ke keranjang!`);
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
        setVoucherResult(`✅ Voucher valid! Diskon ${voucher.discount_percent}% — Gunakan saat checkout`);
      }
    } catch {
      setVoucherResult('❌ Gagal memeriksa voucher');
    }
    setCheckingVoucher(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gradient mb-2">Katalog Show & PM</h1>
          <p className="text-muted-foreground">Pilih show atau PM JKT48 favoritmu</p>
        </div>

        <div className="glass-card rounded-2xl p-5 mb-6 text-center border-t-4 border-accent">
          <h2 className="font-bold text-foreground text-lg mb-2">Pembayaran QRIS</h2>
          <p className="text-sm text-muted-foreground mb-4">Scan QRIS di bawah untuk pembayaran langsung</p>
          <div className="bg-card rounded-xl p-3 inline-block border border-border">
            <img src={qrisImg} alt="QRIS" width={200} height={200} className="mx-auto rounded-lg" />
          </div>
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
            {filtered.map((product, i) => (
              <motion.div key={product.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl p-5 hover:shadow-xl transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-accent/10 text-accent mb-2">{product.category}</span>
                    <h3 className="font-bold text-foreground text-lg">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-border/50">
                  <span className="text-xl font-extrabold text-gradient">{formatPrice(product.price)}</span>
                  <button onClick={() => handleAddToCart(product)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                    <ShoppingCart className="w-4 h-4" /> Keranjang
                  </button>
                </div>
                <ReviewSection productId={product.id} productName={product.name} />
              </motion.div>
            ))}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-muted-foreground mt-12">Tidak ada produk yang cocok.</p>
        )}
      </main>
    </div>
  );
};

export default ShowCatalog;
