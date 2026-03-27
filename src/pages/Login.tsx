import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Login berhasil!');
      navigate('/');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Link reset sandi sudah dikirim ke email kamu!');
      setShowForgot(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md glass-card rounded-2xl p-8">
        {!showForgot ? (
          <>
            <h1 className="text-3xl font-extrabold text-gradient text-center mb-2">Login</h1>
            <p className="text-center text-muted-foreground mb-6">Masuk ke akun T48ID Store kamu</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring outline-none transition" required />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Sandi</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring outline-none transition" required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition disabled:opacity-50">
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>
            <div className="text-center mt-4 space-y-2">
              <button onClick={() => setShowForgot(true)} className="text-sm text-primary font-medium hover:underline">
                Lupa kata sandi?
              </button>
              <p className="text-sm text-muted-foreground">
                Belum punya akun?{' '}
                <Link to="/register" className="text-primary font-medium hover:underline">Daftar sekarang</Link>
              </p>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-gradient text-center mb-2">Lupa Sandi</h1>
            <p className="text-center text-muted-foreground mb-6">Masukkan email untuk reset sandi</p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring outline-none transition" required />
              </div>
              <button type="submit" disabled={forgotLoading}
                className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition disabled:opacity-50">
                {forgotLoading ? 'Mengirim...' : 'Kirim Link Reset'}
              </button>
            </form>
            <div className="text-center mt-4">
              <button onClick={() => setShowForgot(false)} className="text-sm text-primary font-medium hover:underline">
                ← Kembali ke Login
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
