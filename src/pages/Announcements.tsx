import { useState } from 'react';
import Header from '@/components/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Calendar, Ticket, Video, Info, ChevronDown } from 'lucide-react';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Tables } from '@/integrations/supabase/types';

const typeConfig = {
  show: { icon: Ticket, label: 'Show', color: 'bg-primary/10 text-primary' },
  vc: { icon: Video, label: 'Video Call', color: 'bg-accent/10 text-accent' },
  other: { icon: Info, label: 'Event', color: 'bg-warning/10 text-warning' },
};

const AnnouncementCard = ({ item, index }: { item: Tables<'announcements'>; index: number }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = typeConfig[item.type as keyof typeof typeConfig] || typeConfig.other;
  const Icon = cfg.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className="glass-card rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-5 text-left">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
            <h3 className="font-bold text-foreground mt-1">{item.title}</h3>
            {item.date && (
              <p className="text-xs font-medium text-primary mt-1">
                📅 {new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {' • '}🕐 {new Date(item.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </p>
            )}
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      <AnimatePresence>
        {expanded && item.description && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-5 pb-5 pt-0 border-t border-border/30 mx-5">
              <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{item.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const PastCard = ({ item }: { item: Tables<'announcements'> }) => {
  const [expanded, setExpanded] = useState(false);
  const cfg = typeConfig[item.type as keyof typeof typeConfig] || typeConfig.other;
  const Icon = cfg.icon;

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full p-4 text-left">
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
            {item.date && <p className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
          </div>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      <AnimatePresence>
        {expanded && item.description && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 pb-4 border-t border-border/30 mx-4">
              <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{item.description}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Announcements = () => {
  const { data: announcements, loading } = useRealtimeTable<Tables<'announcements'>>('announcements');

  const now = new Date();
  const allSorted = [...announcements].sort((a, b) => new Date(a.date || '').getTime() - new Date(b.date || '').getTime());

  // Separate by type: show vs pm (vc/other)
  const showAnnouncements = allSorted.filter(a => a.type === 'show');
  const pmAnnouncements = allSorted.filter(a => a.type !== 'show');

  const upcomingShows = showAnnouncements.filter(a => a.date && new Date(a.date) >= now);
  const pastShows = showAnnouncements.filter(a => a.date && new Date(a.date) < now);
  const upcomingPM = pmAnnouncements.filter(a => a.date && new Date(a.date) >= now);
  const pastPM = pmAnnouncements.filter(a => a.date && new Date(a.date) < now);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gradient mb-2">
            <Megaphone className="inline w-8 h-8 mr-2" />Pengumuman JKT48
          </h1>
          <p className="text-muted-foreground">Klik judul untuk melihat detail</p>
        </div>

        {loading ? (
          <div className="text-center py-12"><p className="text-muted-foreground">Memuat...</p></div>
        ) : (
          <>
            {/* SHOW SECTION */}
            <div className="mb-6">
              <h2 className="text-xl font-extrabold text-foreground mb-4 flex items-center gap-2">
                <Ticket className="w-6 h-6 text-primary" /> Show
              </h2>

              {upcomingShows.length > 0 && (
                <>
                  <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Akan Datang
                  </h3>
                  <div className="space-y-3 mb-4">
                    {upcomingShows.map((item, i) => (
                      <AnnouncementCard key={item.id} item={item} index={i} />
                    ))}
                  </div>
                </>
              )}

              {pastShows.length > 0 && (
                <>
                  <h3 className="text-sm font-bold text-muted-foreground mb-2">Sudah Berlalu</h3>
                  <div className="space-y-2 opacity-60">
                    {pastShows.map(item => <PastCard key={item.id} item={item} />)}
                  </div>
                </>
              )}

              {showAnnouncements.length === 0 && (
                <p className="text-muted-foreground text-sm py-4">Tidak ada pengumuman show.</p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t-2 border-border my-8" />

            {/* PM SECTION */}
            <div>
              <h2 className="text-xl font-extrabold text-foreground mb-4 flex items-center gap-2">
                <Video className="w-6 h-6 text-accent" /> PM & Event
              </h2>

              {upcomingPM.length > 0 && (
                <>
                  <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" /> Akan Datang
                  </h3>
                  <div className="space-y-3 mb-4">
                    {upcomingPM.map((item, i) => (
                      <AnnouncementCard key={item.id} item={item} index={i} />
                    ))}
                  </div>
                </>
              )}

              {pastPM.length > 0 && (
                <>
                  <h3 className="text-sm font-bold text-muted-foreground mb-2">Sudah Berlalu</h3>
                  <div className="space-y-2 opacity-60">
                    {pastPM.map(item => <PastCard key={item.id} item={item} />)}
                  </div>
                </>
              )}

              {pmAnnouncements.length === 0 && (
                <p className="text-muted-foreground text-sm py-4">Tidak ada pengumuman PM/Event.</p>
              )}
            </div>

            {announcements.length === 0 && (
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
