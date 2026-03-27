import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { motion } from 'framer-motion';

const Cart = () => {
  const { items, removeFromCart, updateQuantity, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  if (!user) { navigate('/login'); return null; }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-extrabold text-gradient mb-6">Keranjang Belanja</h1>
        {items.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">🛒</span>
            <p className="text-muted-foreground">Keranjang kosong</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {items.map((item, i) => (
                <motion.div
                  key={item.product.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card rounded-xl p-4 flex items-center gap-4"
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                    {item.product.image ? (
                      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">🎤</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm truncate">{item.product.name}</h3>
                    <p className="text-primary font-bold text-sm">{formatPrice(item.product.price)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-medium text-foreground">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button onClick={() => removeFromCart(item.product.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </motion.div>
              ))}
            </div>
            <div className="glass-card rounded-xl p-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-foreground">Total</span>
                <span className="text-2xl font-extrabold text-gradient">{formatPrice(total)}</span>
              </div>
              <button
                onClick={() => navigate('/payment')}
                className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition"
              >
                Bayar Sekarang
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Cart;
