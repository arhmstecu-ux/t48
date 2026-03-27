import { useState, useRef, useEffect } from 'react';
import { MoreVertical, ShoppingBag, MessageCircle, Instagram, Music2, Radio, Users, Ticket, Play, Megaphone, Trophy, CloudSun } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

const ThreeDotMenu = () => {
  const [open, setOpen] = useState(false);
  const { isOwner, user } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const menuItems: { label: string; icon: any; href: string; external?: boolean }[] = [
    { label: 'Home', icon: ShoppingBag, href: '/' },
    { label: 'Katalog Show & PM', icon: Ticket, href: '/show' },
    { label: 'Replay Show', icon: Play, href: '/replay' },
    { label: 'Pengumuman JKT48', icon: Megaphone, href: '/announcements' },
    { label: 'Member JKT48', icon: Users, href: '/members' },
    { label: 'Ranking Pembeli', icon: Trophy, href: '/ranking' },
    { label: 'Saluran WhatsApp', icon: Radio, href: 'https://whatsapp.com/channel/0029VbBgutpEKyZFRQ8hK33l', external: true },
    { label: 'Instagram', icon: Instagram, href: 'https://www.instagram.com/t48id_ofc?igsh=cXhzOGJsY3liYzVv', external: true },
    { label: 'TikTok', icon: Music2, href: 'https://www.tiktok.com/@t48id.official?_t=ZS-8xuSZrEvgLB&_r=1', external: true },
    { label: 'Butuh Bantuan? Chat Admin', icon: MessageCircle, href: 'https://wa.me/6282135963767?text=Halo%20admin,%20saya%20butuh%20bantuan', external: true },
  ];

  if (isOwner) {
    menuItems.push({ label: '⚙️ Panel Owner', icon: ShoppingBag, href: '/owner' });
  }

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
        <MoreVertical className="w-5 h-5 text-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 glass-card rounded-xl overflow-hidden z-50 animate-fade-in max-h-[80vh] overflow-y-auto">
          {menuItems.map((item, i) => (
            item.external ? (
              <a key={i} href={item.href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 transition-colors text-sm text-foreground"
                onClick={() => setOpen(false)}>
                <item.icon className="w-4 h-4 text-primary" />
                {item.label}
              </a>
            ) : (
              <Link key={i} to={item.href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 transition-colors text-sm text-foreground"
                onClick={() => setOpen(false)}>
                <item.icon className="w-4 h-4 text-primary" />
                {item.label}
              </Link>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default ThreeDotMenu;
