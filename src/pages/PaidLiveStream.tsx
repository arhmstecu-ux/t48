import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Send, Server, Trash2, Users } from "lucide-react";
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

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/m3u8-proxy`;

const formatCountdown = (target: Date) => {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { d, h, m, s: sec };
};

const extractYouTubeId = (url: string) => {
  if (!url) return "";
  const m = url.match(/(?:v=|youtu\.be\/|embed\/|live\/)([\w-]{11})/);
  return m?.[1] || url;
};

const PaidLiveStream = () => {
  const { user, profile, isOwner } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessExpiry, setAccessExpiry] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [serverChoice, setServerChoice] = useState<"youtube" | "idn">("youtube");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [tick, setTick] = useState(0);
  const [viewers, setViewers] = useState(0);

  const playerRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<Artplayer | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auth check
  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  // Tick for countdown
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Load settings + access
  useEffect(() => {
    if (!user?.email) return;
    let mounted = true;
    const load = async () => {
      const [{ data: s }, { data: a }] = await Promise.all([
        supabase.from("paid_livestream_settings").select("*").limit(1).maybeSingle(),
        supabase.from("paid_livestream_access").select("expires_at")
          .ilike("email", user.email!).maybeSingle(),
      ]);
      if (!mounted) return;
      if (s) {
        setSettings(s as any);
        setServerChoice((s as any).active_server || "youtube");
      }
      if (isOwner) {
        setHasAccess(true);
      } else if (a && new Date((a as any).expires_at).getTime() > Date.now()) {
        setHasAccess(true);
        setAccessExpiry((a as any).expires_at);
      } else {
        setHasAccess(false);
      }
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel("paid-stream-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "paid_livestream_settings" },
        (p) => { if (p.new) { setSettings(p.new as any); setServerChoice((p.new as any).active_server); } })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [user?.email, isOwner]);

  // Load chat + realtime
  useEffect(() => {
    if (!hasAccess) return;
    supabase.from("paid_livestream_chat").select("*")
      .order("created_at", { ascending: true }).limit(200)
      .then(({ data }) => { if (data) setMessages(data as any); });

    const ch = supabase
      .channel("paid-stream-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "paid_livestream_chat" },
        (p) => setMessages(prev => [...prev.slice(-199), p.new as any]))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "paid_livestream_chat" },
        (p) => setMessages(prev => prev.filter(m => m.id !== (p.old as any).id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [hasAccess]);

  // Viewers presence
  useEffect(() => {
    if (!hasAccess || !user) return;
    const ch = supabase.channel("paid-stream-presence", { config: { presence: { key: user.id } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      setViewers(Object.keys(state).length);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
    });
    return () => { supabase.removeChannel(ch); };
  }, [hasAccess, user?.id]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Pre-show: countdown if start_time is in future
  const countdown = settings?.start_time ? formatCountdown(new Date(settings.start_time)) : null;
  const isPreShow = countdown !== null && !settings?.is_live;

  // Initialize ART Player for IDN
  useEffect(() => {
    if (!hasAccess || isPreShow) return;
    if (serverChoice !== "idn") {
      // Cleanup if switching away
      if (artRef.current) { artRef.current.destroy(false); artRef.current = null; }
      return;
    }
    if (!playerRef.current) return;
    if (artRef.current) { artRef.current.destroy(false); artRef.current = null; }

    const sessionToken = supabase.auth.getSession();
    sessionToken.then(({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      const proxyPlaylist = `${PROXY_URL}?type=playlist`;

      const art = new Artplayer({
        container: playerRef.current!,
        url: proxyPlaylist,
        type: "m3u8",
        autoplay: true,
        muted: false,
        playsInline: true,
        setting: true,
        fullscreen: true,
        fullscreenWeb: true,
        pip: true,
        autoOrientation: true,
        airplay: true,
        theme: "#ef4444",
        moreVideoAttr: { crossOrigin: "anonymous" },
        customType: {
          m3u8: function (video: HTMLVideoElement, url: string) {
            if (Hls.isSupported()) {
              const hls = new Hls({
                xhrSetup: (xhr) => {
                  xhr.setRequestHeader("Authorization", `Bearer ${token}`);
                  xhr.setRequestHeader("apikey", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
                },
                lowLatencyMode: true,
                maxBufferLength: 10,
              });
              hls.loadSource(url);
              hls.attachMedia(video);
              (art as any).hls = hls;
              art.on("destroy", () => hls.destroy());

              hls.on(Hls.Events.MANIFEST_PARSED, () => {
                const levels = hls.levels.map((l, i) => ({
                  html: l.height ? `${l.height}p` : `Level ${i}`,
                  level: i,
                }));
                art.setting.update({
                  name: "Resolusi",
                  html: "Resolusi",
                  tooltip: "Auto",
                  selector: [{ html: "Auto", level: -1, default: true }, ...levels],
                  onSelect: (item: any) => {
                    hls.currentLevel = item.level;
                    return item.html;
                  },
                });
              });
            } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
              video.src = url;
            }
          },
        },
      });

      // Wake lock + landscape on fullscreen
      let wakeLock: any = null;
      const onFsChange = async () => {
        const isFs = !!document.fullscreenElement;
        if (isFs) {
          try {
            if ("wakeLock" in navigator) wakeLock = await (navigator as any).wakeLock.request("screen");
          } catch {}
          try {
            const so = (screen as any).orientation;
            if (so?.lock) await so.lock("landscape");
          } catch {}
        } else {
          try { await wakeLock?.release(); } catch {}
          wakeLock = null;
          try { (screen as any).orientation?.unlock?.(); } catch {}
        }
      };
      document.addEventListener("fullscreenchange", onFsChange);
      art.on("destroy", () => document.removeEventListener("fullscreenchange", onFsChange));

      artRef.current = art;
    });

    return () => {
      if (artRef.current) { artRef.current.destroy(false); artRef.current = null; }
    };
  }, [hasAccess, isPreShow, serverChoice]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !user) return;
    setInput("");
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      user_id: user.id,
      username: profile?.username || "User",
      profile_photo: profile?.profile_photo ?? null,
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    const { error } = await supabase.from("paid_livestream_chat").insert({
      user_id: user.id,
      username: profile?.username || "User",
      profile_photo: profile?.profile_photo ?? null,
      content: text,
    });
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      toast.error("Gagal kirim");
    }
  };

  const deleteMessage = async (id: string) => {
    if (!isOwner) return;
    await supabase.from("paid_livestream_chat").delete().eq("id", id);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground">Memuat...</div>
    </div>;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
        </Button>
        <Card className="max-w-md mx-auto p-6 text-center">
          <div className="text-5xl mb-3">🔒</div>
          <h2 className="text-xl font-bold mb-2">Akses Terbatas</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Email <span className="font-bold">{user?.email}</span> belum terdaftar untuk menonton livestream berbayar.
          </p>
          <p className="text-xs text-muted-foreground">
            Silakan hubungi admin untuk mendapatkan akses.
          </p>
          <a
            href="https://wa.me/6282135963767"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[hsl(142,70%,45%)] text-white text-sm font-bold"
          >
            💬 Hubungi Admin
          </a>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate">{settings?.title || "Live Berbayar"}</div>
          <div className="text-[10px] text-muted-foreground flex items-center gap-2">
            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{viewers}</span>
            {accessExpiry && <span>• Akses sampai {new Date(accessExpiry).toLocaleDateString("id-ID")}</span>}
          </div>
        </div>
      </div>

      {/* Server switcher */}
      <div className="px-4 py-2 flex gap-2 border-b">
        <Button
          size="sm"
          variant={serverChoice === "youtube" ? "default" : "outline"}
          onClick={() => setServerChoice("youtube")}
          className="flex-1 h-8 text-xs"
        >
          <Server className="h-3 w-3 mr-1" /> YouTube
        </Button>
        <Button
          size="sm"
          variant={serverChoice === "idn" ? "default" : "outline"}
          onClick={() => setServerChoice("idn")}
          className="flex-1 h-8 text-xs"
        >
          <Server className="h-3 w-3 mr-1" /> IDN
        </Button>
      </div>

      {/* Player area */}
      <div className="relative w-full aspect-video bg-black">
        {isPreShow ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-white"
            style={{
              backgroundImage: settings?.background_url ? `url(${settings.background_url})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative text-center p-4">
              <div className="text-xs mb-2 opacity-80">Siaran dimulai dalam</div>
              <div className="flex gap-2 justify-center font-mono">
                {countdown!.d > 0 && (
                  <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2">
                    <div className="text-2xl font-bold">{countdown!.d}</div>
                    <div className="text-[10px]">HARI</div>
                  </div>
                )}
                <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2">
                  <div className="text-2xl font-bold">{String(countdown!.h).padStart(2, "0")}</div>
                  <div className="text-[10px]">JAM</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2">
                  <div className="text-2xl font-bold">{String(countdown!.m).padStart(2, "0")}</div>
                  <div className="text-[10px]">MNT</div>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-2">
                  <div className="text-2xl font-bold">{String(countdown!.s).padStart(2, "0")}</div>
                  <div className="text-[10px]">DTK</div>
                </div>
              </div>
              <div className="mt-3 font-bold">{settings?.title}</div>
              {settings?.description && (
                <div className="text-xs opacity-80 mt-1 max-w-xs mx-auto">{settings.description}</div>
              )}
            </div>
          </div>
        ) : serverChoice === "youtube" ? (
          settings?.youtube_url ? (
            <iframe
              key={settings.youtube_url}
              src={`https://www.youtube.com/embed/${extractYouTubeId(settings.youtube_url)}?autoplay=1&rel=0&modestbranding=1`}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Live"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              Server YouTube belum dikonfigurasi
            </div>
          )
        ) : (
          settings?.m3u8_url ? (
            <div ref={playerRef} className="w-full h-full" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              Server IDN belum dikonfigurasi
            </div>
          )
        )}
      </div>

      {/* Info */}
      <div className="px-4 py-3 border-b bg-card">
        <div className="flex items-start gap-3">
          {settings?.logo_url && (
            <img src={settings.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-cover" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm">{settings?.title}</div>
            {settings?.description && (
              <div className="text-xs text-muted-foreground mt-0.5">{settings.description}</div>
            )}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="px-4 py-2">
        <div className="text-xs font-bold text-muted-foreground mb-2">💬 Chat Live</div>
        <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
          {messages.map(m => {
            const isMe = m.user_id === user?.id;
            return (
              <div key={m.id} className={`flex items-start gap-2 group ${isMe ? "flex-row-reverse" : ""}`}>
                <div className={`flex-1 ${isMe ? "text-right" : ""}`}>
                  <div className="text-[10px] text-muted-foreground">{m.username}</div>
                  <div className={`inline-block px-2 py-1 rounded-lg text-xs max-w-[80%] break-words ${
                    isMe ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}>
                    {m.content}
                  </div>
                </div>
                {isOwner && (
                  <button
                    onClick={() => deleteMessage(m.id)}
                    className="opacity-0 group-hover:opacity-100 text-destructive p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-2 flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
          placeholder="Tulis pesan..."
          maxLength={200}
          className="flex-1 h-9 text-sm"
        />
        <Button size="sm" onClick={sendMessage} disabled={!input.trim()} className="h-9">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PaidLiveStream;
