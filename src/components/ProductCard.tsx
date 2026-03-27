import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Product = Tables<'products'>;

const ProductCard = ({ product, index }: { product: Product; index: number }) => {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAdd = () => {
    if (!user) { toast.error('Silakan login terlebih dahulu!'); navigate('/login'); return; }
    addToCart(product);
    toast.success(`${product.name} ditambahkan ke keranjang!`);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.15, duration: 0.5 }}
      className="glass-card rounded-2xl overflow-hidden group hover:shadow-xl transition-shadow duration-300">
      <div className="aspect-[4/5] overflow-hidden bg-secondary">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
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
          <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <ShoppingCart className="w-4 h-4" /> Keranjang
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
