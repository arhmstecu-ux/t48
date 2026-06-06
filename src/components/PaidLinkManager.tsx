import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Link2, Trash2, Copy, Ban, Users, User, Plus } from "lucide-react";

interface WatchLink {
  id: string;
  token: string;
  link_type: "single" | "group";
  max_uses: number;
  used_count: number;
  label: string | null;
  expires_at: string;
  revoked: boolean;
  created_at: string;
}

const PaidLinkManager = () => {
  const [links, setLinks] = useState<WatchLink[]>([]);
  const [type, setType] = useState<"single" | "group">("single");
  const [max, setMax] = useState<number>(150);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1000); return () => clearInterval(t); }, []);

  const load = async () => {
    const { data } = await supabase.rpc("list_paid_links" as any);
    if (data) setLinks(data as any);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("owner-paid-links-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "paid_livestream_links" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "paid_livestream_link_claims" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const create = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("create_paid_link" as any, {
      _type: type, _max: type === "single" ? 1 : max, _label: label,
    });
    setBusy(false);
    const res: any = data;
    if (error || !res?.success) {
      toast.error(res?.error || error?.message || "Gagal");
      return;
    }
    toast.success(`✅ Link dibuat — T4-${res.suffix}`);
    setLabel("");
    load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("paid_livestream_links" as any).update({ revoked: true }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Link dicabut"); load(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("paid_livestream_links" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Link dihapus"); load(); }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/live-paid?t=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link disalin");
  };

  const formatRemaining = (until: string) => {
    const ms = new Date(until).getTime() - Date.now();
    if (ms <= 0) return "Habis";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return `${h}j ${m}m`;
    return `${m}m`;
  };

  return (
    <Card className="p-4 space-y-3 border-chart-4/30">
      <div className="flex items-center gap-2">
        <Link2 className="w-5 h-5 text-chart-4" />
        <h3 className="font-bold">Link Nonton (24 Jam)</h3>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Buat link tonton tanpa login. Watermark otomatis <span className="font-mono font-bold text-foreground">T4-XXXX</span> (4 karakter terakhir token).
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant={type === "single" ? "default" : "outline"} onClick={() => setType("single")}>
          <User className="w-3 h-3 mr-1" /> 1 Orang
        </Button>
        <Button size="sm" variant={type === "group" ? "default" : "outline"} onClick={() => setType("group")}>
          <Users className="w-3 h-3 mr-1" /> Grup (max 150)
        </Button>
      </div>

      {type === "group" && (
        <div>
          <label className="text-xs font-medium">Kapasitas (1-150)</label>
          <Input type="number" min={1} max={150} value={max} onChange={e => setMax(Math.max(1, Math.min(150, Number(e.target.value) || 1)))} />
        </div>
      )}

      <div>
        <label className="text-xs font-medium">Label (opsional)</label>
        <Input placeholder="mis: Grup VIP Sabtu" value={label} onChange={e => setLabel(e.target.value)} maxLength={60} />
      </div>

      <Button onClick={create} disabled={busy} className="w-full">
        <Plus className="w-4 h-4 mr-1" /> {busy ? "Membuat..." : "Buat Link"}
      </Button>

      <div className="space-y-1.5 max-h-96 overflow-y-auto pt-2 border-t border-border">
        <div className="text-xs font-semibold text-muted-foreground mb-2">
          Link Aktif ({links.filter(l => !l.revoked && new Date(l.expires_at).getTime() > Date.now()).length}/{links.length})
        </div>
        {links.map(l => {
          const expired = new Date(l.expires_at).getTime() <= Date.now();
          const full = l.used_count >= l.max_uses;
          const dead = l.revoked || expired;
          return (
            <div key={l.id} className={`p-2 rounded border text-xs space-y-1 ${dead ? "border-border bg-muted/30 opacity-60" : full ? "border-destructive/40 bg-destructive/5" : "border-chart-4/30 bg-chart-4/5"}`}>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-foreground">T4-{l.token.slice(-4)}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${l.link_type === "single" ? "bg-primary/20 text-primary" : "bg-chart-4/20 text-chart-4"}`}>
                  {l.link_type === "single" ? "1 Orang" : `Grup ${l.max_uses}`}
                </span>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {l.used_count}/{l.max_uses} dipakai
                </span>
              </div>
              {l.label && <div className="text-[10px] text-muted-foreground truncate">{l.label}</div>}
              <div className="text-[10px] text-muted-foreground">
                {l.revoked ? "❌ Dicabut" : expired ? "⏰ Kadaluarsa" : `⏳ Sisa ${formatRemaining(l.expires_at)}`}
              </div>
              <div className="flex gap-1 pt-1">
                <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] flex-1" onClick={() => copyLink(l.token)} disabled={dead}>
                  <Copy className="w-3 h-3 mr-1" /> Salin Link
                </Button>
                {!l.revoked && !expired && (
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] text-destructive" onClick={() => revoke(l.id)}>
                    <Ban className="w-3 h-3" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => remove(l.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
        {links.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4">Belum ada link</div>
        )}
      </div>
    </Card>
  );
};

export default PaidLinkManager;
