import { useState } from 'react';
import Header from '@/components/Header';
import { motion } from 'framer-motion';
import { jkt48Members, getUpcomingBirthdays, formatBirthdate, getAge, JKT48Member } from '@/data/members';
import { Search, Cake, Star, Users } from 'lucide-react';

const Members = () => {
  const [selected, setSelected] = useState<JKT48Member | null>(null);
  const [search, setSearch] = useState('');
  const [filterGen, setFilterGen] = useState<number | 'all'>('all');

  const upcomingBirthdays = getUpcomingBirthdays(5);
  const generations = [...new Set(jkt48Members.map(m => m.generation))].sort((a, b) => a - b);

  const filtered = jkt48Members.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.nickname.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toString() === search ||
      m.fanbase.toLowerCase().includes(search.toLowerCase());
    const matchGen = filterGen === 'all' || m.generation === filterGen;
    return matchSearch && matchGen;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/20 text-success';
      case 'trainee': return 'bg-primary/20 text-primary';
      case 'hiatus': return 'bg-warning/20 text-warning';
      case 'suspended': return 'bg-destructive/20 text-destructive';
      default: return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'trainee': return 'Trainee';
      case 'hiatus': return 'Hiatus';
      case 'suspended': return 'Suspended';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-gradient mb-2">Member JKT48</h1>
          <p className="text-muted-foreground">Daftar lengkap 64 member JKT48 — Gen 3 sampai Gen 14</p>
        </div>

        {/* Upcoming Birthdays */}
        <div className="max-w-3xl mx-auto mb-8">
          <div className="glass-card rounded-2xl p-5 border-l-4 border-accent">
            <div className="flex items-center gap-2 mb-3">
              <Cake className="w-5 h-5 text-accent" />
              <h2 className="font-bold text-foreground text-lg">🎂 Ulang Tahun Mendatang</h2>
            </div>
            <div className="space-y-2">
              {upcomingBirthdays.map(m => {
                const [, month, day] = m.birthdate.split('-').map(Number);
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                return (
                  <div key={m.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-secondary/50 transition cursor-pointer" onClick={() => setSelected(m)}>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono bg-accent/10 text-accent px-2 py-0.5 rounded">#{String(m.id).padStart(2, '0')}</span>
                      <span className="font-semibold text-foreground text-sm">{m.nickname}</span>
                      <span className="text-xs text-muted-foreground">Gen {m.generation}</span>
                    </div>
                    <span className="text-sm font-medium text-accent">{day} {months[month - 1]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="max-w-3xl mx-auto mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, nickname, nomor, atau fanbase..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <select
            value={filterGen === 'all' ? 'all' : filterGen}
            onChange={e => setFilterGen(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">Semua Generasi</option>
            {generations.map(g => (
              <option key={g} value={g}>Generasi {g}</option>
            ))}
          </select>
        </div>

        <p className="text-center text-sm text-muted-foreground mb-4">
          <Users className="w-4 h-4 inline mr-1" />
          Menampilkan {filtered.length} dari {jkt48Members.length} member
        </p>

        {/* Member Detail Modal */}
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-foreground/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="glass-card rounded-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-4 gradient-primary flex items-center justify-center">
                <span className="text-3xl font-extrabold text-primary-foreground">{selected.nickname[0]}</span>
              </div>
              <div className="text-center mb-1">
                <span className="text-xs font-mono bg-accent/10 text-accent px-2 py-0.5 rounded">#{String(selected.id).padStart(2, '0')}</span>
              </div>
              <h2 className="text-xl font-extrabold text-gradient text-center mb-1">{selected.nickname}</h2>
              <p className="text-sm text-muted-foreground text-center mb-4">{selected.name}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Tanggal Lahir</span><span className="text-foreground font-medium">{formatBirthdate(selected.birthdate)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Usia</span><span className="text-foreground font-medium">{getAge(selected.birthdate)} tahun</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Generasi</span><span className="text-foreground font-medium">{selected.generation}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(selected.status)}`}>{getStatusLabel(selected.status)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Fanbase</span><span className="text-foreground font-medium">{selected.fanbase}</span></div>
              </div>
              <button onClick={() => setSelected(null)} className="w-full mt-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition">
                Tutup
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Member Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 max-w-5xl mx-auto">
          {filtered.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.5) }}
              className="glass-card rounded-2xl p-4 text-center cursor-pointer hover:scale-[1.03] transition-transform group"
              onClick={() => setSelected(member)}
            >
              <div className="w-14 h-14 mx-auto rounded-full overflow-hidden mb-2 gradient-primary flex items-center justify-center group-hover:shadow-lg transition-shadow">
                <span className="text-lg font-bold text-primary-foreground">{member.nickname[0]}</span>
              </div>
              <span className="text-[10px] font-mono bg-accent/10 text-accent px-1.5 py-0.5 rounded mb-1 inline-block">#{String(member.id).padStart(2, '0')}</span>
              <h3 className="font-bold text-foreground text-sm">{member.nickname}</h3>
              <p className="text-xs text-muted-foreground">Gen {member.generation}</p>
              {member.status !== 'active' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 inline-block ${getStatusBadge(member.status)}`}>
                  {getStatusLabel(member.status)}
                </span>
              )}
            </motion.div>
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground mt-8">Tidak ditemukan member yang cocok.</p>
        )}
      </main>
    </div>
  );
};

export default Members;
