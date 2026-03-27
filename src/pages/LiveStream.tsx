import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, Send, Trash2, MessageCircle, Settings, X } from 'lucide-react';
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load settings from app_settings
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('app_settings').select('*').in('key', [
        'livestream_url', 'livestream_title', 'livestream_description',
        'livestream_active', 'livestream_chat_enabled'
      ]);
      if (data) {
        data.forEach(s => {
          if (s.key === 'livestream_url') { setLiveUrl(s.value); setEditUrl(s.value); }
          if (s.key === 'livestream_title') { setLiveTitle(s.value); setEditTitle(s.value); }
          if (s.key === 'livestream_description') { setLiveDesc(s.value); setEditDesc(s.value); }
          if (s.key === 'livestream_active') setLiveActive(s.value === 'true');
          if (s.key === 'livestream_chat_enabled') setChatEnabled(s.value !== 'false');
        });
      }
    };
    loadSettings();

    // Realtime settings
    const ch = supabase.channel('livestream-settings')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'app_settings' }, () => loadSettings())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

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

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return '';
    let videoId = '';
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([^&\s?]+)/,
      /youtube\.com\/embed\/([^?&]+)/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) { videoId = m[1]; break; }
    }
    if (!videoId) return url; // fallback
    return `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&playsinline=1&autoplay=1&controls=1`;
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || sending || !user || !profile) return;
    setSending(true);
    const optimistic: LiveComment = {
      id: `opt-${Date.now()}`,
      user_id: user.id,
      username: profile.username,
      profile_photo: profile.profile_photo,
      content: newComment.trim(),
      created_at: new Date().toISOString(),
    };
    setComments(prev => [...prev, optimistic]);
    setNewComment('');

    const { error } = await supabase.from('livestream_comments' as any).insert({
      user_id: user.id,
      username: profile.username,
      profile_photo: profile.profile_photo,
      content: optimistic.content,
    } as any);
    if (error) {
      setComments(prev => prev.filter(c => c.id !== optimistic.id));
      toast.error('Gagal mengirim komentar');
    }
    setSending(false);
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
    setLiveActive(newVal);
    toast.success(newVal ? 'Live diaktifkan!' : 'Live ditutup!');
  };

  const handleToggleChat = async () => {
    const newVal = !chatEnabled;
    await supabase.from('app_settings').upsert({ key: 'livestream_chat_enabled', value: String(newVal) });
    setChatEnabled(newVal);
    toast.success(newVal ? 'Chat diaktifkan!' : 'Chat dinonaktifkan!');
  };

  const handleClearComments = async () => {
    const { data } = await supabase.from('livestream_comments' as any).select('id');
    if (data && data.length > 0) {
      for (const c of data as any[]) {
        await supabase.from('livestream_comments' as any).delete().eq('id', c.id);
      }
    }
    setComments([]);
    toast.success('Semua komentar dihapus!');
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
                <button onClick={handleSaveSettings} className="px-4 py-1.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">Simpan</button>
              </motion.div>
            )}
          </div>
        )}

        {/* Title */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            {liveActive && <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold"><span className="w-2 h-2 rounded-full bg-destructive-foreground animate-pulse" /> LIVE</span>}
            <h1 className="text-xl font-extrabold text-foreground">{liveTitle || 'Livestreaming'}</h1>
          </div>
          {liveDesc && <p className="text-sm text-muted-foreground">{liveDesc}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Video Player - Secured */}
          <div className="lg:col-span-2">
            <div className="relative w-full rounded-2xl overflow-hidden bg-card border border-border" style={{ paddingBottom: '56.25%' }}>
              {liveUrl ? (
                <>
                  <iframe
                    src={getYouTubeEmbedUrl(liveUrl)}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    referrerPolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                    style={{ border: 'none' }}
                  />
                  {/* Security overlays - block YouTube logo and watch on YouTube links */}
                  <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-card/80 to-transparent pointer-events-auto z-10" 
                    onClick={e => e.preventDefault()} />
                  <div className="absolute bottom-0 left-0 right-0 h-10 pointer-events-auto z-10 flex items-end justify-end"
                    onClick={e => e.preventDefault()}>
                    {/* Block "Watch on YouTube" link area */}
                    <div className="w-40 h-8 bg-transparent" onClick={e => { e.preventDefault(); e.stopPropagation(); }} />
                  </div>
                  {/* Block YouTube logo top-right */}
                  <div className="absolute top-0 right-0 w-20 h-12 pointer-events-auto z-10" 
                    onClick={e => { e.preventDefault(); e.stopPropagation(); }} />
                </>
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
                    {isOwner && !c.id.startsWith('opt-') && (
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
