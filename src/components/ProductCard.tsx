import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';
import { openWhatsAppBuy } from '@/lib/wa';
import { supabase } from '@/integrations/supabase/client';

type Product = Tables<'products'>;

const ProductCard = ({ product, index }: { product: Product; index: number }) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleBuy = async () => {
    if (!user) { toast.error('Silakan login terlebih dahulu!'); navigate('/login'); return; }
    // Record purchase for ranking/history (status pending → admin akan konfirmasi)
    try {
      const { data: purchase } = await supabase.from('purchases').insert({
        user_id: user.id, total: product.price, status: 'pending', payment_method: 'qris',
      }).select().single();
      if (purchase) {
        await supabase.from('purchase_items').insert({
          purchase_id: purchase.id, product_id: product.id,
          product_name: product.name, product_price: product.price, quantity: 1,
        });
      }
    } catch { /* tetap arahkan ke WA walau insert gagal */ }
    openWhatsAppBuy({ productName: product.name, price: product.price, username: profile?.username, profileCode: profile?.profile_code });
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 6) * 0.05 }}
      className="glass-card rounded-2xl overflow-hidden group hover:shadow-xl transition-shadow duration-300">
      <div className="aspect-[4/5] overflow-hidden bg-secondary">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="w-full h-full flex items-center justify-center gradient-hero"><span className="text-6xl">🎤</span></div>
        )}
      </div>
      <div className="p-5">
        <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary mb-2">{product.category}</span>
        <h3 className="font-bold text-foreground text-lg mb-1 line-clamp-2">{product.name}</h3>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-extrabold text-gradient">{formatPrice(product.price)}</span>
          <button onClick={handleBuy} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[hsl(142,70%,45%)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
            <MessageCircle className="w-4 h-4" /> Beli via WA
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
