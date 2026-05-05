import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { motion } from "framer-motion";
import { Radio, Send, MessageCircle, Users, Trash2, Server, ArrowLeft, Crown, Shield } from "lucide-react";
import { toast } from "sonner";
import Artplayer from "artplayer";
import Hls from "hls.js";

interface Settings {
  active_server: "youtube" | "idn";
  youtube_url: string;
  m3u8_url: string;
  title: string;
  description: string;
  logo_url: string;
  background_url: string;
  start_time: string | null;
  is_live: boolean;
}

interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  profile_photo: string | null;
  content: string;
  created_at: string;
}

const POSITIONS = [
  { top: "10%", left: "5%" }, { top: "60%", left: "70%" }, { top: "30%", left: "40%" },
  { top: "75%", left: "15%" }, { top: "15%", left: "75%" }, { top: "50%", left: "25%" },
];

const MovingWatermark = ({ code }: { code?: string }) => {
  const [i, setI] = useState(0);
  useEffect(() => { const t = setInterval(() => setI(p => (p + 1) % POSITIONS.length), 7000); return () => clearInterval(t); }, []);
  const p = POSITIONS[i];
  return (
    <div className="absolute z-30 text-white/30 text-sm font-bold select-none pointer-events-none transition-all duration-1000"
      style={{ top: p.top, left: p.left }}>
      {code ? `T4-${code}` : "@t48id"}
    </div>
  );
};

const extractYouTubeId = (url: string) => {
  if (!url) return "";
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|live\/)([\w-]{11})/);
  return m?.[1] || url;
};

