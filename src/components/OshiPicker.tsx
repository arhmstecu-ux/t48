import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { jkt48Members } from '@/data/members';
import { Search, X } from 'lucide-react';

interface OshiPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (memberId: number) => void;
  currentId?: number | null;
}

const OshiPicker = ({ open, onClose, onSelect, currentId }: OshiPickerProps) => {
  const [search, setSearch] = useState('');

  // Exclude JKT48TV-style members & inactive (suspended). Use active/trainee for picking.
  const list = useMemo(() => jkt48Members.filter(m =>
    m.status !== 'suspended' &&
    (m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.nickname.toLowerCase().includes(search.toLowerCase()))
  ), [search]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-gradient">Pilih Oshi-mu 💖</DialogTitle>
        </DialogHeader>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama member..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card text-foreground text-sm" />
        </div>
        <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-1">
          {list.map(m => (
            <button key={m.id} onClick={() => { onSelect(m.id); onClose(); }}
              className={`relative rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${currentId === m.id ? 'border-primary ring-2 ring-primary/40' : 'border-border'}`}>
              <div className="aspect-square bg-secondary">
                {m.photo ? (
                  <img src={m.photo} alt={m.nickname} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🎤</div>
                )}
              </div>
              <div className="px-1 py-1 text-xs font-bold text-foreground truncate text-center bg-card">{m.nickname}</div>
              {currentId === m.id && (
                <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 grid place-items-center text-xs">✓</div>
              )}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OshiPicker;
