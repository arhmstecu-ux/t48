import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import ThreeDotMenu from './ThreeDotMenu';
import Clock from './Clock';
import NotificationBell from './NotificationBell';
import defaultLogo from '@/assets/logo.jpg';

const Header = () => {
  const { user, profile, logout, isOwner } = useAuth();
  const navigate = useNavigate();
  const [logo, setLogo] = useState(defaultLogo);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'site_logo').maybeSingle();
      if (mounted && data?.value) setLogo(data.value);
    };
    load();
    const ch = supabase.channel('logo-rt').on('postgres_changes' as any, { event: '*', schema: 'public', table: 'app_settings' }, () => load()).subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, []);

  return (
    <header className="sticky top-0 z-40 glass-card border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ThreeDotMenu />
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="T48ID Official" className="w-8 h-8 rounded-full object-cover" />
            <span className="text-xl font-bold text-gradient">T48ID</span>
          </Link>
        </div>
        <Clock />
        <div className="flex items-center gap-1">
          {user ? (
            <>
              <NotificationBell />
              <Link to="/my-page" className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <User className="w-5 h-5 text-foreground" />
              </Link>
              {isOwner && (
                <Link to="/owner" className="px-2 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium">Owner</Link>
              )}
              <button onClick={async () => { await logout(); navigate('/'); }} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                <LogOut className="w-5 h-5 text-destructive" />
              </button>
            </>
          ) : (
            <Link to="/login" className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
