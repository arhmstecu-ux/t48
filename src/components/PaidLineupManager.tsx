import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Plus, ArrowUp, ArrowDown, Search } from "lucide-react";
import { jkt48Members } from "@/data/members";

interface LineupRow {
  id: string;
  member_id: number;
  nickname: string;
  generation: number;
  photo_url: string | null;
  position: number;
}

const PaidLineupManager = () => {
  const [list, setList] = useState<LineupRow[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("paid_livestream_lineup")
      .select("*")
      .order("position", { ascending: true });
    if (data) setList(data as any);
  };

  useEffect(() => {
    load();
    const ch = supabase.channel("owner-lineup-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "paid_livestream_lineup" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const inLineup = useMemo(() => new Set(list.map(l => l.member_id)), [list]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return jkt48Members.filter(m =>
      !inLineup.has(m.id) &&
      (m.nickname.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || `gen${m.generation}`.includes(q))
    ).slice(0, 12);
  }, [search, inLineup]);

  const addMember = async (mId: number) => {
    const m = jkt48Members.find(x => x.id === mId);
    if (!m) return;
    const pos = (list[list.length - 1]?.position ?? -1) + 1;
    const tempId = `tmp-${Date.now()}`;
    setList(prev => [...prev, { id: tempId, member_id: m.id, nickname: m.nickname, generation: m.generation, photo_url: m.photo || null, position: pos }]);
    setSearch("");
    const { error } = await supabase.from("paid_livestream_lineup").insert({
      member_id: m.id, nickname: m.nickname, generation: m.generation, photo_url: m.photo || null, position: pos,
    });
    if (error) { setList(prev => prev.filter(x => x.id !== tempId)); toast.error(error.message); }
  };

  const remove = async (id: string) => {
    setList(prev => prev.filter(x => x.id !== id));
    await supabase.from("paid_livestream_lineup").delete().eq("id", id);
  };

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[i], b = list[j];
    const next = [...list];
    next[i] = { ...b, position: a.position };
    next[j] = { ...a, position: b.position };
    setList(next);
    await Promise.all([
      supabase.from("paid_livestream_lineup").update({ position: b.position }).eq("id", a.id),
      supabase.from("paid_livestream_lineup").update({ position: a.position }).eq("id", b.id),
    ]);
  };

  const clearAll = async () => {
    if (!confirm("Hapus semua line up?")) return;
    setList([]);
    await supabase.from("paid_livestream_lineup").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    toast.success("Line up dikosongkan");
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">🎤 Line Up Member ({list.length})</h3>
        {list.length > 0 && (
          <Button size="sm" variant="ghost" className="text-destructive text-xs h-7" onClick={clearAll}>Reset</Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input className="pl-7" placeholder="Cari member untuk ditambahkan..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {search && (
        <div className="grid grid-cols-3 gap-1.5">
          {filtered.map(m => (
            <button key={m.id} onClick={() => addMember(m.id)}
              className="flex items-center gap-1.5 p-1.5 rounded-lg border bg-card hover:bg-secondary text-left">
              {m.photo ? (
                <img src={m.photo} alt={m.nickname} loading="lazy" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-secondary" />
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-bold truncate">{m.nickname}</div>
                <div className="text-[9px] text-muted-foreground">Gen {m.generation}</div>
              </div>
              <Plus className="w-3 h-3 ml-auto text-primary" />
            </button>
          ))}
          {filtered.length === 0 && <div className="col-span-3 text-xs text-muted-foreground text-center py-2">Tidak ada hasil</div>}
        </div>
      )}

      <div className="space-y-1.5 max-h-80 overflow-y-auto">
        {list.map((l, i) => (
          <div key={l.id} className="flex items-center gap-2 p-1.5 rounded border bg-card">
            <span className="text-[10px] font-mono text-muted-foreground w-5 text-center">{i + 1}</span>
            {l.photo_url ? (
              <img src={l.photo_url} alt={l.nickname} loading="lazy" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-secondary" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate">{l.nickname}</div>
              <div className="text-[9px] text-muted-foreground">Gen {l.generation}</div>
            </div>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(i, -1)} disabled={i === 0}>
              <ArrowUp className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(i, 1)} disabled={i === list.length - 1}>
              <ArrowDown className="w-3 h-3" />
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => remove(l.id)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        {list.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">Belum ada line up</div>}
      </div>
    </Card>
  );
};

export default PaidLineupManager;