const PaidLiveStream = () => {
  const { user, profile, isOwner } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const tokenParam = (params.get("t") || "").toUpperCase().trim();

  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessExpiry, setAccessExpiry] = useState<string | null>(null);
  const [accessMode, setAccessMode] = useState<"email" | "token" | "owner" | null>(null);
  const [tokenCode, setTokenCode] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [serverChoice, setServerChoice] = useState<"youtube" | "idn">("youtube");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [, setTick] = useState(0);
  const [viewers, setViewers] = useState(0);
  const [ownerIds, setOwnerIds] = useState<Set<string>>(new Set());
  const [modIds, setModIds] = useState<Set<string>>(new Set());
  const [accessError, setAccessError] = useState<string>("");
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [levels, setLevels] = useState<{ height: number; index: number }[]>([]);

  const playerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Token-only mode (no login required)
  const isTokenMode = !!tokenParam && !user;

  useEffect(() => {
    if (!user && !tokenParam) navigate("/login");
  }, [user, tokenParam, navigate]);

  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1000); return () => clearInterval(t); }, []);

  // Load settings + access
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const promises: any[] = [
        supabase.from("paid_livestream_settings").select("*").limit(1).maybeSingle(),
        supabase.from("user_roles").select("user_id").eq("role", "admin"),
        supabase.from("livestream_moderators").select("profile_code"),
      ];
      if (user?.email) {
        promises.push(supabase.from("paid_livestream_access").select("expires_at").ilike("email", user.email).maybeSingle());
      } else {
        promises.push(Promise.resolve({ data: null }));
      }
      if (tokenParam) {
        promises.push(supabase.from("paid_livestream_tokens").select("token,expires_at,banned").eq("token", tokenParam).maybeSingle());
      } else {
        promises.push(Promise.resolve({ data: null }));
      }
      const [{ data: s }, { data: roles }, { data: mods }, { data: a }, { data: tok }] = await Promise.all(promises);
      if (!mounted) return;
      if (s) { setSettings(s as any); setServerChoice((s as any).active_server || "youtube"); }
      if (roles) setOwnerIds(new Set(roles.map((r: any) => r.user_id)));
      if (mods?.length) {
        const codes = (mods as any[]).map(m => m.profile_code);
        const { data: ps } = await supabase.from("profiles").select("user_id, profile_code").in("profile_code", codes);
        if (ps) setModIds(new Set(ps.map((p: any) => p.user_id)));
      }

      // Resolve access: owner > token > email
      if (isOwner) {
        setHasAccess(true); setAccessMode("owner");
      } else if (tok) {
        const t: any = tok;
        if (t.banned) { setAccessError("Token Anda telah diblokir oleh admin."); setHasAccess(false); }
        else if (new Date(t.expires_at).getTime() <= Date.now()) { setAccessError("Token sudah kedaluwarsa."); setHasAccess(false); }
        else { setHasAccess(true); setAccessMode("token"); setTokenCode(t.token); setAccessExpiry(t.expires_at); }
      } else if (a && new Date((a as any).expires_at).getTime() > Date.now()) {
        setHasAccess(true); setAccessMode("email"); setAccessExpiry((a as any).expires_at);
      } else if (tokenParam) {
        setAccessError("Token tidak ditemukan."); setHasAccess(false);
      } else {
        setHasAccess(false);
      }
      setLoading(false);
    };
    load();
    const ch = supabase.channel("paid-stream-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "paid_livestream_settings" },
        (p: any) => { if (p.new) setSettings(p.new as any); })
      .on("postgres_changes", { event: "*", schema: "public", table: "paid_livestream_tokens" },
        (p: any) => {
          if (!tokenParam) return;
          const n: any = p.new;
          if (n && n.token === tokenParam) {
            if (n.banned) { setHasAccess(false); setAccessError("Token Anda telah diblokir oleh admin."); }
            else if (new Date(n.expires_at).getTime() <= Date.now()) { setHasAccess(false); setAccessError("Token kedaluwarsa."); }
          }
        })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user?.email, isOwner, tokenParam]);

  // Chat realtime (only for logged-in users)
  useEffect(() => {
    if (!hasAccess || !user) return;
    supabase.from("paid_livestream_chat").select("*")
      .order("created_at", { ascending: true }).limit(200)
      .then(({ data }) => { if (data) setMessages(data as any); });
    const ch = supabase.channel("paid-stream-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "paid_livestream_chat" },
        (p: any) => setMessages(prev => prev.some(m => m.id === p.new.id) ? prev : [...prev.slice(-199), p.new]))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "paid_livestream_chat" },
        (p: any) => setMessages(prev => prev.filter(m => m.id !== p.old.id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hasAccess, user?.id]);

  // Presence
  useEffect(() => {
    if (!hasAccess) return;
    const key = user?.id || `tok-${tokenParam}-${Math.random().toString(36).slice(2, 8)}`;
    const ch = supabase.channel("paid-stream-presence", { config: { presence: { key } } });
    ch.on("presence", { event: "sync" }, () => setViewers(Object.keys(ch.presenceState()).length))
      .subscribe(async (s) => { if (s === "SUBSCRIBED") await ch.track({ at: Date.now() }); });
    return () => { supabase.removeChannel(ch); };
  }, [hasAccess, user?.id, tokenParam]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const countdown = useMemo(() => {
    if (!settings?.start_time) return null;
    const ms = new Date(settings.start_time).getTime() - Date.now();
    if (ms <= 0) return null;
    const s = Math.floor(ms / 1000);
    return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  }, [settings?.start_time, Math.floor(Date.now() / 1000)]);

  const isPreShow = countdown !== null && !settings?.is_live;

  // ART Player for IDN — direct M3U8, optimized HLS, manual quality control
  useEffect(() => {
    if (!hasAccess || isPreShow || serverChoice !== "idn" || !playerRef.current || !settings?.m3u8_url) {
      if (artRef.current) { artRef.current.destroy(false); artRef.current = null; }
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      setLevels([]);
      return;
    }
    if (artRef.current) { artRef.current.destroy(false); artRef.current = null; }
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }

    const art = new Artplayer({
      container: playerRef.current,
      url: settings.m3u8_url,
      type: "m3u8",
      autoplay: true, muted: false, playsInline: true,
      setting: true, fullscreen: true, fullscreenWeb: true, pip: true,
      autoOrientation: true, theme: "#ef4444",
      moreVideoAttr: { crossOrigin: "anonymous" as any, "x-webkit-airplay": "allow" } as any,
      customType: {
        m3u8: (video: HTMLVideoElement, url: string) => {
          if (Hls.isSupported()) {
            const hls = new Hls({
              // Live-tuned, low buffering, anti-stall
              lowLatencyMode: true,
              backBufferLength: 30,
              maxBufferLength: 20,
              maxMaxBufferLength: 40,
              liveSyncDurationCount: 3,
              liveMaxLatencyDurationCount: 8,
              enableWorker: true,
              startLevel: -1,
              abrEwmaDefaultEstimate: 1_000_000,
              fragLoadingMaxRetry: 6,
              manifestLoadingMaxRetry: 4,
              levelLoadingMaxRetry: 4,
            });
            hlsRef.current = hls;
            hls.loadSource(url); hls.attachMedia(video);
            art.on("destroy", () => { hls.destroy(); hlsRef.current = null; });
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              const lv = hls.levels.map((l, i) => ({ height: l.height || 0, index: i }));
              setLevels(lv);
              setCurrentLevel(-1);
            });
            hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => setCurrentLevel(hls.autoLevelEnabled ? -1 : d.level));
            hls.on(Hls.Events.ERROR, (_e, data) => {
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
                  case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
                  default: hls.destroy();
                }
              }
            });
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = url;
          }
        },
      },
    });
    let wakeLock: any = null;
    const onFs = async () => {
      const isFs = !!document.fullscreenElement;
      if (isFs) {
        try { if ("wakeLock" in navigator) wakeLock = await (navigator as any).wakeLock.request("screen"); } catch {}
        try { await (screen as any).orientation?.lock?.("landscape"); } catch {}
      } else {
        try { await wakeLock?.release(); } catch {}
        wakeLock = null;
        try { (screen as any).orientation?.unlock?.(); } catch {}
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    art.on("destroy", () => document.removeEventListener("fullscreenchange", onFs));
    artRef.current = art;
    return () => {
      if (artRef.current) { artRef.current.destroy(false); artRef.current = null; }
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [hasAccess, isPreShow, serverChoice, settings?.m3u8_url]);

  const setLevel = (lv: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = lv;
    hlsRef.current.loadLevel = lv;
    setCurrentLevel(lv);
  };
  const setAuto = () => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = -1;
    hlsRef.current.loadLevel = -1;
    hlsRef.current.nextLevel = -1;
    setCurrentLevel(-1);
  };

  const fallbackUsername = profile?.username || user?.email?.split("@")[0] || "User";

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !user || sending) return;
    setSending(true);
    const tempId = `tmp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId, user_id: user.id, username: fallbackUsername,
      profile_photo: profile?.profile_photo ?? null, content: text, created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setInput("");
    const { data, error } = await supabase.from("paid_livestream_chat")
      .insert({ user_id: user.id, username: fallbackUsername, profile_photo: profile?.profile_photo ?? null, content: text })
      .select("*").single();
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error("Gagal kirim"); setInput(text);
    } else if (data) {
      setMessages(prev => {
        const without = prev.filter(m => m.id !== tempId);
        return without.some(m => m.id === (data as any).id) ? without : [...without, data as any];
      });
    }
    setSending(false);
  }, [input, user, sending, fallbackUsername, profile]);

  const deleteMessage = async (id: string) => {
    if (!isOwner) return;
    setMessages(prev => prev.filter(m => m.id !== id));
    await supabase.from("paid_livestream_chat").delete().eq("id", id);
  };

  const userCode = (profile as any)?.profile_code;
  const watermarkCode = accessMode === "token" ? tokenCode || undefined : userCode;

  if (!user && !tokenParam) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Memuat...</div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-10 max-w-md">
          <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center text-sm text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
          </button>
          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="text-5xl mb-3">🔒</div>
            <h2 className="text-xl font-extrabold text-gradient mb-2">Akses Terbatas</h2>
            {accessError ? (
              <p className="text-sm text-destructive mb-3">{accessError}</p>
            ) : user?.email ? (
              <p className="text-sm text-muted-foreground mb-3">
                Email <span className="font-bold text-foreground">{user.email}</span> belum terdaftar.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-3">Token tidak valid atau hilang.</p>
            )}
            <p className="text-xs text-muted-foreground mb-4">Hubungi admin untuk mendapatkan akses.</p>
            <a href="https://wa.me/6282135963767" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-bold">
              💬 Hubungi Admin
            </a>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-4 max-w-4xl">
        {accessMode === "token" && (
          <div className="mb-3 text-[11px] text-center text-muted-foreground">
            🎟️ Akses via token <span className="font-bold text-foreground">{tokenCode}</span>
            {accessExpiry && <> · sampai {new Date(accessExpiry).toLocaleString("id-ID")}</>}
          </div>
        )}
        {accessMode === "email" && accessExpiry && (
          <div className="mb-3 text-[11px] text-center text-muted-foreground">
            ✅ Akses sampai {new Date(accessExpiry).toLocaleString("id-ID")}
          </div>
        )}

        {/* Pre-show countdown card */}
        {isPreShow && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="relative w-full aspect-video rounded-2xl overflow-hidden mb-4 shadow-xl">
            <div className="absolute inset-0"
              style={{
                backgroundImage: settings?.background_url ? `url(${settings.background_url})` : "linear-gradient(135deg,hsl(var(--destructive)),#1a0000)",
                backgroundSize: "cover", backgroundPosition: "center",
              }} />
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative h-full flex flex-col items-center justify-center text-white px-4 text-center">
              <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider opacity-90 mb-3">
                SIARAN DIMULAI DALAM
              </div>
              <div className="flex gap-3 sm:gap-6">
                {(["d","h","m","s"] as const).map(k => (
                  <div key={k} className="text-center">
                    <div className="text-3xl sm:text-5xl font-extrabold tabular-nums leading-none">
                      {String((countdown as any)[k]).padStart(2, "0")}
                    </div>
                    <div className="text-[9px] sm:text-xs mt-1 opacity-80 tracking-wider">
                      {k === "d" ? "HARI" : k === "h" ? "JAM" : k === "m" ? "MENIT" : "DETIK"}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> COMING SOON
              </div>
            </div>
          </motion.div>
        )}

        {/* Server switcher */}
        {!isPreShow && (
          <div className="flex gap-2 mb-3">
            <button onClick={() => setServerChoice("youtube")}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                serverChoice === "youtube" ? "gradient-primary text-primary-foreground shadow-lg" : "glass-card text-muted-foreground"
              }`}>
              <Server className="w-3.5 h-3.5" /> Server YouTube
            </button>
            <button onClick={() => setServerChoice("idn")}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                serverChoice === "idn" ? "gradient-primary text-primary-foreground shadow-lg" : "glass-card text-muted-foreground"
              }`}>
              <Server className="w-3.5 h-3.5" /> Server IDN
            </button>
          </div>
        )}

        {/* Player */}
        {!isPreShow && (
          <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden mb-3">
            {serverChoice === "youtube" ? (
              settings?.youtube_url ? (
                <>
                  <iframe
                    key={settings.youtube_url}
                    src={`https://www.youtube.com/embed/${extractYouTubeId(settings.youtube_url)}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
                    className="absolute inset-0 w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen title="Live"
                  />
                  <MovingWatermark code={watermarkCode} />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
                  Server YouTube belum dikonfigurasi
                </div>
              )
            ) : settings?.m3u8_url ? (
              <>
                <div ref={playerRef} className="w-full h-full" />
                <MovingWatermark code={watermarkCode} />
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
                Server IDN belum dikonfigurasi
              </div>
            )}
          </div>
        )}

        {/* Quality controls (IDN only) */}
        {!isPreShow && serverChoice === "idn" && levels.length > 0 && (
          <div className="glass-card rounded-2xl p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold">🎚️ Kualitas</span>
              <span className="text-[10px] text-muted-foreground">
                Aktif: {currentLevel === -1 ? "Auto" : `${levels.find(l => l.index === currentLevel)?.height || "?"}p`}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={setAuto}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                  currentLevel === -1 ? "gradient-primary text-primary-foreground" : "glass-card text-muted-foreground"
                }`}>
                Auto
              </button>
              {levels.map(l => (
                <button key={l.index} onClick={() => setLevel(l.index)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition ${
                    currentLevel === l.index ? "gradient-primary text-primary-foreground" : "glass-card text-muted-foreground"
                  }`}>
                  {l.height ? `${l.height}p` : `Lv${l.index}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stream info */}
        <div className="glass-card rounded-2xl p-4 mb-3">
          <div className="flex items-start gap-3">
            {settings?.logo_url && (
              <img src={settings.logo_url} alt="logo" className="w-10 h-10 rounded-full object-cover border border-border flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 justify-between">
                <h2 className="text-sm font-extrabold truncate">{settings?.title || "Livestreaming"}</h2>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">{viewers} penonton</span>
                </div>
              </div>
              {settings?.description && <p className="text-xs text-muted-foreground mt-1">{settings.description}</p>}
            </div>
          </div>
        </div>

        {/* Chat — only logged-in users */}
        {user ? (
          <div className="glass-card rounded-2xl flex flex-col h-[60vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-primary" /> Live Chat
              </h3>
              <span className="text-xs text-muted-foreground">{messages.length} pesan</span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
              {messages.map(m => {
                const isOwn = m.user_id === user.id;
                const isOwnerMsg = ownerIds.has(m.user_id);
                const isMod = !isOwnerMsg && modIds.has(m.user_id);
                return (
                  <div key={m.id} className="flex items-start gap-2 group">
                    {m.profile_photo ? (
                      <img src={m.profile_photo} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-border" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {m.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isOwnerMsg && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                            <Crown className="w-2.5 h-2.5" /> Kuncen
                          </span>
                        )}
                        {isMod && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-chart-4/20 text-chart-4 text-[9px] font-bold">
                            <Shield className="w-2.5 h-2.5" /> Pentolan
                          </span>
                        )}
                        <span className={`text-xs font-bold ${isOwnerMsg ? "text-destructive" : isMod ? "text-chart-4" : "text-foreground"}`}>
                          {m.username}
                        </span>
                      </div>
                      <div className="text-sm break-words">{m.content}</div>
                    </div>
                    {(isOwner || isOwn) && (
                      <button onClick={() => deleteMessage(m.id)}
                        className="opacity-0 group-hover:opacity-100 text-destructive p-1 transition">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-8">
                  <Radio className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Belum ada chat. Jadilah yang pertama!
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex gap-2 p-3 border-t border-border/50">
              <input value={input} onChange={e => setInput(e.target.value)} maxLength={200}
                placeholder="Ketik pesan..." disabled={sending}
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button type="submit" disabled={!input.trim() || sending}
                className="px-4 rounded-xl gradient-primary text-primary-foreground disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-4 text-center text-xs text-muted-foreground">
            🎟️ Anda menonton via token. Login untuk ikut chat.
          </div>
        )}
      </main>
    </div>
  );
};

export default PaidLiveStream;
