import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Upload, X, Crown, Plus } from "lucide-react";
import PaidLineupManager from "./PaidLineupManager";

interface Settings {
  id?: string;
  active_server: "youtube" | "idn" | "rtmp";
  youtube_url: string;
  m3u8_url: string;
  rtmp_url: string;
  title: string;
  description: string;
  logo_url: string;
  background_url: string;
  start_time: string | null;
  is_live: boolean;
}

interface PremiumUser {
  user_id: string;
  username: string;
  profile_code: string;
  premium_plan: string;
  premium_until: string;
}

const PaidLivePanel = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [premiumUsers, setPremiumUsers] = useState<PremiumUser[]>([]);
  const [code, setCode] = useState("");
  const [plan, setPlan] = useState<"weekly" | "monthly">("weekly");
  const [granting, setGranting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [, setTick] = useState(0);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1000); return () => clearInterval(t); }, []);

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

  const loadPremium = async () => {
    const { data } = await supabase.rpc('list_premium_users' as any);
    if (data) setPremiumUsers(data as any);
  };

  const load = async () => {
    const { data: settings } = await supabase.from("paid_livestream_settings").select("*").limit(1).maybeSingle();
    if (settings) setS(settings as any);
    await loadPremium();
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("owner-paidlive-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "paid_livestream_settings" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => loadPremium())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const grantPremium = async () => {
    const c = code.trim().replace('#', '').toUpperCase();
    if (c.length < 3) { toast.error("Masukkan ID pembeli (mis: #A3F9)"); return; }
    setGranting(true);
    const { data, error } = await supabase.rpc('grant_premium_by_code' as any, { _code: c, _plan: plan });
    setGranting(false);
    const res: any = data;
    if (error || !res?.success) {
      toast.error(res?.error || error?.message || "Gagal");
      return;
    }
    toast.success(`✅ ${res.username} → Premium ${plan === 'weekly' ? 'Mingguan' : 'Bulanan'}`);
    setCode("");
    loadPremium();
  };

  const revokePremium = async (c: string) => {
    const { error } = await supabase.rpc('revoke_premium_by_code' as any, { _code: c });
    if (error) toast.error(error.message);
    else { toast.success("Premium dicabut"); loadPremium(); }
  };

  const saveSettings = async () => {
    if (!s) return;
    setSaving(true);
    const { error } = await supabase.from("paid_livestream_settings")
      .update({
        active_server: s.active_server,
        youtube_url: s.youtube_url,
        m3u8_url: s.m3u8_url,
        rtmp_url: s.rtmp_url,
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

  const formatRemaining = (until: string) => {
    const ms = new Date(until).getTime() - Date.now();
    if (ms <= 0) return "Habis";
    const d = Math.floor(ms / 86400000);
    const h = Math.floor((ms % 86400000) / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (d > 0) return `${d}h ${h}j`;
    if (h > 0) return `${h}j ${m}m`;
    return `${m}m`;
  };

  if (!s) return <div className="text-sm text-muted-foreground">Memuat...</div>;

  const startTimeLocal = s.start_time
    ? new Date(new Date(s.start_time).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
    : "";

  return (
    <div className="space-y-4">
      {/* Premium Membership */}
      <Card className="p-4 space-y-3 border-primary/30">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Membership Premium</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Tambahkan ID pembeli (kode 4-digit, contoh: <span className="font-mono font-bold text-primary">#A3F9</span>) dan pilih durasi. Akun otomatis jadi premium.
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="#A3F9"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            className="flex-1 font-mono uppercase"
            maxLength={5}
            onKeyDown={e => e.key === 'Enter' && grantPremium()}
          />
          <select
            value={plan}
            onChange={e => setPlan(e.target.value as any)}
            className="px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="weekly">Mingguan (7 hari)</option>
            <option value="monthly">Bulanan (30 hari)</option>
          </select>
          <Button onClick={grantPremium} disabled={granting} size="sm">
            <Plus className="h-4 w-4 mr-1" /> {granting ? "..." : "Add"}
          </Button>
        </div>

        <div className="space-y-1.5 max-h-80 overflow-y-auto pt-2 border-t border-border">
          <div className="text-xs font-semibold text-muted-foreground mb-2">Akun Premium Aktif ({premiumUsers.length})</div>
          {premiumUsers.map(u => (
            <div key={u.user_id} className="flex items-center gap-2 p-2 rounded border border-primary/20 bg-primary/5">
              <Crown className="w-4 h-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold truncate">{u.username}</span>
                  <span className="text-[10px] font-mono text-primary">#{u.profile_code}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold uppercase">{u.premium_plan}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Sisa: <span className="font-bold text-foreground">{formatRemaining(u.premium_until)}</span> · sampai {new Date(u.premium_until).toLocaleString("id-ID")}
                </div>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => revokePremium(u.profile_code)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {premiumUsers.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">Belum ada akun premium</div>
          )}
        </div>
      </Card>

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
          <label className="text-xs font-medium">URL YouTube</label>
          <Input value={s.youtube_url} onChange={e => setS({ ...s, youtube_url: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..." />
        </div>

        <div>
          <label className="text-xs font-medium">URL M3U8 (server IDN)</label>
          <Input value={s.m3u8_url} onChange={e => setS({ ...s, m3u8_url: e.target.value })}
            placeholder="https://...m3u8" />
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
                <Upload className="w-3 h-3 mr-1" /> {uploadingLogo ? "..." : "Pilih"}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Background</label>
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
                <Upload className="w-3 h-3 mr-1" /> {uploadingBg ? "..." : "Pilih"}
              </Button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium">Waktu Mulai (countdown)</label>
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

      <PaidLineupManager />
    </div>
  );
};

export default PaidLivePanel;
