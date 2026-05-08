import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Upload, Music2, GripVertical } from "lucide-react";
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

const SongsPanel = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("JKT48");
  const [thumb, setThumb] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data } = await supabase.from("songs").select("*").order("position", { ascending: true }).order("created_at", { ascending: false });
    if (data) setSongs(data as any);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("songs-admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "songs" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const uploadThumb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 3 * 1024 * 1024) { toast.error("Thumbnail maks 3MB"); return; }
    const path = `thumbs/${Date.now()}-${f.name.replace(/\s+/g, "_")}`;
    const { error } = await supabase.storage.from("songs").upload(path, f, { upsert: true, cacheControl: "86400" });
    if (error) { toast.error(error.message); return; }
    const { data } = supabase.storage.from("songs").getPublicUrl(path);
    setThumb(data.publicUrl);
    e.target.value = "";
    toast.success("Thumbnail siap");
  };

  const uploadAndAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (!title.trim()) { toast.error("Isi judul lagu dulu"); return; }
    if (f.size > 200 * 1024 * 1024) { toast.error("Video maks 200MB"); return; }
    if (!f.type.startsWith("video/")) { toast.error("File harus video MP4"); return; }
    setUploading(true); setProgress(0);
    const path = `videos/${Date.now()}-${f.name.replace(/\s+/g, "_")}`;

    // Read duration before uploading
    let duration = 0;
    try {
      duration = await new Promise<number>((resolve) => {
        const v = document.createElement("video");
        v.preload = "metadata";
        v.onloadedmetadata = () => { resolve(Math.floor(v.duration || 0)); URL.revokeObjectURL(v.src); };
        v.onerror = () => resolve(0);
        v.src = URL.createObjectURL(f);
      });
    } catch {}

    const { error } = await supabase.storage.from("songs").upload(path, f, { upsert: false, cacheControl: "31536000", contentType: f.type });
    if (error) { setUploading(false); toast.error(error.message); return; }
    const { data } = supabase.storage.from("songs").getPublicUrl(path);

    const nextPos = songs.length ? Math.max(...songs.map(s => s.position)) + 1 : 0;
    const { error: insErr } = await supabase.from("songs").insert({
      title: title.trim(), artist: artist.trim() || "JKT48",
      video_url: data.publicUrl, thumbnail_url: thumb || "",
      duration_seconds: duration, position: nextPos,
    });
    setUploading(false); setProgress(0);
    if (insErr) toast.error(insErr.message);
    else {
      toast.success("Lagu ditambahkan");
      setTitle(""); setArtist("JKT48"); setThumb("");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const remove = async (s: Song) => {
    if (!confirm(`Hapus "${s.title}"?`)) return;
    setSongs(prev => prev.filter(x => x.id !== s.id));
    await supabase.from("songs").delete().eq("id", s.id);
    // Try to remove storage file (best-effort)
    try {
      const url = new URL(s.video_url);
      const idx = url.pathname.indexOf("/songs/");
      if (idx >= 0) {
        const path = url.pathname.slice(idx + "/songs/".length);
        await supabase.storage.from("songs").remove([path]);
      }
    } catch {}
    toast.success("Dihapus");
  };

  const move = async (s: Song, dir: -1 | 1) => {
    const idx = songs.findIndex(x => x.id === s.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= songs.length) return;
    const a = songs[idx], b = songs[swapIdx];
    setSongs(prev => prev.map(x => x.id === a.id ? { ...x, position: b.position } : x.id === b.id ? { ...x, position: a.position } : x).sort((x, y) => x.position - y.position));
    await Promise.all([
      supabase.from("songs").update({ position: b.position }).eq("id", a.id),
      supabase.from("songs").update({ position: a.position }).eq("id", b.id),
    ]);
  };

  return (
    <Card className="p-4 space-y-3">
      <h3 className="font-bold flex items-center gap-2"><Music2 className="w-4 h-4" /> Playlist Lagu JKT48 ({songs.length})</h3>
      <p className="text-[11px] text-muted-foreground">Upload 1 file MP4 — sistem otomatis menyediakan mode <b>Audio</b> & <b>Video</b>.</p>

      <div className="space-y-2 p-3 rounded-lg bg-secondary/40 border">
        <Input placeholder="Judul lagu" value={title} onChange={e => setTitle(e.target.value)} />
        <Input placeholder="Artist (default: JKT48)" value={artist} onChange={e => setArtist(e.target.value)} />
        <div className="flex items-center gap-2">
          <input ref={thumbRef} type="file" accept="image/*" onChange={uploadThumb} className="hidden" />
          <Button size="sm" variant="outline" onClick={() => thumbRef.current?.click()} className="gap-1">
            <Upload className="w-3 h-3" /> Thumbnail
          </Button>
          {thumb && <img src={thumb} alt="" className="w-10 h-10 rounded object-cover border" />}
        </div>
        <input ref={fileRef} type="file" accept="video/mp4,video/*" onChange={uploadAndAdd} className="hidden" />
        <Button onClick={() => fileRef.current?.click()} disabled={uploading || !title.trim()} className="w-full gradient-primary text-white gap-1">
          <Plus className="w-4 h-4" /> {uploading ? `Mengunggah${progress ? ` ${progress}%` : "..."}` : "Pilih MP4 dari Galeri & Tambah"}
        </Button>
        {!title.trim() && <p className="text-[10px] text-destructive">Isi judul dulu sebelum upload.</p>}
      </div>

      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
        {songs.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 p-2 rounded border bg-card">
            <div className="flex flex-col">
              <button onClick={() => move(s, -1)} disabled={i === 0} className="text-[10px] disabled:opacity-30">▲</button>
              <button onClick={() => move(s, 1)} disabled={i === songs.length - 1} className="text-[10px] disabled:opacity-30">▼</button>
            </div>
            <div className="w-10 h-10 rounded bg-secondary overflow-hidden shrink-0 grid place-items-center">
              {s.thumbnail_url ? <img src={s.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Music2 className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{s.title}</div>
              <div className="text-[10px] text-muted-foreground truncate">{s.artist}{s.duration_seconds ? ` · ${Math.floor(s.duration_seconds/60)}:${(s.duration_seconds%60).toString().padStart(2,'0')}` : ""}</div>
            </div>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(s)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        ))}
        {songs.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">Belum ada lagu</div>}
      </div>
    </Card>
  );
};

export default SongsPanel;
