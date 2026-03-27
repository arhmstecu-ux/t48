import { useState } from 'react';
import Header from '@/components/Header';
import { Play, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Tables } from '@/integrations/supabase/types';

const getYoutubeEmbedUrl = (url: string): string => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : '';
};

const ReplayShow = () => {
  const { data: videos, loading } = useRealtimeTable<Tables<'replay_videos'>>('replay_videos', {
    order: { column: 'created_at', ascending: false }
  });
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleUnlock = (video: Tables<'replay_videos'>) => {
    const input = passwordInputs[video.id] || '';
    if (input === video.password) {
      setUnlocked(prev => ({ ...prev, [video.id]: true }));
      setErrors(prev => ({ ...prev, [video.id]: '' }));
    } else {
      setErrors(prev => ({ ...prev, [video.id]: 'Sandi salah!' }));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gradient mb-2">
            <Play className="inline w-8 h-8 mr-2" />Replay Show
          </h1>
          <p className="text-muted-foreground">Tonton ulang pertunjukan JKT48 favoritmu</p>
        </div>

        {loading ? (
          <div className="text-center py-20"><p className="text-muted-foreground">Memuat video...</p></div>
        ) : videos.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-6xl block mb-4">🎬</span>
            <p className="text-muted-foreground">Belum ada video replay.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {videos.map((video, i) => (
              <motion.div key={video.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="glass-card rounded-2xl overflow-hidden">
                <div className="p-5">
                  <h3 className="font-bold text-foreground text-lg mb-1">{video.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    {new Date(video.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {unlocked[video.id] ? (
                    <div className="aspect-video rounded-xl overflow-hidden bg-black">
                      <iframe src={getYoutubeEmbedUrl(video.youtube_url)} title={video.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen className="w-full h-full" />
                    </div>
                  ) : (
                    <div className="aspect-video rounded-xl bg-secondary/50 flex flex-col items-center justify-center gap-4">
                      <Lock className="w-12 h-12 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground font-medium">Video ini dilindungi sandi</p>
                      <div className="flex flex-col items-center gap-2 w-64">
                        <div className="relative w-full">
                          <input type={showPassword[video.id] ? 'text' : 'password'}
                            value={passwordInputs[video.id] || ''}
                            onChange={e => setPasswordInputs(prev => ({ ...prev, [video.id]: e.target.value }))}
                            placeholder="Masukkan sandi..."
                            className="w-full px-4 py-2 pr-10 rounded-lg border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            onKeyDown={e => e.key === 'Enter' && handleUnlock(video)} />
                          <button onClick={() => setShowPassword(prev => ({ ...prev, [video.id]: !prev[video.id] }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
                            {showPassword[video.id] ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                          </button>
                        </div>
                        {errors[video.id] && <p className="text-xs text-destructive">{errors[video.id]}</p>}
                        <button onClick={() => handleUnlock(video)}
                          className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition">
                          Buka Video
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReplayShow;
