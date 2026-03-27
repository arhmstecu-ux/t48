import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Star, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Tables } from '@/integrations/supabase/types';

interface Props {
  productId: string;
  productName: string;
}

const ReviewSection = ({ productId, productName }: Props) => {
  const { user, profile } = useAuth();
  const { data: reviews } = useRealtimeTable<Tables<'reviews'>>('reviews', { column: 'product_id', value: productId });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);

  const hasReviewed = user ? reviews.some(r => r.user_id === user.id) : false;

  const handleSubmit = async () => {
    if (!user || !profile) return;
    if (!comment.trim()) { toast.error('Tulis ulasan terlebih dahulu!'); return; }

    const { error } = await supabase.from('reviews').insert({
      user_id: user.id,
      username: profile.username,
      product_id: productId,
      product_name: productName,
      rating,
      comment: comment.trim(),
    });

    if (error) { toast.error('Gagal mengirim ulasan'); return; }
    setComment('');
    setShowForm(false);
    toast.success('Ulasan berhasil dikirim! ⭐');
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="mt-4 pt-3 border-t border-border/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Ulasan ({reviews.length})</span>
          {avgRating && (
            <span className="flex items-center gap-0.5 text-xs font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">
              <Star className="w-3 h-3 fill-current" /> {avgRating}
            </span>
          )}
        </div>
        {user && !hasReviewed && (
          <button onClick={() => setShowForm(!showForm)} className="text-xs font-medium text-primary hover:underline">
            {showForm ? 'Batal' : 'Tulis Ulasan'}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-secondary/50 rounded-xl p-3 mb-3">
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)} className="p-0.5">
                    <Star className={`w-5 h-5 transition-colors ${s <= rating ? 'text-warning fill-warning' : 'text-muted-foreground'}`} />
                  </button>
                ))}
              </div>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder="Bagikan pengalamanmu..." rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
              <button onClick={handleSubmit}
                className="mt-2 px-4 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity">
                Kirim Ulasan
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {reviews.length > 0 && (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {reviews.map(r => (
            <div key={r.id} className="bg-secondary/30 rounded-lg p-2.5">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                    {r.username[0].toUpperCase()}
                  </span>
                  <span className="text-xs font-semibold text-foreground">{r.username}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-warning fill-warning" />
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{r.comment}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
