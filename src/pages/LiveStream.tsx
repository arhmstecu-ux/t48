import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Send, MessageCircle, Settings, X, Users, Maximize, Minimize, Volume2, VolumeX, Ban, Shield, Pin, Link as LinkIcon, Play, MonitorSmartphone } from 'lucide-react';
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

const MovingWatermark = ({ profileCode }: { profileCode?: string }) => {
  const [posIndex, setPosIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPosIndex(prev => (prev + 1) % POSITIONS.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const pos = POSITIONS[posIndex];
  const wmText = profileCode ? `T4-${profileCode}` : '@t48id';

  return (
    <div
      className="absolute z-30 text-white/30 text-sm font-bold select-none pointer-events-none transition-all duration-1000 ease-in-out"
      style={{ top: pos.top, left: pos.left }}
    >
      {wmText}
    </div>
  );
};

// Render text with clickable links
const RenderWithLinks = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <>
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all hover:opacity-80">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

const LiveStream = () => {
  const { user, profile, isOwner } = useAuth();
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [ownerUserIds, setOwnerUserIds] = useState<Set<string>>(new Set());
  const [moderatorUserIds, setModeratorUserIds] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [liveUrl, setLiveUrl] = useState('');
  const [liveTitle, setLiveTitle] = useState('');
  const [liveDesc, setLiveDesc] = useState('');
  const [liveLogo, setLiveLogo] = useState('');
  const [liveActive, setLiveActive] = useState(false);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [editUrl, setEditUrl] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [maxViewers, setMaxViewers] = useState(750);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [resolution, setResolution] = useState<string>('auto');
  const [showResMenu, setShowResMenu] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [blacklistedCodes, setBlacklistedCodes] = useState<Set<string>>(new Set());
  const [moderatorCodes, setModeratorCodes] = useState<Set<string>>(new Set());
  const [blacklistInput, setBlacklistInput] = useState('');
  const [modInput, setModInput] = useState('');
  // Pinned message
  const [pinnedMessage, setPinnedMessage] = useState<string>('');
  const [editPinnedMessage, setEditPinnedMessage] = useState('');

  const postPlayerCommand = useCallback((func: string, args: unknown[] = []) => {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) return;
    iframeWindow.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
  }, []);

  const handlePlayerLoad = useCallback(() => {
    setIsMuted(true);
    [120, 380, 800].forEach((delay) => {
      window.setTimeout(() => { postPlayerCommand('mute'); }, delay);
    });
  }, [postPlayerCommand]);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      postPlayerCommand('unMute');
      postPlayerCommand('setVolume', [100]);
      setIsMuted(false);
    } else {
      postPlayerCommand('mute');
      setIsMuted(true);
    }
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

  // Load settings
  useEffect(() => {
    const loadOwners = async () => {
      const { data } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
      if (data) setOwnerUserIds(new Set(data.map(r => r.user_id)));
    };
    const loadModeratorUserIds = async () => {
      const { data: mods } = await supabase.from('livestream_moderators').select('profile_code');
      if (mods && mods.length > 0) {
        const codes = (mods as any[]).map(m => m.profile_code);
        const { data: profiles } = await supabase.from('profiles').select('user_id, profile_code').in('profile_code', codes);
        if (profiles) setModeratorUserIds(new Set(profiles.map(p => p.user_id)));
      }
    };
    loadOwners();
    loadModeratorUserIds();
    const loadSettings = async () => {
      const { data } = await supabase.from('app_settings').select('*').in('key', [
        'livestream_url', 'livestream_title', 'livestream_description',
        'livestream_active', 'livestream_chat_enabled', 'livestream_max_viewers',
        'livestream_logo', 'livestream_pinned_message'
      ]);
      if (data) {
        data.forEach(s => {
          if (s.key === 'livestream_url') { setLiveUrl(s.value); setEditUrl(s.value); }
          if (s.key === 'livestream_title') { setLiveTitle(s.value); setEditTitle(s.value); }
          if (s.key === 'livestream_description') { setLiveDesc(s.value); setEditDesc(s.value); }
          if (s.key === 'livestream_active') setLiveActive(s.value === 'true');
          if (s.key === 'livestream_chat_enabled') setChatEnabled(s.value !== 'false');
          if (s.key === 'livestream_max_viewers') setMaxViewers(parseInt(s.value) || 750);
          if (s.key === 'livestream_logo') { setLiveLogo(s.value); setEditLogo(s.value); }
          if (s.key === 'livestream_pinned_message') { setPinnedMessage(s.value); setEditPinnedMessage(s.value); }
        });
      }
    };
    loadSettings();

    const ch = supabase.channel('livestream-settings')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'app_settings' }, () => loadSettings())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Load blacklist & moderators
  useEffect(() => {
    const loadBlacklist = async () => {
      const { data } = await supabase.from('livestream_blacklist' as any).select('profile_code');
      if (data) setBlacklistedCodes(new Set((data as any[]).map(d => d.profile_code)));
    };
    const loadMods = async () => {
      const { data } = await supabase.from('livestream_moderators' as any).select('profile_code');
      if (data) setModeratorCodes(new Set((data as any[]).map(d => d.profile_code)));
    };
    loadBlacklist();
    loadMods();
    const ch = supabase.channel('live-access-rt')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'livestream_blacklist' }, () => loadBlacklist())
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'livestream_moderators' }, () => loadMods())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleAddBlacklist = async () => {
    const code = blacklistInput.trim().toUpperCase();
    if (!code) return;
    await supabase.from('livestream_blacklist' as any).insert({ profile_code: code } as any);
    setBlacklistInput('');
    toast.success(`Kode ${code} di-blacklist dari live!`);
  };
  const handleRemoveBlacklist = async (code: string) => {
    await supabase.from('livestream_blacklist' as any).delete().eq('profile_code', code);
    toast.success(`Blacklist ${code} dicabut!`);
  };
  const handleAddMod = async () => {
    const code = modInput.trim().toUpperCase();
    if (!code) return;
    await supabase.from('livestream_moderators' as any).insert({ profile_code: code } as any);
    setModInput('');
    toast.success(`Kode ${code} dijadikan moderator!`);
  };
  const handleRemoveMod = async (code: string) => {
    await supabase.from('livestream_moderators' as any).delete().eq('profile_code', code);
    toast.success(`Moderator ${code} dicabut!`);
  };

  // Viewer tracking
  useEffect(() => {
    if (!user || !liveActive) return;
    void registerViewerHeartbeat();
    heartbeatRef.current = setInterval(() => { void registerViewerHeartbeat(); }, 10000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      void supabase.from('livestream_viewers' as any).delete().eq('user_id', user.id);
    };
  }, [user, liveActive, registerViewerHeartbeat]);

  // Count viewers realtime
  useEffect(() => {
    void loadViewers();
    const interval = setInterval(() => { void loadViewers(); }, 5000);
    const ch = supabase.channel('livestream-viewers')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'livestream_viewers' }, () => { void loadViewers(); })
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(ch); };
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
    const orientation = (screen as any).orientation;
    if (orientation?.lock) { try { await orientation.lock('landscape'); } catch {} }
  }, []);

  const unlockOrientation = useCallback(() => {
    const orientation = (screen as any).orientation;
    if (orientation?.unlock) { try { orientation.unlock(); } catch {} }
  }, []);

  useEffect(() => {
    const handleFSChange = () => {
      const isFs = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
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
      'autoplay=1', 'mute=1', 'controls=0', 'fs=0', 'modestbranding=1',
      'rel=0', 'iv_load_policy=3', 'disablekb=1', 'playsinline=1', 'enablejsapi=1',
      origin ? `origin=${origin}` : '',
    ].filter(Boolean).join('&');

    const withScheme = /^https?:\/\//i.test(input) ? input : `https://${input}`;

    if (/youtube\.com\/embed\/live_stream/i.test(input)) {
      return `${input}${input.includes('?') ? '&' : '?'}${baseParams}`;
    }

    try {
      const parsed = new URL(withScheme);
      const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');
      if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
        const channelId = parsed.pathname.match(/\/channel\/(UC[\w-]+)/)?.[1] || parsed.searchParams.get('channel');
        if (channelId && channelId.startsWith('UC')) {
          return `https://www.youtube.com/embed/live_stream?channel=${channelId}&${baseParams}`;
        }
      }
    } catch {}

    const extractVideoId = (url: string): string | null => {
      if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
      try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');
        if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
        if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
          if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
          if (parsed.pathname.startsWith('/live/')) return parsed.pathname.split('/live/')[1]?.split('/')[0] || null;
          if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/shorts/')[1]?.split('/')[0] || null;
          if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/embed/')[1]?.split('/')[0] || null;
        }
      } catch {}
      const fallback = url.match(/(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
      return fallback?.[1] || null;
    };

    const videoId = extractVideoId(withScheme);
    if (!videoId) return '';
    return `https://www.youtube.com/embed/${videoId}?${baseParams}`;
  };

  const embedUrl = useMemo(() => {
    const base = getYouTubeEmbedUrl(liveUrl);
    if (!base || resolution === 'auto') return base;
    const qualityMap: Record<string, string> = { '360': 'small', '480': 'medium', '720': 'hd720', '1080': 'hd1080' };
    const vq = qualityMap[resolution];
    return vq ? `${base}&vq=${vq}` : base;
  }, [liveUrl, resolution]);

  const handleSendComment = async () => {
    if (!newComment.trim() || sending || !user) return;
    const commentText = newComment.trim();
    const tempId = `temp-${Date.now()}`;
    setComments(prev => [...prev, { id: tempId, user_id: user.id, username: fallbackUsername, profile_photo: profile?.profile_photo ?? null, content: commentText, created_at: new Date().toISOString() }]);
    setNewComment('');
    setSending(true);
    try {
      const result: any = await supabase.from('livestream_comments' as any).insert({ user_id: user.id, username: fallbackUsername, profile_photo: profile?.profile_photo ?? null, content: commentText } as any).select('*').single();
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
    } finally { setSending(false); }
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
      supabase.from('app_settings').upsert({ key: 'livestream_logo', value: editLogo }),
      supabase.from('app_settings').upsert({ key: 'livestream_pinned_message', value: editPinnedMessage }),
    ]);
    toast.success('Pengaturan disimpan!');
    setShowSettings(false);
  };

  const handleToggleLive = async () => {
    const newVal = !liveActive;
    await supabase.from('app_settings').upsert({ key: 'livestream_active', value: String(newVal) });
    if (!newVal) {
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
    const el = videoContainerRef.current as any;
    const doc = document as any;
    if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      await lockLandscape();
    } else {
      unlockOrientation();
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Maksimal 2MB!'); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setEditLogo(reader.result as string); };
    reader.readAsDataURL(file);
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
          <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-bold">Login Sekarang</Link>
        </main>
      </div>
    );
  }

  const userCode = (profile as any)?.profile_code;

  // Blacklisted
  if (!isOwner && userCode && blacklistedCodes.has(userCode)) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <Ban className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-gradient mb-3">Akses Diblokir</h1>
          <p className="text-muted-foreground">Kamu telah di-blacklist dari livestream ini.</p>
          <p className="text-xs text-muted-foreground mt-2">Kode: #{userCode}</p>
        </main>
      </div>
    );
  }

  // Viewer limit
  if (!isOwner && liveActive && viewerCount >= maxViewers) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-gradient mb-3">Penonton Penuh</h1>
          <p className="text-muted-foreground">Livestream sudah mencapai batas penonton ({maxViewers}).</p>
        </main>
      </div>
    );
  }

  // Not active
  if (!liveActive && !isOwner) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <Radio className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-extrabold text-gradient mb-3">Tidak Ada Live</h1>
          <p className="text-muted-foreground">Saat ini tidak ada livestreaming yang sedang berlangsung.</p>
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
                
                {/* Logo upload */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Logo Livestream:</p>
                  <div className="flex items-center gap-2">
                    {editLogo && <img src={editLogo} alt="Logo" className="w-8 h-8 rounded-full object-cover" />}
                    <label className="px-3 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium cursor-pointer hover:opacity-80">
                      Upload Logo
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                    {editLogo && <button onClick={() => setEditLogo('')} className="text-xs text-destructive">Hapus</button>}
                  </div>
                </div>

                {/* Pinned message */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Pin className="w-3 h-3" /> Pesan Disematkan (bisa mengandung link):</p>
                  <textarea value={editPinnedMessage} onChange={e => setEditPinnedMessage(e.target.value)} placeholder="Pesan yang disematkan di atas chat... (link akan otomatis bisa diklik)" rows={2} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" />
                </div>

                {/* Max viewers */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Batas Penonton:</p>
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

                {/* Moderator management */}
                <div className="pt-2 border-t border-border/30">
                  <p className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1"><Shield className="w-3.5 h-3.5 text-primary" /> Moderator</p>
                  <div className="flex gap-1.5 mb-1.5">
                    <input value={modInput} onChange={e => setModInput(e.target.value)} placeholder="Kode profil..." className="flex-1 px-2 py-1 rounded-lg border border-border bg-background text-foreground text-xs" />
                    <button onClick={handleAddMod} className="px-3 py-1 rounded-lg gradient-primary text-primary-foreground text-xs font-medium">Tambah</button>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {[...moderatorCodes].map(code => (
                      <span key={code} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono">
                        {code} <button onClick={() => handleRemoveMod(code)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Blacklist */}
                <div className="pt-2 border-t border-border/30">
                  <p className="text-xs font-bold text-foreground mb-1.5 flex items-center gap-1"><Ban className="w-3.5 h-3.5 text-destructive" /> Blacklist</p>
                  <div className="flex gap-1.5 mb-1.5">
                    <input value={blacklistInput} onChange={e => setBlacklistInput(e.target.value)} placeholder="Kode profil..." className="flex-1 px-2 py-1 rounded-lg border border-border bg-background text-foreground text-xs" />
                    <button onClick={handleAddBlacklist} className="px-3 py-1 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium">Blacklist</button>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {[...blacklistedCodes].map(code => (
                      <span key={code} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-mono">
                        {code} <button onClick={() => handleRemoveBlacklist(code)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Video Player */}
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
                  <div className="absolute inset-0 z-10" />
                  <div className="absolute top-0 left-0 right-0 h-12 z-20 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }} />
                  <div className="absolute bottom-0 left-0 right-0 h-12 z-20 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }} />
                  <MovingWatermark profileCode={userCode} />

                  {/* User code display on screen */}
                  {userCode && (
                    <div className="absolute bottom-3 left-3 z-30 pointer-events-none">
                      <span className="text-white/20 text-[10px] font-mono font-bold">T4-{userCode}</span>
                    </div>
                  )}

                  <div className="absolute top-2 right-2 z-40 flex items-center gap-2">
                    <button onClick={toggleMute} className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition" aria-label={isMuted ? 'Nyalakan suara' : 'Matikan suara'}>
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <div className="relative">
                      <button onClick={() => setShowResMenu(!showResMenu)} className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition" aria-label="Resolusi">
                        <MonitorSmartphone className="w-4 h-4" />
                      </button>
                      <AnimatePresence>
                        {showResMenu && (
                          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                            className="absolute right-0 top-full mt-1 bg-black/90 rounded-lg overflow-hidden min-w-[100px] z-50 border border-white/10">
                            {['auto', '360', '480', '720', '1080'].map(q => (
                              <button key={q} onClick={() => { setResolution(q); setShowResMenu(false); }}
                                className={`block w-full text-left px-3 py-1.5 text-xs font-medium transition ${resolution === q ? 'text-primary bg-white/10' : 'text-white hover:bg-white/10'}`}>
                                {q === 'auto' ? 'Otomatis' : `${q}p`}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <button onClick={toggleFullscreen} className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition" aria-label={isFullscreen ? 'Keluar fullscreen' : 'Masuk fullscreen'}>
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                    </button>
                  </div>
                </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center px-4">
                    <div className="text-center">
                      <p className="text-destructive text-sm font-semibold">URL livestream YouTube tidak valid</p>
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

            {/* Stream info section below player */}
            <div className="mt-3 glass-card rounded-xl p-4">
              <div className="flex items-start gap-3">
                {liveLogo && (
                  <img src={liveLogo} alt="Live Logo" className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-border" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {liveActive && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex-shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-destructive-foreground animate-pulse" /> LIVE
                        </span>
                      )}
                      <h2 className="text-sm font-extrabold text-foreground truncate">{liveTitle || 'Livestreaming'}</h2>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs font-semibold">{viewerCount}</span>
                    </div>
                  </div>
                  {liveDesc && <p className="text-xs text-muted-foreground mt-1">{liveDesc}</p>}
                </div>
              </div>
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

              {/* Pinned message */}
              {pinnedMessage && (
                <div className="px-3 py-2 border-b border-border/50 bg-accent/5">
                  <div className="flex items-start gap-1.5">
                    <Pin className="w-3 h-3 text-accent flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-foreground leading-relaxed">
                      <RenderWithLinks text={pinnedMessage} />
                    </p>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
                {comments.map(c => {
                  const isCommentOwner = ownerUserIds.has(c.user_id);
                  const isCommentMod = moderatorUserIds.has(c.user_id);
                  return (
                    <div key={c.id} className={`flex gap-2 group ${isCommentOwner ? 'bg-gradient-to-r from-destructive/10 to-transparent rounded-lg px-2 py-1.5 -mx-2' : ''}`}>
                      <div className="flex-shrink-0">
                        {c.profile_photo ? (
                          <img src={c.profile_photo} alt="" className={`w-6 h-6 rounded-full object-cover ${isCommentOwner ? 'ring-2 ring-destructive' : ''}`} />
                        ) : (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isCommentOwner ? 'bg-destructive text-destructive-foreground' : 'gradient-primary text-primary-foreground'}`}>
                            {c.username[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {isCommentOwner ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-destructive to-destructive/80 shadow-sm shadow-destructive/30">
                            <span className="text-xs font-extrabold text-destructive-foreground">👑 {c.username}</span>
                            <span className="text-[9px] font-medium text-destructive-foreground/80 border-l border-destructive-foreground/30 pl-1">Owner</span>
                          </span>
                        ) : isCommentMod ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-xs font-bold text-chart-4">{c.username}</span>
                            <span className="text-[9px] font-medium text-chart-4/70">Mod</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-primary">{c.username}</span>
                        )}
                        <span className={`text-xs ml-1.5 ${isCommentOwner ? 'text-foreground font-semibold' : 'text-foreground'}`}>{c.content}</span>
                      </div>
                      {isOwner && (
                        <button onClick={() => handleDeleteComment(c.id)} className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition">
                          <X className="w-3 h-3 text-destructive" />
                        </button>
                      )}
                    </div>
                  );
                })}
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
              {/* Buy Replay button */}
              <div className="px-3 py-2 border-t border-border/50">
                <Link to="/replay" className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent font-semibold text-sm transition">
                  <Play className="w-4 h-4" /> Beli Replay
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LiveStream;
