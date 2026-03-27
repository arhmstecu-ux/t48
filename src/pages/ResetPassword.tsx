import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if this is a recovery event
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    }
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Sandi minimal 6 karakter'); return; }
    if (password !== confirm) { toast.error('Sandi tidak cocok'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Sandi berhasil diubah!');
      navigate('/');
    }
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
        <div className="glass-card rounded-2xl p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-extrabold text-gradient mb-3">Link Tidak Valid</h1>
          <p className="text-muted-foreground mb-4">Link reset password tidak valid atau sudah kedaluwarsa.</p>
          <button onClick={() => navigate('/login')} className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium">
            Kembali ke Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md glass-card rounded-2xl p-8">
        <h1 className="text-2xl font-extrabold text-gradient text-center mb-2">Reset Sandi</h1>
        <p className="text-center text-muted-foreground mb-6">Masukkan sandi baru kamu</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Sandi Baru</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring outline-none transition" required minLength={6} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Konfirmasi Sandi</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring outline-none transition" required minLength={6} />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition disabled:opacity-50">
            {loading ? 'Memproses...' : 'Ubah Sandi'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
