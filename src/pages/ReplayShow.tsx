import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Play, Lock, Eye, EyeOff, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';


interface ReplayVideo {
  id: string;
  title: string;
  youtube_url: string;
  created_at: string;
  has_password: boolean;
}

const getYoutubeEmbedUrl = (url: string): string => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1` : '';
};

const ReplayShow = () => {
  const { profile } = useAuth();
  const premiumUntil = (profile as any)?.premium_until ? new Date((profile as any).premium_until) : null;
  const isPremium = !!premiumUntil && premiumUntil.getTime() > Date.now();
  const [videos, setVideos] = useState<ReplayVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});


  useEffect(() => {
    let mounted = true;
    const loadVideos = async () => {
      const { data } = await supabase.rpc('list_replay_videos' as any);
      if (mounted && data) setVideos(data as ReplayVideo[]);
      if (mounted) setLoading(false);
    };
    loadVideos();
    const ch = supabase.channel('replay-rt')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'replay_videos' }, () => loadVideos())
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  const handleUnlock = async (video: ReplayVideo) => {
    const input = passwordInputs[video.id] || '';
    const { data, error } = await supabase.rpc('verify_replay_password', { _video_id: video.id, _password: input });
    if (!error && data === true) {
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
            {videos.map((video, i) => {
              const embedUrl = getYoutubeEmbedUrl(video.youtube_url);
              const isOpen = isPremium || unlocked[video.id] || !video.has_password;
              return (
                <motion.div key={video.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 6) * 0.05 }}
                  className="glass-card rounded-2xl overflow-hidden">
                  <div className="p-5">
                    <h3 className="font-bold text-foreground text-lg mb-1">{video.title}</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {new Date(video.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {isOpen ? (
                      <div className="aspect-video rounded-xl overflow-hidden bg-black">
                        {embedUrl ? (
                          <iframe src={embedUrl} title={video.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                            allowFullScreen className="w-full h-full border-0"
                            referrerPolicy="strict-origin-when-cross-origin" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <p className="text-muted-foreground text-sm">URL video tidak valid</p>
                          </div>
                        )}
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
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default ReplayShow;
