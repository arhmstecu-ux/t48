import { useState } from 'react';
import Header from '@/components/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Calendar, Ticket, Video, Info, ChevronDown, Camera, Users } from 'lucide-react';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Tables } from '@/integrations/supabase/types';

const typeConfig: Record<string, { icon: any; label: string; color: string; tag: string }> = {
  show: { icon: Ticket, label: 'Show', color: 'bg-primary/10 text-primary', tag: 'SHOW' },
  '2s': { icon: Camera, label: '2-Shot', color: 'bg-pink-500/10 text-pink-500', tag: '2S' },
  mng: { icon: Users, label: 'Meet & Greet', color: 'bg-emerald-500/10 text-emerald-500', tag: 'MNG' },
  vc: { icon: Video, label: 'Video Call', color: 'bg-accent/10 text-accent', tag: 'VC' },
  other: { icon: Info, label: 'Pengumuman', color: 'bg-warning/10 text-warning', tag: 'INFO' },
};

type AnnouncementRow = Tables<'announcements'> & { image_url?: string };

const AnnouncementCard = ({ item, index }: { item: AnnouncementRow; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = typeConfig[item.type as string] || typeConfig.other;
  const Icon = cfg.icon;
  const hasDetail = item.description || (item as any).image_url;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className="glass-card rounded-2xl overflow-hidden group">
      {/* Image banner if present */}
      {(item as any).image_url && (
        <div className="w-full h-48 overflow-hidden">
          <img src={(item as any).image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        </div>
      )}
      <button onClick={() => hasDetail && setExpanded(!expanded)} className="w-full p-5 text-left">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color} uppercase tracking-wider`}>{cfg.tag}</span>
            </div>
            <h3 className="font-bold text-foreground leading-snug">{item.title}</h3>
            {item.date && (
              <p className="text-xs font-medium text-primary mt-1.5">
                📅 {new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {' • '}🕐 {new Date(item.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </p>
            )}
          </div>
          {hasDetail && (
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
          )}
        </div>
      </button>
      <AnimatePresence>
        {expanded && hasDetail && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-5 pb-5 pt-0 border-t border-border/30 mx-5">
              {item.description && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{item.description}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const PastCard = ({ item }: { item: AnnouncementRow }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = typeConfig[item.type as string] || typeConfig.other;
  const Icon = cfg.icon;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.color} uppercase`}>{cfg.tag}</span>
              <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
            </div>
            {item.date && <p className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      <AnimatePresence>
        {expanded && (item.description || (item as any).image_url) && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 pb-4 border-t border-border/30 mx-4">
              {(item as any).image_url && <img src={(item as any).image_url} alt="" className="w-full h-32 object-cover rounded-lg mt-3" />}
              {item.description && <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{item.description}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

type CategoryKey = 'all' | 'show' | '2s' | 'mng' | 'vc' | 'other';

const Announcements = () => {
  const { data: announcements, loading } = useRealtimeTable<AnnouncementRow>('announcements');
  const [filter, setFilter] = useState<CategoryKey>('all');

  const now = new Date();
  const allSorted = [...announcements].sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime());

  const filtered = filter === 'all' ? allSorted : allSorted.filter(a => a.type === filter);
  const upcoming = filtered.filter(a => a.date && new Date(a.date) >= now);
  const past = filtered.filter(a => a.date && new Date(a.date) < now);

  const categories: { key: CategoryKey; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'show', label: 'Show' },
    { key: '2s', label: '2-Shot' },
    { key: 'mng', label: 'MNG' },
    { key: 'vc', label: 'VC' },
    { key: 'other', label: 'Info' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gradient mb-2">
            <Megaphone className="inline w-8 h-8 mr-2" />Pengumuman
          </h1>
          <p className="text-muted-foreground text-sm">Jadwal show, 2S, MNG, VC & pengumuman terbaru</p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(c => (
            <button key={c.key} onClick={() => setFilter(c.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filter === c.key ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12"><p className="text-muted-foreground">Memuat...</p></div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> Akan Datang
                </h2>
                <div className="space-y-3">
                  {upcoming.map((item, i) => (
                    <AnnouncementCard key={item.id} item={item} index={i} />
                  ))}
                </div>
              </div>
            )}

            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-muted-foreground mb-3">Sudah Berlalu</h2>
                <div className="space-y-2 opacity-60">
                  {past.map(item => <PastCard key={item.id} item={item} />)}
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-20">
                <span className="text-6xl block mb-4">📋</span>
                <p className="text-muted-foreground">Tidak ada pengumuman.</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Announcements;
