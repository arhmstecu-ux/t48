import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SLIDER_KEYS = ['home_slider_1', 'home_slider_2', 'home_slider_3', 'home_slider_4'];

const HomeSlider = () => {
  const [images, setImages] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);

  const loadImages = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('*').in('key', SLIDER_KEYS);
    if (data) {
      const imgs = SLIDER_KEYS.map(key => data.find(d => d.key === key)?.value || '').filter(Boolean);
      setImages(imgs);
    }
  }, []);

  useEffect(() => {
    loadImages();
    // Realtime updates
    const channel = supabase
      .channel('slider-realtime')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'app_settings' }, () => loadImages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadImages]);

  // Auto-play
  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="relative rounded-2xl overflow-hidden mb-8 aspect-[16/7] bg-secondary">
      <AnimatePresence mode="wait">
        <motion.img
          key={current}
          src={images[current]}
          alt={`Slide ${current + 1}`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>

      {images.length > 1 && (
        <>
          <button onClick={() => setCurrent(prev => (prev - 1 + images.length) % images.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-foreground/50 transition z-10">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrent(prev => (prev + 1) % images.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-foreground/30 backdrop-blur-sm flex items-center justify-center text-primary-foreground hover:bg-foreground/50 transition z-10">
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === current ? 'bg-primary-foreground w-4' : 'bg-primary-foreground/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HomeSlider;
