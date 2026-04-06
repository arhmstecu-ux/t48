import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import WelcomeAnimation from '@/components/WelcomeAnimation';
import HomeSlider from '@/components/HomeSlider';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { ShoppingBag, MessageCircle, Ticket, Users, Cake, Play, Megaphone, Trophy, Sparkles, MessagesSquare, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUpcomingBirthdays } from '@/data/members';
import { getActivePunishments } from '@/data/punishments';
import PunishmentCountdown from '@/components/PunishmentCountdown';
import AIChatWidget from '@/components/AIChatWidget';

const Index = () => {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);
  const upcomingBirthdays = getUpcomingBirthdays(3);
  const activePunishments = getActivePunishments();

  useEffect(() => {
    if (!user && !sessionStorage.getItem('welcomeShown')) {
      setShowWelcome(true);
      sessionStorage.setItem('welcomeShown', 'true');
    }
  }, [user]);

  return (
    <>
      {showWelcome && <WelcomeAnimation onComplete={() => setShowWelcome(false)} />}
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.5, type: 'spring', stiffness: 100 }}
            className="text-center mb-6"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold text-gradient mb-3">T48ID Store</h1>
            <p className="text-muted-foreground text-lg">Order Show & PM JKT48 — Produk resmi untuk fans sejati!</p>
          </motion.div>

          {/* Image Slider */}
          <div className="max-w-3xl mx-auto">
            <HomeSlider />
          </div>

          {/* Group Chat Promo */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="max-w-3xl mx-auto mb-6">
            <Link to="/group-chat" className="block">
              <div className="glass-card rounded-2xl p-5 border-l-4 border-success hover:shadow-xl transition-all duration-300 hover:scale-[1.01]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success flex items-center justify-center flex-shrink-0">
                    <MessagesSquare className="w-6 h-6 text-success-foreground" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-lg font-extrabold text-foreground">💬 Publik Chat T48</h2>
                    <p className="text-sm text-muted-foreground">Ngobrol bareng fans JKT48 lainnya! Kirim pesan & foto.</p>
                  </div>
                  <span className="text-primary text-sm font-bold">Gabung →</span>
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-3xl mx-auto mb-8">
            <div className="rounded-2xl overflow-hidden gradient-primary p-[2px]">
              <div className="bg-card rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl gradient-crimson flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-extrabold text-foreground mb-1">Membership Show JKT48</h2>
                    <p className="text-sm text-muted-foreground mb-3">Dapatkan akses membership show JKT48! Tonton pertunjukan reguler di theater.</p>
                    <span className="text-2xl font-extrabold text-gradient">Rp38.000</span>
                    <div className="mt-3">
                      <Link to="/show" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
                        <ShoppingBag className="w-4 h-4" /> Lihat Katalog Show
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="max-w-3xl mx-auto mb-10 grid gap-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Cara Membeli Show & PM</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Beli lewat katalog dan bayar pakai <strong className="text-accent">QRIS</strong>, <strong className="text-primary">DANA</strong>, atau <strong className="text-success">GoPay</strong>. Pilih metode pembayaran yang paling nyaman! 💰
                </p>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-success flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-success-foreground" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Butuh Bantuan?</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Hubungi admin kami melalui WhatsApp atau gunakan AI Customer Service di pojok kanan bawah!
                </p>
              </div>
            </motion.div>
          </div>

          {activePunishments.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="max-w-3xl mx-auto mb-8 space-y-4">
              {activePunishments.map(p => (
                <PunishmentCountdown key={p.memberId} punishment={p} />
              ))}
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="max-w-3xl mx-auto mb-10">
            <div className="glass-card rounded-2xl p-5 border-l-4 border-accent">
              <div className="flex items-center gap-2 mb-3">
                <Cake className="w-5 h-5 text-accent" />
                <h2 className="font-bold text-foreground">🎂 Ulang Tahun Terdekat</h2>
              </div>
              <div className="space-y-2">
                {upcomingBirthdays.map(m => {
                  const [, month, day] = m.birthdate.split('-').map(Number);
                  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
                  return (
                    <div key={m.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-accent/10 text-accent px-1.5 py-0.5 rounded">#{String(m.id).padStart(2, '0')}</span>
                        <span className="font-semibold text-foreground text-sm">{m.nickname}</span>
                      </div>
                      <span className="text-sm font-medium text-accent">{day} {months[month - 1]}</span>
                    </div>
                  );
                })}
              </div>
              <Link to="/members" className="mt-3 inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline">
                <Users className="w-4 h-4" /> Lihat Semua Member →
              </Link>
            </div>
          </motion.div>

          <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-6 gap-3">
            {[
              { to: '/show', icon: ShoppingBag, label: 'Katalog', color: 'text-primary', delay: 0.35 },
              { to: '/replay', icon: Play, label: 'Replay', color: 'text-accent', delay: 0.4 },
              { to: '/announcements', icon: Megaphone, label: 'Pengumuman', color: 'text-warning', delay: 0.45 },
              { to: '/ranking', icon: Trophy, label: 'Ranking', color: 'text-success', delay: 0.5 },
              { to: '/spin', icon: Sparkles, label: 'Spin', color: 'text-warning', delay: 0.55 },
              { to: '/live', icon: Radio, label: 'Live', color: 'text-destructive', delay: 0.6 },
            ].map(item => (
              <motion.div key={item.to} initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: item.delay, type: 'spring', stiffness: 200 }}>
                <Link to={item.to} className="glass-card rounded-2xl p-5 text-center block hover:scale-105 hover:-translate-y-1 transition-all duration-300">
                  <item.icon className={`w-8 h-8 mx-auto mb-2 ${item.color} animate-float`} style={{ animationDelay: `${item.delay}s` }} />
                  <span className="font-bold text-foreground text-sm">{item.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Trust badge */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
            className="max-w-3xl mx-auto mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50">
              <span className="text-base">🛡️</span>
              <span className="text-xs text-muted-foreground font-medium">Website ini aman & bebas virus — 100% terpercaya</span>
              <span className="text-base">✅</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">@t48id</p>
          </motion.div>
        </main>
      </div>

      <AIChatWidget />
    </>
  );
};

export default Index;
