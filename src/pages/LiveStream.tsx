import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Send, MessageCircle, Settings, X, Users, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface LiveComment {
  id: string;
  user_id: string;
  username: string;
  profile_photo: string | null;
  content: string;
  created_at: string;
}

const VIEWER_LIMITS = [150, 230, 400, 600, 750];

const POSITIONS = [
  { top: '10%', left: '5%' },
  { top: '60%', left: '70%' },
  { top: '30%', left: '40%' },
  { top: '75%', left: '15%' },
  { top: '15%', left: '75%' },
  { top: '50%', left: '25%' },
  { top: '40%', left: '60%' },
  { top: '20%', left: '50%' },
  { top: '65%', left: '45%' },
];

const MovingWatermark = () => {
  const [posIndex, setPosIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPosIndex(prev => (prev + 1) % POSITIONS.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const pos = POSITIONS[posIndex];

  return (
    <div
      className="absolute z-30 text-white/30 text-sm font-bold select-none pointer-events-none transition-all duration-1000 ease-in-out"
      style={{ top: pos.top, left: pos.left }}
    >
      @t48id
    </div>
  );
};

const LiveStream = () => {
  const { user, profile, isOwner } = useAuth();
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');
  const [liveTitle, setLiveTitle] = useState('');
  const [liveDesc, setLiveDesc] = useState('');
  const [liveActive, setLiveActive] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [maxViewers, setMaxViewers] = useState(750);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const postPlayerCommand = useCallback((func: string, args: unknown[] = []) => {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) return;

    iframeWindow.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*',
    );
  }, []);

  const handlePlayerLoad = useCallback(() => {
    setIsMuted(true);
    [120, 380, 800].forEach((delay) => {
      window.setTimeout(() => {
        postPlayerCommand('mute');
      }, delay);
    });
  }, [postPlayerCommand]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      postPlayerCommand('unMute');
      postPlayerCommand('setVolume', [100]);
      setIsMuted(false);
      return;
    }

    postPlayerCommand('mute');
    setIsMuted(true);
  }, [isMuted, postPlayerCommand]);

  const fallbackUsername = useMemo(
    () => profile?.username || user?.email?.split('@')[0] || 'User',
    [profile?.username, user?.email],
  );

  const registerViewerHeartbeat = useCallback(async () => {
    if (!user) return;

    await supabase.from('livestream_viewers' as any).upsert({
      user_id: user.id,
      username: fallbackUsername,
      last_seen: new Date().toISOString(),
    } as any, { onConflict: 'user_id' });
  }, [user, fallbackUsername]);

  const loadViewers = useCallback(async () => {
    const cutoff = new Date(Date.now() - 30000).toISOString();
    const { count } = await supabase
      .from('livestream_viewers' as any)
      .select('*', { count: 'exact', head: true })
      .gte('last_seen', cutoff);

    setViewerCount(count || 0);
  }, []);

  // Load settings from app_settings
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('app_settings').select('*').in('key', [
        'livestream_url', 'livestream_title', 'livestream_description',
        'livestream_active', 'livestream_chat_enabled', 'livestream_max_viewers'
      ]);
      if (data) {
        data.forEach(s => {
          if (s.key === 'livestream_url') { setLiveUrl(s.value); setEditUrl(s.value); }
          if (s.key === 'livestream_title') { setLiveTitle(s.value); setEditTitle(s.value); }
          if (s.key === 'livestream_description') { setLiveDesc(s.value); setEditDesc(s.value); }
          if (s.key === 'livestream_active') setLiveActive(s.value === 'true');
          if (s.key === 'livestream_chat_enabled') setChatEnabled(s.value !== 'false');
          if (s.key === 'livestream_max_viewers') setMaxViewers(parseInt(s.value) || 750);
        });
      }
    };
    loadSettings();

    const ch = supabase.channel('livestream-settings')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'app_settings' }, () => loadSettings())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Viewer tracking - heartbeat
  useEffect(() => {
    if (!user || !liveActive) return;

    void registerViewerHeartbeat();
    heartbeatRef.current = setInterval(() => {
      void registerViewerHeartbeat();
    }, 10000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      // Remove viewer on unmount
      void supabase.from('livestream_viewers' as any).delete().eq('user_id', user.id);
    };
  }, [user, liveActive, registerViewerHeartbeat]);

  // Count viewers realtime
  useEffect(() => {
    void loadViewers();
    const interval = setInterval(() => {
      void loadViewers();
    }, 5000);

    const ch = supabase.channel('livestream-viewers')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'livestream_viewers' }, () => {
        void loadViewers();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(ch);
    };
  }, [loadViewers]);

  // Load comments
  useEffect(() => {
    const loadComments = async () => {
      const { data } = await supabase.from('livestream_comments' as any).select('*').order('created_at', { ascending: true }).limit(200);
      if (data) setComments(data as unknown as LiveComment[]);
    };
    loadComments();

    const ch = supabase.channel('livestream-comments')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'livestream_comments' }, (payload: any) => {
        setComments(prev => {
          if (prev.some(c => c.id === payload.new.id)) return prev;
          return [...prev, payload.new as LiveComment];
        });
      })
      .on('postgres_changes' as any, { event: 'DELETE', schema: 'public', table: 'livestream_comments' }, (payload: any) => {
        setComments(prev => prev.filter(c => c.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const lockLandscape = useCallback(async () => {
    const orientation = (screen as Screen & {
      orientation?: { lock?: (mode: 'landscape' | 'portrait') => Promise<void>; unlock?: () => void };
    }).orientation;

    if (orientation?.lock) {
      try {
        await orientation.lock('landscape');
      } catch {
        // ignore: not supported on some devices
      }
    }
  }, []);

  const unlockOrientation = useCallback(() => {
    const orientation = (screen as Screen & {
      orientation?: { unlock?: () => void };
    }).orientation;

    if (orientation?.unlock) {
      try {
        orientation.unlock();
      } catch {
        // ignore: not supported on some devices
      }
    }
  }, []);

  // Fullscreen handling
  useEffect(() => {
    const handleFSChange = () => {
      const isFs = !!document.fullscreenElement || !!(document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement;
      setIsFullscreen(isFs);
      if (!isFs) unlockOrientation();
    };

    document.addEventListener('fullscreenchange', handleFSChange);
    document.addEventListener('webkitfullscreenchange', handleFSChange as EventListener);

    return () => {
      document.removeEventListener('fullscreenchange', handleFSChange);
      document.removeEventListener('webkitfullscreenchange', handleFSChange as EventListener);
    };
  }, [unlockOrientation]);

  const getYouTubeEmbedUrl = (rawUrl: string) => {
    const input = rawUrl.trim();
    if (!input) return '';

    const origin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
    const baseParams = [
      'autoplay=1',
      'mute=1',
      'controls=0',
      'fs=0',
      'modestbranding=1',
      'rel=0',
      'iv_load_policy=3',
      'disablekb=1',
      'playsinline=1',
      'enablejsapi=1',
      origin ? `origin=${origin}` : '',
    ]
      .filter(Boolean)
      .join('&');

    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;

    if (/youtube\.com\/embed\/live_stream/i.test(input)) {
      return `${input}${input.includes('?') ? '&' : '?'}${baseParams}`;
    }

    try {
      const parsed = new URL(withScheme);
      const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');

      if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
        const channelIdFromPath = parsed.pathname.match(/\/channel\/(UC[\w-]+)/)?.[1];
        const channelIdFromQuery = parsed.searchParams.get('channel');
        const channelId = channelIdFromPath || channelIdFromQuery;

        if (channelId && channelId.startsWith('UC')) {
          return `https://www.youtube.com/embed/live_stream?channel=${channelId}&${baseParams}`;
        }
      }
    } catch {
      // ignore channel URL parse errors
    }

    const extractVideoId = (url: string): string | null => {
      if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

      try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');

        if (host === 'youtu.be') {
          return parsed.pathname.split('/').filter(Boolean)[0] || null;
        }

        if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
          if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
          if (parsed.pathname.startsWith('/live/')) return parsed.pathname.split('/live/')[1]?.split('/')[0] || null;
          if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/shorts/')[1]?.split('/')[0] || null;
          if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/embed/')[1]?.split('/')[0] || null;
        }
      } catch {
        // fallback regex below
      }

      const fallback = url.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
      return fallback?.[1] || null;
    };

    const videoId = extractVideoId(withScheme);
    if (!videoId) return '';

    return `https://www.youtube.com/embed/${videoId}?${baseParams}`;
  };

  const embedUrl = useMemo(() => getYouTubeEmbedUrl(liveUrl), [liveUrl]);

  const handleSendComment = async () => {
    if (!newComment.trim() || sending || !user) return;
    const commentText = newComment.trim();
    const tempId = `temp-${Date.now()}`;

    setComments(prev => [
      ...prev,
      {
        id: tempId,
        user_id: user.id,
        username: fallbackUsername,
        profile_photo: profile?.profile_photo ?? null,
        content: commentText,
        created_at: new Date().toISOString(),
      },
    ]);
    setNewComment('');
    setSending(true);

    try {
      const result: any = await supabase.from('livestream_comments' as any).insert({
        user_id: user.id,
        username: fallbackUsername,
        profile_photo: profile?.profile_photo ?? null,
        content: commentText,
      } as any).select('*').single();

      const { data, error } = result;

      if (error) {
        setComments(prev => prev.filter(c => c.id !== tempId));
        toast.error('Gagal mengirim komentar');
        setNewComment(commentText);
        return;
      }

      if (data) {
        setComments(prev => {
          const withoutTemp = prev.filter(c => c.id !== tempId);
          if (withoutTemp.some(c => c.id === data.id)) return withoutTemp;
          return [...withoutTemp, data as LiveComment];
        });
      }
    } catch {
      setComments(prev => prev.filter(c => c.id !== tempId));
      toast.error('Koneksi chat bermasalah, coba lagi');
      setNewComment(commentText);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (id: string) => {
    setComments(prev => prev.filter(c => c.id !== id));
    await supabase.from('livestream_comments' as any).delete().eq('id', id);
  };

  const handleSaveSettings = async () => {
    await Promise.all([
      supabase.from('app_settings').upsert({ key: 'livestream_url', value: editUrl }),
      supabase.from('app_settings').upsert({ key: 'livestream_title', value: editTitle }),
      supabase.from('app_settings').upsert({ key: 'livestream_description', value: editDesc }),
    ]);
    toast.success('Pengaturan disimpan!');
    setShowSettings(false);
  };

  const handleToggleLive = async () => {
    const newVal = !liveActive;
    await supabase.from('app_settings').upsert({ key: 'livestream_active', value: String(newVal) });
    if (!newVal) {
      // Clear viewers when closing live
      await supabase.from('livestream_viewers' as any).delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
    }
    toast.success(newVal ? 'Live diaktifkan!' : 'Live ditutup!');
  };

  const handleToggleChat = async () => {
    const newVal = !chatEnabled;
    await supabase.from('app_settings').upsert({ key: 'livestream_chat_enabled', value: String(newVal) });
    toast.success(newVal ? 'Chat diaktifkan!' : 'Chat dinonaktifkan!');
  };

  const handleSetMaxViewers = async (limit: number) => {
    await supabase.from('app_settings').upsert({ key: 'livestream_max_viewers', value: String(limit) });
    setMaxViewers(limit);
    toast.success(`Batas penonton: ${limit}`);
  };

  const handleClearComments = async () => {
    await supabase.from('livestream_comments' as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setComments([]);
    toast.success('Semua komentar dihapus!');
  };

  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return;

    const el = videoContainerRef.current as HTMLDivElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };

    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      msExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
    };

    if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      else if (el.msRequestFullscreen) await el.msRequestFullscreen();

      await lockLandscape();
    } else {
      unlockOrientation();
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      else if (doc.msExitFullscreen) await doc.msExitFullscreen();
    }
  };

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <Radio className="w-16 h-16 text-destructive mx-auto mb-4 animate-pulse" />
          <h1 className="text-2xl font-extrabold text-gradient mb-3">Livestreaming Free</h1>
          <p className="text-muted-foreground mb-6">Login terlebih dahulu untuk menonton livestreaming</p>
          <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-bold">
            Login Sekarang
          </Link>
        </main>
      </div>
    );
  }

  // Viewer limit reached
  if (!isOwner && liveActive && viewerCount >= maxViewers) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-gradient mb-3">Penonton Penuh</h1>
          <p className="text-muted-foreground">Livestream sudah mencapai batas penonton ({maxViewers}). Coba lagi nanti!</p>
        </main>
      </div>
    );
  }

  // Live not active (non-owner)
  if (!liveActive && !isOwner) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <Radio className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-gradient mb-3">Tidak Ada Live</h1>
          <p className="text-muted-foreground">Saat ini tidak ada livestreaming yang sedang berlangsung. Cek lagi nanti!</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-4 max-w-4xl">
        {/* Admin Controls */}
        {isOwner && (
          <div className="glass-card rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleToggleLive} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${liveActive ? 'bg-destructive text-destructive-foreground' : 'gradient-primary text-primary-foreground'}`}>
                {liveActive ? '🔴 Tutup Live' : '🟢 Buka Live'}
              </button>
              <button onClick={handleToggleChat} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${chatEnabled ? 'bg-warning/20 text-warning' : 'bg-secondary text-secondary-foreground'}`}>
                {chatEnabled ? '💬 Chat ON' : '💬 Chat OFF'}
              </button>
              <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium">
                <Settings className="w-3.5 h-3.5 inline mr-1" /> Pengaturan
              </button>
              <button onClick={handleClearComments} className="px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
                🗑️ Hapus Semua Chat
              </button>
            </div>
            
            {showSettings && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 pt-3 border-t border-border/50 space-y-2">
                <input value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="URL YouTube Livestream..." className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Judul Livestream..." className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Deskripsi..." rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" />
                
                {/* Max viewers setting */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Batas Penonton Maksimal:</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {VIEWER_LIMITS.map(limit => (
                      <button key={limit} onClick={() => handleSetMaxViewers(limit)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition ${maxViewers === limit ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                        {limit}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={handleSaveSettings} className="px-4 py-1.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">Simpan</button>
              </motion.div>
            )}
          </div>
        )}

        {/* Title + Viewer count */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1 justify-between">
            <div className="flex items-center gap-2">
              {liveActive && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold"><span className="w-2 h-2 rounded-full bg-destructive-foreground animate-pulse" /> LIVE</span>}
              <h1 className="text-xl font-extrabold text-foreground">{liveTitle || 'Livestreaming'}</h1>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span className="text-sm font-semibold">{viewerCount}</span>
            </div>
          </div>
          {liveDesc && <p className="text-sm text-muted-foreground">{liveDesc}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Video Player - Fully Secured */}
          <div className="lg:col-span-2">
            <div ref={videoContainerRef} className={`relative w-full overflow-hidden bg-black ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-2xl'}`} style={isFullscreen ? {} : { paddingBottom: '56.25%' }}>
              {liveUrl ? (
                embedUrl ? (
                <>
                  <iframe
                    ref={iframeRef}
                    src={embedUrl}
                    onLoad={handlePlayerLoad}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    style={{ border: 'none' }}
                  />
                  {/* Block all clicks on video */}
                  <div className="absolute inset-0 z-10" />

                  {/* Transparent gradient overlays to soften YouTube UI edges */}
                  <div className="absolute top-0 left-0 right-0 h-12 z-20 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }} />
                  <div className="absolute bottom-0 left-0 right-0 h-12 z-20 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />

                  {/* @t48id moving watermark */}
                  <MovingWatermark />

                  <div className="absolute top-2 right-2 z-40 flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition"
                      aria-label={isMuted ? 'Nyalakan suara' : 'Matikan suara'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition"
                      aria-label={isFullscreen ? 'Keluar fullscreen' : 'Masuk fullscreen'}
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                  </div>
                </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center px-4">
                    <div className="text-center">
                      <p className="text-destructive text-sm font-semibold">URL livestream YouTube tidak valid</p>
                      <p className="text-xs text-muted-foreground mt-1">Gunakan link format watch, youtu.be, live, shorts, atau embed.</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Radio className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Menunggu livestream...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Chat */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-2xl flex flex-col h-[400px] lg:h-full">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" /> Live Chat
                </h3>
                <span className="text-xs text-muted-foreground">{comments.length} pesan</span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {comments.map(c => (
                  <div key={c.id} className="flex gap-2 group">
                    <div className="flex-shrink-0">
                      {c.profile_photo ? (
                        <img src={c.profile_photo} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                          {c.username[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-primary">{c.username}</span>
                      <span className="text-xs text-foreground ml-1.5">{c.content}</span>
                    </div>
                    {isOwner && (
                      <button onClick={() => handleDeleteComment(c.id)} className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition">
                        <X className="w-3 h-3 text-destructive" />
                      </button>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              {chatEnabled ? (
                <div className="px-3 py-2 border-t border-border/50">
                  <div className="flex gap-2">
                    <input
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment(); } }}
                      placeholder="Tulis komentar..."
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs"
                      maxLength={200}
                    />
                    <button onClick={handleSendComment} disabled={sending || !newComment.trim()} className="px-3 py-2 rounded-lg gradient-primary text-primary-foreground disabled:opacity-40 transition">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-3 border-t border-border/50 text-center">
                  <p className="text-xs text-muted-foreground">💬 Chat dinonaktifkan oleh admin</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveStream;
