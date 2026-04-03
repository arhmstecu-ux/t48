import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Image, Users, LogIn, Clock, CheckCheck, AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

type MessageStatus = 'sending' | 'sent' | 'failed';

interface GroupMessage {
  id: string;
  user_id: string;
  username: string;
  profile_photo: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string;
  _status?: MessageStatus;
  _optimisticId?: string;
  _isOwner?: boolean;
}

const GroupChat = () => {
  const SEND_COOLDOWN_SECONDS = 5;
  const { user, profile, isOwner } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [joined, setJoined] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ownerUserIds, setOwnerUserIds] = useState<Set<string>>(new Set());
  const [moderatorUserIds, setModeratorUserIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load owner user IDs
    const loadOwners = async () => {
      const { data } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
      if (data) setOwnerUserIds(new Set(data.map(r => r.user_id)));
    };
    loadOwners();

    const init = async () => {
      const { count } = await supabase.from('group_members').select('*', { count: 'exact', head: true });
      setMemberCount(count || 0);
      if (user) {
        const { data } = await supabase.from('group_members').select('id').eq('user_id', user.id).maybeSingle();
        if (data) {
          setJoined(true);
          const { data: msgs } = await supabase.from('group_messages').select('*').order('created_at', { ascending: true }).limit(200);
          if (msgs) setMessages(msgs as GroupMessage[]);
        }
      }
      setLoading(false);
    };
    init();
  }, [user]);

  // Realtime subscription - listen for INSERT and DELETE
  useEffect(() => {
    if (!joined) return;
    const channel = supabase
      .channel('group-chat-realtime')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'group_messages' }, (payload: any) => {
        const incoming = payload.new as GroupMessage;
        setMessages(prev => (prev.some(msg => msg.id === incoming.id) ? prev : [...prev, incoming]));
      })
      .on('postgres_changes' as any, { event: 'DELETE', schema: 'public', table: 'group_messages' }, (payload: any) => {
        const deleted = payload.old as any;
        setMessages(prev => prev.filter(msg => msg.id !== deleted.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [joined]);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownLeft(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownLeft]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleJoin = async () => {
    if (!user) return;
    const { error } = await supabase.from('group_members').insert({ user_id: user.id });
    if (error) { toast.error('Gagal bergabung'); return; }
    setJoined(true);
    setMemberCount(prev => prev + 1);
    toast.success('Berhasil bergabung ke grup!');
    const { data: msgs } = await supabase.from('group_messages').select('*').order('created_at', { ascending: true }).limit(200);
    if (msgs) setMessages(msgs as GroupMessage[]);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    if (!user) { toast.error('Silakan login terlebih dahulu'); return; }
    if (cooldownLeft > 0) { toast.error(`Tunggu ${cooldownLeft} detik`); return; }

    const metadata = (user.user_metadata ?? {}) as any;
    const senderUsername = profile?.username?.trim() || metadata.username?.trim() || user.email?.split('@')[0] || 'Member';
    const senderPhoto = profile?.profile_photo ?? metadata.profile_photo ?? metadata.avatar_url ?? null;
    const content = newMessage.trim();
    const optimisticId = crypto.randomUUID();

    setSending(true);
    setMessages(prev => [...prev, {
      id: optimisticId, user_id: user.id, username: senderUsername, profile_photo: senderPhoto,
      content, image_url: null, created_at: new Date().toISOString(), _status: 'sending', _optimisticId: optimisticId,
    }]);
    setNewMessage('');

    try {
      const { data: inserted, error } = await supabase.from('group_messages').insert({
        user_id: user.id, username: senderUsername, profile_photo: senderPhoto, content,
      }).select('*').single();
      if (error) {
        setMessages(prev => prev.map(msg => msg.id === optimisticId ? { ...msg, _status: 'failed' as MessageStatus } : msg));
        toast.error('Gagal mengirim pesan');
      } else if (inserted) {
        setMessages(prev => prev.map(msg => msg.id === optimisticId ? { ...inserted as GroupMessage, _status: 'sent' as MessageStatus } : msg));
        setCooldownLeft(SEND_COOLDOWN_SECONDS);
      }
    } catch {
      setMessages(prev => prev.map(msg => msg.id === optimisticId ? { ...msg, _status: 'failed' as MessageStatus } : msg));
      toast.error('Gagal mengirim pesan');
    } finally { setSending(false); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (cooldownLeft > 0) { toast.error(`Tunggu ${cooldownLeft} detik`); e.target.value = ''; return; }
    if (file.size > 3 * 1024 * 1024) { toast.error('Maksimal 3MB!'); return; }

    const metadata = (user.user_metadata ?? {}) as any;
    const senderUsername = profile?.username?.trim() || metadata.username?.trim() || user.email?.split('@')[0] || 'Member';
    const senderPhoto = profile?.profile_photo ?? metadata.profile_photo ?? metadata.avatar_url ?? null;

    setSending(true);
    const reader = new FileReader();
    const optimisticId = crypto.randomUUID();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        setMessages(prev => [...prev, {
          id: optimisticId, user_id: user.id, username: senderUsername, profile_photo: senderPhoto,
          content: null, image_url: base64, created_at: new Date().toISOString(), _status: 'sending', _optimisticId: optimisticId,
        }]);
        const { data: inserted, error } = await supabase.from('group_messages').insert({
          user_id: user.id, username: senderUsername, profile_photo: senderPhoto, image_url: base64,
        }).select('*').single();
        if (error) {
          setMessages(prev => prev.map(msg => msg.id === optimisticId ? { ...msg, _status: 'failed' as MessageStatus } : msg));
          toast.error('Gagal mengirim gambar');
        } else if (inserted) {
          setMessages(prev => prev.map(msg => msg.id === optimisticId ? { ...inserted as GroupMessage, _status: 'sent' as MessageStatus } : msg));
          setCooldownLeft(SEND_COOLDOWN_SECONDS);
        }
      } catch {
        setMessages(prev => prev.map(msg => msg.id === optimisticId ? { ...msg, _status: 'failed' as MessageStatus } : msg));
        toast.error('Gagal mengirim gambar');
      } finally { setSending(false); }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRetry = (failedMsg: GroupMessage) => {
    setMessages(prev => prev.filter(m => m.id !== failedMsg.id));
    if (failedMsg.content) {
      setNewMessage(failedMsg.content);
      setTimeout(() => handleSend(), 100);
    }
    if (failedMsg.image_url && !failedMsg.content) toast.info('Silakan kirim ulang gambar');
  };

  const handleDeleteMessage = async (msgId: string) => {
    const { error } = await supabase.from('group_messages').delete().eq('id', msgId);
    if (error) { toast.error('Gagal menghapus pesan'); return; }
    setMessages(prev => prev.filter(m => m.id !== msgId));
    toast.success('Pesan dihapus');
  };

  const StatusIcon = ({ status }: { status?: MessageStatus }) => {
    if (!status || status === 'sent') return <CheckCheck className="w-3 h-3 inline-block ml-1 text-primary-foreground/70" />;
    if (status === 'sending') return <Clock className="w-3 h-3 inline-block ml-1 animate-pulse text-primary-foreground/50" />;
    return <AlertCircle className="w-3 h-3 inline-block ml-1 text-destructive" />;
  };

  const formatTime = (date: string) => new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date: string) => new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen bg-background"><Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background"><Header />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <div className="text-6xl mb-4">💬</div>
          <h1 className="text-2xl font-extrabold text-gradient mb-3">Publik Chat T48</h1>
          <p className="text-muted-foreground mb-2">{memberCount} anggota sudah bergabung</p>
          <p className="text-muted-foreground mb-6">Login terlebih dahulu untuk bergabung ke grup chat!</p>
          <Link to="/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
            <LogIn className="w-5 h-5" /> Login untuk Bergabung
          </Link>
        </main>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-background"><Header />
        <main className="container mx-auto px-4 py-16 max-w-md text-center">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
            <div className="text-6xl mb-4">💬</div>
            <h1 className="text-2xl font-extrabold text-gradient mb-3">Publik Chat T48</h1>
            <p className="text-muted-foreground mb-2">{memberCount} anggota sudah bergabung</p>
            <p className="text-muted-foreground mb-6">Bergabunglah untuk mengobrol dengan sesama fans!</p>
            <button onClick={handleJoin} className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
              <Users className="w-5 h-5" /> Gabung Sekarang
            </button>
          </motion.div>
        </main>
      </div>
    );
  }

  let lastDate = '';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <div className="glass-card border-b px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
            <Users className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-sm">Publik Chat T48</h2>
            <p className="text-xs text-muted-foreground">{memberCount} anggota</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: 'calc(100vh - 200px)' }}>
          {messages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-4xl mb-2">👋</p><p>Belum ada pesan. Mulai percakapan!</p>
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map(msg => {
              const isMe = msg.user_id === user.id;
              const msgDate = formatDate(msg.created_at);
              let showDateSep = false;
              if (msgDate !== lastDate) { showDateSep = true; lastDate = msgDate; }

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="text-center my-4">
                      <span className="text-xs bg-secondary text-muted-foreground px-3 py-1 rounded-full">{msgDate}</span>
                    </div>
                  )}
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                    className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'} group`}>
                    {!isMe && (
                      <div className="flex-shrink-0">
                        {msg.profile_photo ? (
                          <img src={msg.profile_photo} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                            {msg.username[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                      {!isMe && <p className={`text-xs font-semibold mb-0.5 ml-1 ${ownerUserIds.has(msg.user_id) ? 'text-destructive' : 'text-primary'}`}>{msg.username}{ownerUserIds.has(msg.user_id) ? ' 👑' : ''}</p>}
                      <div className={`rounded-2xl px-3.5 py-2 ${isMe ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-secondary text-secondary-foreground rounded-bl-md'} ${msg._status === 'failed' ? 'opacity-70' : ''} relative`}>
                        {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                        {msg.image_url && (
                          <img src={msg.image_url} alt="Foto" className="rounded-lg max-w-full mt-1 max-h-60 object-cover cursor-pointer" onClick={() => window.open(msg.image_url!, '_blank')} />
                        )}
                        <div className={`flex items-center gap-0.5 mt-1 ${isMe ? 'justify-end' : ''}`}>
                          <span className={`text-[10px] ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{formatTime(msg.created_at)}</span>
                          {isMe && <StatusIcon status={msg._status} />}
                        </div>
                        {/* Admin delete button */}
                        {isOwner && !msg._optimisticId && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                            title="Hapus pesan"
                          >
                            <Trash2 className="w-3 h-3 text-destructive-foreground" />
                          </button>
                        )}
                      </div>
                      {isMe && msg._status === 'failed' && (
                        <button onClick={() => handleRetry(msg)} className="text-[10px] text-destructive hover:underline mt-0.5 mr-1 text-right">Kirim ulang</button>
                      )}
                    </div>
                  </motion.div>
                </div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="glass-card border-t px-4 py-3">
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg hover:bg-secondary transition-colors" disabled={sending || cooldownLeft > 0}>
              <Image className="w-5 h-5 text-muted-foreground" />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ketik pesan..." disabled={sending || cooldownLeft > 0}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            <button onClick={handleSend} disabled={sending || cooldownLeft > 0 || !newMessage.trim()}
              className="p-2.5 rounded-xl gradient-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
              <Send className="w-5 h-5" />
            </button>
          </div>
          {cooldownLeft > 0 && <p className="mt-2 text-xs text-muted-foreground">Mode anti-spam aktif, kirim lagi dalam {cooldownLeft} detik.</p>}
        </div>
      </div>
    </div>
  );
};

export default GroupChat;
