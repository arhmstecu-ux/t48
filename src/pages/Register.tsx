import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const Register = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await register({ email, phone, username, password });
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Pendaftaran berhasil! Cek email untuk verifikasi.');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md glass-card rounded-2xl p-8">
        <h1 className="text-3xl font-extrabold text-gradient text-center mb-2">Daftar</h1>
        <p className="text-center text-muted-foreground mb-6">Buat akun baru di T48ID Store</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@gmail.com"
              className="w-full mt-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring outline-none transition" required />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Nomor HP</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="08xxxxxxxxxx"
              className="w-full mt-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring outline-none transition" required />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring outline-none transition" required />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Sandi</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:ring-2 focus:ring-ring outline-none transition" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition disabled:opacity-50">
            {loading ? 'Memproses...' : 'Daftar'}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Sudah punya akun?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">Login di sini</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
