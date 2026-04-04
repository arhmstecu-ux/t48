import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Tables } from '@/integrations/supabase/types';
import { Radio, Search, Plus, Trash2, Eye, Send, Shield, Users, ShoppingBag, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const AdminPanel = () => {
  const { user, isOwner } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'live' | 'catalog' | 'group'>('catalog');
  const [searchUser, setSearchUser] = useState('');

  // Live settings
  const [liveUrl, setLiveUrl] = useState('');
  const [liveTitle, setLiveTitle] = useState('');
  const [liveDesc, setLiveDesc] = useState('');
  const [liveActive, setLiveActive] = useState(false);

  // Product
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, coin_price: 0, description: '', category: 'Show', image: '', show_date: '' });
  const [showAdd, setShowAdd] = useState(false);

  const { data: products } = useRealtimeTable<Tables<'products'>>('products');
  const { data: settings } = useRealtimeTable<Tables<'app_settings'>>('app_settings');
  const { data: groupMessages } = useRealtimeTable<Tables<'group_messages'>>('group_messages', { order: { column: 'created_at', ascending: false } });
  const { data: profiles } = useRealtimeTable<Tables<'profiles'>>('profiles');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const checkRole = async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
      const hasAdmin = data?.some(r => r.role === 'admin' || r.role === 'moderator');
      if (!hasAdmin && !isOwner) { navigate('/'); return; }
      setIsAdmin(true);
      setLoading(false);
    };
    checkRole();
  }, [user, isOwner, navigate]);

  useEffect(() => {
    const lu = settings.find(s => s.key === 'livestream_url');
    if (lu) setLiveUrl(lu.value);
    const lt = settings.find(s => s.key === 'livestream_title');
    if (lt) setLiveTitle(lt.value);
    const ld = settings.find(s => s.key === 'livestream_description');
    if (ld) setLiveDesc(ld.value);
    const la = settings.find(s => s.key === 'livestream_active');
    if (la) setLiveActive(la.value === 'true');
  }, [settings]);

  const handleSaveLive = async () => {
    await Promise.all([
      supabase.from('app_settings').upsert({ key: 'livestream_url', value: liveUrl }),
      supabase.from('app_settings').upsert({ key: 'livestream_title', value: liveTitle }),
      supabase.from('app_settings').upsert({ key: 'livestream_description', value: liveDesc }),
    ]);
    toast.success('Pengaturan live disimpan!');
  };
  const handleToggleLive = async () => {
    const newVal = !liveActive;
    await supabase.from('app_settings').upsert({ key: 'livestream_active', value: String(newVal) });
    setLiveActive(newVal);
    toast.success(newVal ? 'Live diaktifkan!' : 'Live ditutup!');
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('products').insert({
      name: newProduct.name, price: newProduct.price, description: newProduct.description,
      category: newProduct.category, image: newProduct.image, coin_price: newProduct.coin_price,
      show_date: newProduct.show_date ? new Date(newProduct.show_date).toISOString() : null,
    } as any);
    if (error) { toast.error('Gagal'); return; }
    setNewProduct({ name: '', price: 0, coin_price: 0, description: '', category: 'Show', image: '', show_date: '' });
    setShowAdd(false);
    toast.success('Produk ditambahkan!');
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { toast.error('Gagal menghapus'); return; }
    toast.success('Produk dihapus!');
  };

  const handleDeleteGroupMsg = async (id: string) => {
    await supabase.from('group_messages').delete().eq('id', id);
    toast.success('Pesan dihapus!');
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'catalog' as const, label: 'Katalog', icon: ShoppingBag },
    { key: 'live' as const, label: 'Livestream', icon: Radio },
    { key: 'group' as const, label: 'Grup Chat', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Admin header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gradient">Panel Admin</h1>
            <p className="text-xs text-muted-foreground">Kelola livestream, grup & katalog</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${tab === t.key ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'catalog' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground font-medium mb-4">
              <Plus className="w-4 h-4" /> Tambah Produk
            </button>
            {showAdd && (
              <form onSubmit={handleAddProduct} className="glass-card rounded-xl p-6 mb-6 space-y-3">
                <input placeholder="Nama produk" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" required />
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Harga QRIS (Rp)" type="number" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" required />
                  <input placeholder="Harga Koin" type="number" value={newProduct.coin_price || ''} onChange={e => setNewProduct({...newProduct, coin_price: Number(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" />
                </div>
                <input placeholder="Deskripsi" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" />
                <input placeholder="Kategori" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" />
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tanggal & Jam Tayang</label>
                  <input type="datetime-local" value={newProduct.show_date} onChange={e => setNewProduct({...newProduct, show_date: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Gambar (max 3MB)</label>
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    if (file.size > 3 * 1024 * 1024) { toast.error('Max 3MB!'); return; }
                    const reader = new FileReader();
                    reader.onloadend = () => setNewProduct(prev => ({...prev, image: reader.result as string}));
                    reader.readAsDataURL(file);
                  }} className="w-full text-sm text-foreground" />
                  {newProduct.image && <img src={newProduct.image} alt="Preview" className="mt-2 w-full h-24 object-cover rounded-lg" />}
                </div>
                <button type="submit" className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium">Simpan</button>
              </form>
            )}
            <div className="space-y-3">
              {products.map(p => (
                <div key={p.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {p.image && p.image.length > 10 ? (
                      <img src={p.image} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><span className="text-xl">🎤</span></div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-primary font-bold">{formatPrice(p.price)}</span>
                        {(p as any).coin_price > 0 && <span className="text-xs text-accent font-bold">🪙 {(p as any).coin_price}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteProduct(p.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition"><Trash2 className="w-4 h-4 text-destructive" /></button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'live' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="glass-card rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Status Live</h3>
                  <p className="text-sm text-muted-foreground">Buka/tutup halaman livestream</p>
                </div>
                <button onClick={handleToggleLive} className={`px-4 py-2 rounded-xl font-medium text-sm transition ${liveActive ? 'bg-destructive text-destructive-foreground' : 'gradient-primary text-primary-foreground'}`}>
                  {liveActive ? '🔴 Tutup Live' : '🟢 Buka Live'}
                </button>
              </div>
              <input value={liveUrl} onChange={e => setLiveUrl(e.target.value)} placeholder="URL YouTube..." className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
              <input value={liveTitle} onChange={e => setLiveTitle(e.target.value)} placeholder="Judul..." className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
              <textarea value={liveDesc} onChange={e => setLiveDesc(e.target.value)} placeholder="Deskripsi..." rows={3} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" />
              <button onClick={handleSaveLive} className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium">Simpan</button>
            </div>
          </motion.div>
        )}

        {tab === 'group' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-bold text-foreground mb-4">Moderasi Grup Chat</h2>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Cari pesan..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm" />
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {groupMessages.filter(m => !searchUser || m.username.toLowerCase().includes(searchUser.toLowerCase()) || (m.content || '').toLowerCase().includes(searchUser.toLowerCase())).slice(0, 50).map(msg => (
                <div key={msg.id} className="glass-card rounded-lg p-3 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-primary">{msg.username}</span>
                    <p className="text-sm text-foreground truncate">{msg.content}</p>
                    <span className="text-[10px] text-muted-foreground">{new Date(msg.created_at).toLocaleString('id-ID')}</span>
                  </div>
                  <button onClick={() => handleDeleteGroupMsg(msg.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ))}
              {groupMessages.length === 0 && <p className="text-muted-foreground text-sm">Belum ada pesan.</p>}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
