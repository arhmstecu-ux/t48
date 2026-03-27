import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);
    if (result.error) {
      setLoading(false);
      toast.error(result.error);
      return;
    }

    // Check if user has admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      toast.error('Gagal mendapatkan data user');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = roles?.some(r => r.role === 'admin');

    if (!isAdmin) {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error('Akses ditolak! Akun ini bukan admin/owner.');
      return;
    }

    setLoading(false);
    toast.success('Login admin berhasil!');
    navigate('/owner');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl p-8 border border-yellow-500/30 bg-gray-900/80 backdrop-blur-xl shadow-2xl shadow-yellow-500/10"
      >
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-yellow-500/20 border border-yellow-500/40">
            <Shield className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        <h1 className="text-3xl font-extrabold text-center mb-1 text-yellow-400">Admin Panel</h1>
        <p className="text-center text-gray-400 mb-6 text-sm">Login khusus admin & owner T48ID Store</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300">Email Admin</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@email.com"
              className="w-full mt-1 px-4 py-3 rounded-xl border border-yellow-500/30 bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500/50 outline-none transition"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-300">Sandi</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full mt-1 px-4 py-3 rounded-xl border border-yellow-500/30 bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500/50 outline-none transition"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-bold text-lg hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Memverifikasi...' : '🔐 Masuk sebagai Admin'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          Halaman ini hanya untuk admin & owner. Bukan admin?{' '}
          <a href="/login" className="text-yellow-500 hover:underline">Login biasa</a>
        </p>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
