import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Plus, Upload, X, Copy, Ban, CheckCircle2 } from "lucide-react";
import { useRef } from "react";

interface Settings {
  id?: string;
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

interface Access {
  id: string;
  email: string;
  expires_at: string;
  note: string | null;
}

interface TokenRow {
  id: string;
  token: string;
  label: string | null;
  expires_at: string;
  banned: boolean;
}

const randToken = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

const PaidLivePanel = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [list, setList] = useState<Access[]>([]);
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newDays, setNewDays] = useState(7);
  const [newTokenLabel, setNewTokenLabel] = useState("");
  const [newTokenDays, setNewTokenDays] = useState(7);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File, kind: "logo" | "bg") => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Maks 5MB"); return null; }
    if (!file.type.startsWith("image/")) { toast.error("File harus gambar"); return null; }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${kind}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("paid-live").upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) { toast.error("Gagal upload: " + error.message); return null; }
    const { data } = supabase.storage.from("paid-live").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f || !s) return;
    setUploadingLogo(true);
    const url = await uploadImage(f, "logo");
    if (url) setS({ ...s, logo_url: url });
    setUploadingLogo(false);
    e.target.value = "";
  };

  const handleBgFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f || !s) return;
    setUploadingBg(true);
    const url = await uploadImage(f, "bg");
    if (url) setS({ ...s, background_url: url });
    setUploadingBg(false);
    e.target.value = "";
  };

  const load = async () => {
    const [{ data: settings }, { data: access }] = await Promise.all([
      supabase.from("paid_livestream_settings").select("*").limit(1).maybeSingle(),
      supabase.from("paid_livestream_access").select("*").order("expires_at", { ascending: false }),
    ]);
    if (settings) setS(settings as any);
    if (access) setList(access as any);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("owner-paidlive-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "paid_livestream_access" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "paid_livestream_settings" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const saveSettings = async () => {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase.from("paid_livestream_settings")
      .update({
        active_server: s.active_server,
        youtube_url: s.youtube_url,
        m3u8_url: s.m3u8_url,
        title: s.title,
        description: s.description,
        logo_url: s.logo_url,
        background_url: s.background_url,
        start_time: s.start_time,
        is_live: s.is_live,
        updated_at: new Date().toISOString(),
      })
      .eq("id", s.id!);
    setSaving(false);
    if (error) toast.error("Gagal simpan: " + error.message);
    else toast.success("Tersimpan");
  };

  const addAccess = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Email tidak valid");
      return;
    }
    const days = Math.max(1, newDays);
    const expires = new Date(Date.now() + days * 86400000);
    // Optimistic UI update so user doesn't feel any delay
    const tempId = `tmp-${Date.now()}`;
    setList(prev => {
      const without = prev.filter(a => a.email.toLowerCase() !== email);
      return [{ id: tempId, email, expires_at: expires.toISOString(), note: `${days} hari` }, ...without];
    });
    setNewEmail("");
    const { error } = await supabase.from("paid_livestream_access").upsert({
      email, expires_at: expires.toISOString(), note: `${days} hari`,
    }, { onConflict: "email" });
    if (error) {
      setList(prev => prev.filter(a => a.id !== tempId));
      toast.error(error.message);
    } else {
      toast.success(`${email} → ${days} hari`);
    }
  };

  const removeAccess = async (id: string) => {
    await supabase.from("paid_livestream_access").delete().eq("id", id);
    toast.success("Akses dicabut");
  };

  const extendAccess = async (a: Access, days: number) => {
    const base = Math.max(Date.now(), new Date(a.expires_at).getTime());
    const next = new Date(base + days * 86400000);
    await supabase.from("paid_livestream_access").update({ expires_at: next.toISOString() }).eq("id", a.id);
    toast.success(`+${days} hari`);
  };

  if (!s) return <div className="text-sm text-muted-foreground">Memuat...</div>;

  const startTimeLocal = s.start_time
    ? new Date(new Date(s.start_time).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    : "";

  return (
    <div className="space-y-4">
      {/* Settings */}
      <Card className="p-4 space-y-3">
        <h3 className="font-bold">⚙️ Pengaturan Siaran</h3>

        <div>
          <label className="text-xs font-medium">Server Aktif</label>
          <div className="flex gap-2 mt-1">
            <Button size="sm" variant={s.active_server === "youtube" ? "default" : "outline"}
              onClick={() => setS({ ...s, active_server: "youtube" })} className="flex-1">YouTube</Button>
            <Button size="sm" variant={s.active_server === "idn" ? "default" : "outline"}
              onClick={() => setS({ ...s, active_server: "idn" })} className="flex-1">IDN (M3U8)</Button>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium">URL YouTube (server YouTube)</label>
          <Input value={s.youtube_url} onChange={e => setS({ ...s, youtube_url: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..." />
        </div>

        <div>
          <label className="text-xs font-medium">URL M3U8 Asli (server IDN)</label>
          <Input value={s.m3u8_url} onChange={e => setS({ ...s, m3u8_url: e.target.value })}
            placeholder="https://...m3u8" />
          <p className="text-[10px] text-muted-foreground mt-1">URL ini disembunyikan, penonton hanya melihat URL proxy.</p>
        </div>

        <div>
          <label className="text-xs font-medium">Judul</label>
          <Input value={s.title} onChange={e => setS({ ...s, title: e.target.value })} />
        </div>

        <div>
          <label className="text-xs font-medium">Deskripsi</label>
          <Input value={s.description} onChange={e => setS({ ...s, description: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium">Logo</label>
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFile} className="hidden" />
            <div className="mt-1 flex items-center gap-2">
              {s.logo_url && (
                <div className="relative">
                  <img src={s.logo_url} alt="logo" className="w-12 h-12 rounded-lg object-cover border" />
                  <button onClick={() => setS({ ...s, logo_url: "" })}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                <Upload className="w-3 h-3 mr-1" /> {uploadingLogo ? "Upload..." : "Pilih"}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Background countdown</label>
            <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgFile} className="hidden" />
            <div className="mt-1 flex items-center gap-2">
              {s.background_url && (
                <div className="relative">
                  <img src={s.background_url} alt="bg" className="w-20 h-12 rounded-lg object-cover border" />
                  <button onClick={() => setS({ ...s, background_url: "" })}
                    className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <Button size="sm" variant="outline" onClick={() => bgInputRef.current?.click()} disabled={uploadingBg}>
                <Upload className="w-3 h-3 mr-1" /> {uploadingBg ? "Upload..." : "Pilih"}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium">Waktu Mulai (untuk countdown)</label>
          <Input type="datetime-local" value={startTimeLocal}
            onChange={e => setS({ ...s, start_time: e.target.value ? new Date(e.target.value).toISOString() : null })} />
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="islive" checked={s.is_live} onChange={e => setS({ ...s, is_live: e.target.checked })} />
          <label htmlFor="islive" className="text-xs">🔴 Sedang Live (skip countdown)</label>
        </div>

        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving ? "Menyimpan..." : "💾 Simpan Pengaturan"}
        </Button>
      </Card>

      {/* Access */}
      <Card className="p-4 space-y-3">
        <h3 className="font-bold">📧 Akses Email ({list.length})</h3>

        <div className="flex gap-2">
          <Input placeholder="email@gmail.com" value={newEmail}
            onChange={e => setNewEmail(e.target.value)} className="flex-1" />
          <Input type="number" min={1} value={newDays}
            onChange={e => setNewDays(parseInt(e.target.value || "1"))} className="w-20" />
          <Button onClick={addAccess} size="sm"><Plus className="h-4 w-4" /></Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Email + jumlah hari akses</p>

        <div className="space-y-1.5 max-h-80 overflow-y-auto">
          {list.map(a => {
            const expired = new Date(a.expires_at).getTime() < Date.now();
            return (
              <div key={a.id} className={`flex items-center gap-2 p-2 rounded border ${expired ? "opacity-50 bg-destructive/5" : "bg-card"}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{a.email}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {expired ? "❌ Kedaluwarsa" : "✅ Sampai"} {new Date(a.expires_at).toLocaleString("id-ID")}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => extendAccess(a, 7)}>+7h</Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => extendAccess(a, 30)}>+30h</Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeAccess(a.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
          {list.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">Belum ada akses</div>}
        </div>
      </Card>
    </div>
  );
};

export default PaidLivePanel;
