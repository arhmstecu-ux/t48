import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music2, Video as VideoIcon, ArrowLeft, Lock, Play, Pause, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Song {
  id: string;
  title: string;
  artist: string;
  video_url: string;
  thumbnail_url: string;
  duration_seconds: number;
  position: number;
}

const fmtTime = (s: number) => {
  if (!s || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60); const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
};

const Playlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<Song[]>([]);
  const [active, setActive] = useState<Song | null>(null);
  const [mode, setMode] = useState<"audio" | "video">("audio");
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("songs").select("*").order("position", { ascending: true }).order("created_at", { ascending: false });
      if (data) setSongs(data as any);
    };
    load();
    const ch = supabase.channel("songs-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "songs" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const openSong = (s: Song, m: "audio" | "video") => {
    if (m === "video" && !user) {
      toast.error("Login dulu untuk menonton video");
      navigate("/login"); return;
    }
    setActive(s); setMode(m); setPlaying(true); setProgress(0); setDuration(0);
  };

  // Sync play/pause with active media element
  useEffect(() => {
    const el = mode === "audio" ? audioRef.current : videoRef.current;
    if (!el || !active) return;
    el.currentTime = 0;
    const onTime = () => setProgress(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onEnd = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    if (playing) el.play().catch(() => setPlaying(false));
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, [active?.id, mode]);

  useEffect(() => {
    const el = mode === "audio" ? audioRef.current : videoRef.current;
    if (!el) return;
    if (playing) el.play().catch(() => setPlaying(false));
    else el.pause();
  }, [playing, mode]);

  const seek = (p: number) => {
    const el = mode === "audio" ? audioRef.current : videoRef.current;
    if (el && duration) { el.currentTime = (p / 100) * duration; }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <Header />
      <main className="container mx-auto px-4 py-4 max-w-2xl">
        <button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center text-sm text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl gradient-primary grid place-items-center shadow-lg">
            <Music2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gradient">Playlist Lagu JKT48</h1>
            <p className="text-xs text-muted-foreground">Audio gratis · Video butuh login</p>
          </div>
        </div>

        <div className="space-y-2">
          {songs.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground">Belum ada lagu</Card>
          )}
          {songs.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className="p-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors">
                <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden shrink-0 grid place-items-center">
                  {s.thumbnail_url ? (
                    <img src={s.thumbnail_url} alt={s.title} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <Music2 className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{s.title}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{s.artist}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openSong(s, "audio")} className="h-8 px-2 gap-1">
                  <Music2 className="w-3 h-3" /> <span className="hidden sm:inline text-xs">Audio</span>
                </Button>
                <Button size="sm" onClick={() => openSong(s, "video")} className="h-8 px-2 gap-1 gradient-primary text-white">
                  {user ? <VideoIcon className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  <span className="hidden sm:inline text-xs">Video</span>
                </Button>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>

      {/* Persistent player bar */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur border-t border-border shadow-2xl"
          >
            <div className="container mx-auto max-w-2xl px-3 py-2">
              {mode === "video" && (
                <div className="rounded-lg overflow-hidden mb-2 bg-black">
                  <video
                    ref={videoRef}
                    src={active.video_url}
                    poster={active.thumbnail_url || undefined}
                    playsInline
                    controls
                    crossOrigin="anonymous"
                    className="w-full max-h-[50vh] object-contain"
                  />
                </div>
              )}
              {/* Audio element always present so audio mode works */}
              {mode === "audio" && (
                <audio ref={audioRef} src={active.video_url} preload="metadata" crossOrigin="anonymous" />
              )}

              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-md bg-secondary overflow-hidden shrink-0 grid place-items-center">
                  {active.thumbnail_url ? <img src={active.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Music2 className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate">{active.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{active.artist} · {mode === "audio" ? "Audio" : "Video"}</div>
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setPlaying(p => !p)}>
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 px-2 text-[10px]"
                  onClick={() => setMode(mode === "audio" ? "video" : "audio")}
                  disabled={mode === "audio" && !user}
                  title={!user && mode === "audio" ? "Login untuk video" : ""}
                >
                  {mode === "audio" ? <>Ke Video</> : <>Audio Saja</>}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setActive(null); setPlaying(false); }}>
                  ✕
                </Button>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground w-9 tabular-nums">{fmtTime(progress)}</span>
                <input
                  type="range" min={0} max={100} value={duration ? (progress / duration) * 100 : 0}
                  onChange={e => seek(parseFloat(e.target.value))}
                  className="flex-1 h-1 accent-primary"
                />
                <span className="text-[10px] text-muted-foreground w-9 tabular-nums">{fmtTime(duration)}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Playlist;
