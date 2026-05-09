import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Tables } from '@/integrations/supabase/types';
import { Trash2, Plus, Ban, CheckCircle, Eye, Search, Play, Lock, Shield, Radio, ImageIcon } from 'lucide-react';
import PaidLivePanel from '@/components/PaidLivePanel';
import SongsPanel from '@/components/SongsPanel';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const SLIDER_KEYS = ['home_slider_1', 'home_slider_2', 'home_slider_3', 'home_slider_4'];

type TabKey = 'products' | 'users' | 'orders' | 'replay' | 'announcements' | 'slider' | 'maintenance' | 'logo' | 'live' | 'paidlive' | 'songs' | 'admins';

const OwnerPanel = () => {
  const { isOwner, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('products');
  const [adminList, setAdminList] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, description: '', category: 'Show', image: '', show_date: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState('');
  const [newVideo, setNewVideo] = useState({ title: '', youtubeUrl: '', password: '' });
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [globalPassword, setGlobalPassword] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', description: '', date: '', type: 'show' as string, image_url: '' });
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [sliderImages, setSliderImages] = useState<Record<string, string>>({});
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('Website sedang dalam pemeliharaan.');
  const [logoImg, setLogoImg] = useState('');
  const [liveUrl, setLiveUrl] = useState('');
  const [liveTitle, setLiveTitle] = useState('');
  const [liveDesc, setLiveDesc] = useState('');
  const [liveActive, setLiveActive] = useState(false);

  const { data: products } = useRealtimeTable<Tables<'products'>>('products');
  const { data: profiles } = useRealtimeTable<Tables<'profiles'>>('profiles');
  const { data: purchases } = useRealtimeTable<Tables<'purchases'>>('purchases', { order: { column: 'created_at', ascending: false } });
  const { data: purchaseItems } = useRealtimeTable<Tables<'purchase_items'>>('purchase_items');
  const { data: videos } = useRealtimeTable<Tables<'replay_videos'>>('replay_videos');
  const { data: announcements } = useRealtimeTable<Tables<'announcements'>>('announcements');
  const { data: settings } = useRealtimeTable<Tables<'app_settings'>>('app_settings');

  useEffect(() => { if (!isOwner) navigate('/'); }, [isOwner, navigate]);

  useEffect(() => {
    const get = (k: string) => settings.find(s => s.key === k);
    setGlobalPassword(get('replay_global_password')?.value || '');
    setMaintenanceMode(get('maintenance_mode')?.value === 'true');
    if (get('maintenance_message')) setMaintenanceMessage(get('maintenance_message')!.value);
    const imgs: Record<string, string> = {};
    SLIDER_KEYS.forEach(k => { const s = get(k); if (s?.value) imgs[k] = s.value; });
    setSliderImages(imgs);
    if (get('site_logo')?.value) setLogoImg(get('site_logo')!.value);
    setLiveUrl(get('livestream_url')?.value || '');
    setLiveTitle(get('livestream_title')?.value || '');
    setLiveDesc(get('livestream_description')?.value || '');
    setLiveActive(get('livestream_active')?.value === 'true');
  }, [settings]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('products').insert({
      name: newProduct.name, price: newProduct.price, description: newProduct.description,
      category: newProduct.category, image: newProduct.image,
      show_date: newProduct.show_date ? new Date(newProduct.show_date).toISOString() : null,
    } as any);
    if (error) { toast.error('Gagal'); return; }
    setNewProduct({ name: '', price: 0, description: '', category: 'Show', image: '', show_date: '' });
    setShowAdd(false);
    toast.success('Produk ditambahkan!');
  };
  const handleDeleteProduct = async (id: string) => { const { error } = await supabase.from('products').delete().eq('id', id); if (error) { toast.error('Gagal: ' + error.message); return; } toast.success('Produk dihapus!'); };
  const handleBlacklist = async (userId: string, isBlacklisted: boolean) => { await supabase.from('profiles').update({ is_blacklisted: !isBlacklisted }).eq('user_id', userId); toast.success(isBlacklisted ? 'User di-unblock!' : 'User diblokir!'); };
  const handleAddVideo = async (e: React.FormEvent) => { e.preventDefault(); const { error } = await supabase.from('replay_videos').insert({ title: newVideo.title, youtube_url: newVideo.youtubeUrl, password: newVideo.password || globalPassword }); if (error) { toast.error('Gagal'); return; } setNewVideo({ title: '', youtubeUrl: '', password: '' }); setShowAddVideo(false); toast.success('Video ditambahkan!'); };
  const handleDeleteVideo = async (id: string) => { await supabase.from('replay_videos').delete().eq('id', id); toast.success('Video dihapus!'); };
  const handleSaveGlobalPassword = async () => { await supabase.from('app_settings').upsert({ key: 'replay_global_password', value: globalPassword }); toast.success('Sandi disimpan!'); };
  const handleAddAnnouncement = async (e: React.FormEvent) => { e.preventDefault(); const { error } = await supabase.from('announcements').insert({ title: newAnnouncement.title, description: newAnnouncement.description, date: newAnnouncement.date ? new Date(newAnnouncement.date).toISOString() : null, type: newAnnouncement.type, image_url: newAnnouncement.image_url } as any); if (error) { toast.error('Gagal'); return; } setNewAnnouncement({ title: '', description: '', date: '', type: 'show', image_url: '' }); setShowAddAnnouncement(false); toast.success('Pengumuman ditambahkan!'); };
  const handleDeleteAnnouncement = async (id: string) => { await supabase.from('announcements').delete().eq('id', id); toast.success('Dihapus!'); };
  const handleUpdateOrderStatus = async (id: string, status: 'confirmed' | 'completed') => { await supabase.from('purchases').update({ status }).eq('id', id); toast.success(status === 'confirmed' ? 'Dikonfirmasi!' : 'Diselesaikan!'); };

  const handleSliderUpload = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 3 * 1024 * 1024) { toast.error('Max 3MB!'); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      await supabase.from('app_settings').upsert({ key, value: base64 });
      setSliderImages(prev => ({ ...prev, [key]: base64 }));
      toast.success('Foto slider diperbarui!');
    };
    reader.readAsDataURL(file);
  };
  const handleRemoveSlider = async (key: string) => {
    await supabase.from('app_settings').upsert({ key, value: '' });
    setSliderImages(prev => { const n = { ...prev }; delete n[key]; return n; });
    toast.success('Foto dihapus!');
  };

  const handleToggleMaintenance = async () => { const v = !maintenanceMode; await supabase.from('app_settings').upsert({ key: 'maintenance_mode', value: String(v) }); setMaintenanceMode(v); toast.success(v ? 'Website ditutup!' : 'Website dibuka!'); };
  const handleSaveMaintenanceMsg = async () => { await supabase.from('app_settings').upsert({ key: 'maintenance_message', value: maintenanceMessage }); toast.success('Pesan disimpan!'); };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Max 2MB!'); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      await supabase.from('app_settings').upsert({ key: 'site_logo', value: base64 });
      setLogoImg(base64);
      toast.success('Logo diperbarui!');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLive = async () => {
    await Promise.all([
      supabase.from('app_settings').upsert({ key: 'livestream_url', value: liveUrl }),
      supabase.from('app_settings').upsert({ key: 'livestream_title', value: liveTitle }),
      supabase.from('app_settings').upsert({ key: 'livestream_description', value: liveDesc }),
    ]);
    toast.success('Pengaturan live disimpan!');
  };
  const handleToggleLive = async () => {
    const v = !liveActive;
    await supabase.from('app_settings').upsert({ key: 'livestream_active', value: String(v) });
    setLiveActive(v);
    toast.success(v ? 'Live diaktifkan!' : 'Live ditutup!');
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  const filteredUsers = profiles.filter(u => u.username.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase()) || ((u as any).profile_code || '').toLowerCase().includes(searchUser.toLowerCase().replace('#', '')));

  const loadAdmins = async () => { const { data } = await supabase.functions.invoke('manage-admin', { body: { action: 'list_admins' } }); if (data?.admins) setAdminList(data.admins); };
  useEffect(() => { if (tab === 'admins') loadAdmins(); }, [tab]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'products', label: 'Produk' },
    { key: 'users', label: `Anggota (${profiles.length})` },
    { key: 'orders', label: 'Pesanan' },
    { key: 'replay', label: 'Replay' },
    { key: 'announcements', label: 'Pengumuman' },
    { key: 'slider', label: 'Slider' },
    { key: 'live', label: 'Live' },
    { key: 'paidlive', label: '💎 Live Berbayar' },
    { key: 'songs', label: '🎵 Playlist Lagu' },
    { key: 'logo', label: 'Logo' },
    { key: 'maintenance', label: 'Akses' },
    { key: 'admins', label: '🛡️ Admin' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-extrabold text-gradient mb-6">Panel Owner</h1>
        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-2 rounded-xl font-medium text-xs transition-all ${tab === t.key ? 'gradient-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'products' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground font-medium mb-4"><Plus className="w-4 h-4" /> Tambah Produk</button>
            {showAdd && (
              <form onSubmit={handleAddProduct} className="glass-card rounded-xl p-6 mb-6 space-y-3">
                <input placeholder="Nama produk" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" required />
                <input placeholder="Harga (Rp)" type="number" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" required />
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
                    {p.image && (p.image as string).length > 10 ? (
                      <img src={p.image!} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><span className="text-xl">🎤</span></div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{p.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-primary font-bold">{formatPrice(p.price)}</span>
                        {(p as any).show_date && <span className="text-xs text-muted-foreground">📅 {new Date((p as any).show_date).toLocaleDateString('id-ID')}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteProduct(p.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition"><Trash2 className="w-4 h-4 text-destructive" /></button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-sm text-muted-foreground mb-3">Total pendaftar: <strong className="text-foreground">{profiles.length}</strong></p>
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Cari nama, email, atau #kode..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm" /></div>
            <div className="space-y-3">
              {filteredUsers.map(u => {
                const userPurchases = purchases.filter(p => p.user_id === u.user_id);
                return (
                  <div key={u.id} className="glass-card rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {u.profile_photo ? (
                          <img src={u.profile_photo} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">{u.username[0]?.toUpperCase()}</div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 mb-0.5"><h3 className="font-semibold text-foreground">{u.username}</h3>{(u as any).profile_code && <span className="text-xs font-mono text-primary font-bold">#{(u as any).profile_code}</span>}{u.is_blacklisted && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">Diblokir</span>}</div>
                          <p className="text-xs text-muted-foreground">{u.email} • {u.phone}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setViewUserId(viewUserId === u.user_id ? null : u.user_id)} className="p-2 rounded-lg hover:bg-primary/10 transition"><Eye className="w-4 h-4 text-primary" /></button>
                        <button onClick={() => handleBlacklist(u.user_id, u.is_blacklisted)} className="p-2 rounded-lg transition">{u.is_blacklisted ? <CheckCircle className="w-4 h-4 text-success" /> : <Ban className="w-4 h-4 text-destructive" />}</button>
                      </div>
                    </div>
                    {viewUserId === u.user_id && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <h4 className="text-sm font-bold text-foreground mb-2">Riwayat Pembelian ({userPurchases.length})</h4>
                        {userPurchases.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada.</p> : userPurchases.map(p => {
                          const items = purchaseItems.filter(pi => pi.purchase_id === p.id);
                          return (<div key={p.id} className="bg-secondary/50 rounded-lg p-3 text-xs mb-2"><div className="flex justify-between mb-1"><span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString('id-ID')}</span><span className="font-bold text-foreground">{formatPrice(p.total)}</span></div><span className={`px-1.5 py-0.5 text-[10px] rounded-full ${p.status === 'completed' ? 'bg-success/20 text-success' : p.status === 'confirmed' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'}`}>{p.status}</span>{items.map(item => <p key={item.id} className="text-foreground mt-1">{item.product_name} x{item.quantity}</p>)}</div>);
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {tab === 'orders' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {purchases.length === 0 && <p className="text-muted-foreground">Belum ada pesanan.</p>}
            {purchases.map(p => {
              const items = purchaseItems.filter(pi => pi.purchase_id === p.id);
              const prof = profiles.find(pr => pr.user_id === p.user_id);
              return (
                <div key={p.id} className={`glass-card rounded-xl p-4 ${p.status === 'pending' ? 'border-l-4 border-warning' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs font-medium text-foreground">{prof?.username || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString('id-ID')}</p>
                      <span className={`mt-1 inline-block px-2 py-0.5 text-xs rounded-full font-medium ${p.status === 'completed' ? 'bg-success/20 text-success' : p.status === 'confirmed' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'}`}>{p.status === 'pending' ? 'Menunggu' : p.status === 'confirmed' ? 'Dikonfirmasi' : 'Selesai'}</span>
                    </div>
                    <span className="font-bold text-gradient">{formatPrice(p.total)}</span>
                  </div>
                  {items.map(item => <p key={item.id} className="text-sm text-foreground">{item.product_name} x{item.quantity}</p>)}
                  {p.status !== 'completed' && (
                    <div className="flex gap-2 mt-3">
                      {p.status === 'pending' && <button onClick={() => handleUpdateOrderStatus(p.id, 'confirmed')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" /> Konfirmasi</button>}
                      <button onClick={() => handleUpdateOrderStatus(p.id, 'completed')} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" /> Selesaikan</button>
                    </div>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}

        {tab === 'replay' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="glass-card rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2"><Lock className="w-4 h-4 text-warning" /><h3 className="font-semibold text-foreground text-sm">Sandi Global</h3></div>
              <div className="flex gap-2"><input value={globalPassword} onChange={e => setGlobalPassword(e.target.value)} placeholder="Sandi..." className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm" /><button onClick={handleSaveGlobalPassword} className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">Simpan</button></div>
            </div>
            <button onClick={() => setShowAddVideo(!showAddVideo)} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground font-medium mb-4"><Plus className="w-4 h-4" /> Tambah Video</button>
            {showAddVideo && (
              <form onSubmit={handleAddVideo} className="glass-card rounded-xl p-6 mb-6 space-y-3">
                <input placeholder="Judul" value={newVideo.title} onChange={e => setNewVideo({...newVideo, title: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" required />
                <input placeholder="URL YouTube" value={newVideo.youtubeUrl} onChange={e => setNewVideo({...newVideo, youtubeUrl: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" required />
                <input placeholder="Sandi (kosong = global)" value={newVideo.password} onChange={e => setNewVideo({...newVideo, password: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" />
                <button type="submit" className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium">Simpan</button>
              </form>
            )}
            <div className="space-y-3">{videos.map(v => (<div key={v.id} className="glass-card rounded-xl p-4 flex items-center justify-between"><div className="flex items-center gap-3"><Play className="w-5 h-5 text-primary" /><div><h3 className="font-semibold text-foreground">{v.title}</h3><p className="text-xs text-muted-foreground">Sandi: {v.password}</p></div></div><button onClick={() => handleDeleteVideo(v.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition"><Trash2 className="w-4 h-4 text-destructive" /></button></div>))}{videos.length === 0 && <p className="text-muted-foreground text-sm">Belum ada video.</p>}</div>
          </motion.div>
        )}

        {tab === 'announcements' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button onClick={() => setShowAddAnnouncement(!showAddAnnouncement)} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground font-medium mb-4"><Plus className="w-4 h-4" /> Tambah Pengumuman</button>
            {showAddAnnouncement && (
              <form onSubmit={handleAddAnnouncement} className="glass-card rounded-xl p-6 mb-6 space-y-3">
                <input placeholder="Judul" value={newAnnouncement.title} onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" required />
                <textarea placeholder="Deskripsi" value={newAnnouncement.description} onChange={e => setNewAnnouncement({...newAnnouncement, description: e.target.value})} rows={3} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground resize-none" />
                <input type="datetime-local" value={newAnnouncement.date} onChange={e => setNewAnnouncement({...newAnnouncement, date: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" />
                <select value={newAnnouncement.type} onChange={e => setNewAnnouncement({...newAnnouncement, type: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground">
                  <option value="show">Show</option><option value="2s">2-Shot</option><option value="mng">M&G</option><option value="vc">VC</option><option value="info">Info</option>
                </select>
                <button type="submit" className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium">Simpan</button>
              </form>
            )}
            <div className="space-y-3">
              {announcements.map(a => (
                <div key={a.id} className="glass-card rounded-xl p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="font-semibold text-foreground">{a.title}</h3><p className="text-xs text-muted-foreground">{a.description}</p>{a.date && <p className="text-xs text-primary mt-1">{new Date(a.date).toLocaleString('id-ID')}</p>}</div>
                  <button onClick={() => handleDeleteAnnouncement(a.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition flex-shrink-0"><Trash2 className="w-4 h-4 text-destructive" /></button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'slider' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-bold text-foreground mb-4">📸 Slider Halaman Utama</h2>
            <div className="grid grid-cols-2 gap-3">
              {SLIDER_KEYS.map((key, i) => (
                <div key={key} className="glass-card rounded-xl p-3">
                  <p className="text-sm font-semibold text-foreground mb-2">Foto {i + 1}</p>
                  {sliderImages[key] ? (
                    <div className="relative">
                      <img src={sliderImages[key]} alt={`Slider ${i + 1}`} className="w-full h-24 object-cover rounded-lg" />
                      <button onClick={() => handleRemoveSlider(key)} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive flex items-center justify-center"><Trash2 className="w-3 h-3 text-destructive-foreground" /></button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-secondary/50 transition">
                      <Plus className="w-6 h-6 text-muted-foreground" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleSliderUpload(key)} />
                    </label>
                  )}
                  {sliderImages[key] && (
                    <label className="mt-2 block text-center text-xs text-primary font-medium cursor-pointer hover:underline">
                      Ganti foto <input type="file" accept="image/*" className="hidden" onChange={handleSliderUpload(key)} />
                    </label>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'live' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Radio className="w-5 h-5 text-destructive" /> Kelola Livestream</h2>
            <div className="glass-card rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div><h3 className="font-semibold text-foreground">Status Live</h3><p className="text-sm text-muted-foreground">Buka/tutup halaman livestream</p></div>
                <button onClick={handleToggleLive} className={`px-4 py-2 rounded-xl font-medium text-sm transition ${liveActive ? 'bg-destructive text-destructive-foreground' : 'gradient-primary text-primary-foreground'}`}>{liveActive ? '🔴 Tutup Live' : '🟢 Buka Live'}</button>
              </div>
              <input value={liveUrl} onChange={e => setLiveUrl(e.target.value)} placeholder="URL YouTube..." className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
              <input value={liveTitle} onChange={e => setLiveTitle(e.target.value)} placeholder="Judul..." className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
              <textarea value={liveDesc} onChange={e => setLiveDesc(e.target.value)} placeholder="Deskripsi..." rows={3} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" />
              <button onClick={handleSaveLive} className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium">Simpan</button>
            </div>
          </motion.div>
        )}

        {tab === 'paidlive' && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Radio className="w-5 h-5 text-primary" /> Live Berbayar</h2><PaidLivePanel /></motion.div>)}
        {tab === 'songs' && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><h2 className="text-lg font-bold text-foreground mb-4">🎵 Playlist Lagu JKT48</h2><SongsPanel /></motion.div>)}

        {tab === 'logo' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /> Logo Website</h2>
            <div className="glass-card rounded-xl p-6 text-center">
              {logoImg ? (
                <div className="mb-4"><img src={logoImg} alt="Logo" className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-primary" /></div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4"><ImageIcon className="w-10 h-10 text-muted-foreground" /></div>
              )}
              <label className="inline-flex items-center gap-2 px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium cursor-pointer">
                📷 {logoImg ? 'Ganti Logo' : 'Upload Logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
          </motion.div>
        )}

        {tab === 'maintenance' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-destructive" /> Akses Website</h2>
            <div className="glass-card rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div><h3 className="font-semibold text-foreground">Mode Pemeliharaan</h3><p className="text-sm text-muted-foreground">Tutup akses untuk semua pengunjung</p></div>
                <button onClick={handleToggleMaintenance} className={`px-4 py-2 rounded-xl font-medium text-sm transition ${maintenanceMode ? 'bg-destructive text-destructive-foreground' : 'gradient-primary text-primary-foreground'}`}>{maintenanceMode ? '🔴 Ditutup' : '🟢 Aktif'}</button>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Pesan saat website ditutup:</label>
                <textarea value={maintenanceMessage} onChange={e => setMaintenanceMessage(e.target.value)} rows={3} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" />
                <button onClick={handleSaveMaintenanceMsg} className="mt-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">Simpan Pesan</button>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'admins' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-xl font-bold text-foreground mb-4">🛡️ Kelola Admin</h2>
            <div className="glass-card rounded-2xl p-4 mb-4 space-y-3">
              <h3 className="font-bold text-foreground text-sm">Tambah Admin Baru</h3>
              <input value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="Email" type="email" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
              <input value={newAdminPassword} onChange={e => setNewAdminPassword(e.target.value)} placeholder="Password" type="text" className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
              <button disabled={adminLoading || !newAdminEmail || !newAdminPassword} onClick={async () => {
                setAdminLoading(true);
                try {
                  const { data, error } = await supabase.functions.invoke('manage-admin', { body: { action: 'create_admin', email: newAdminEmail, password: newAdminPassword } });
                  if (error || data?.error) { toast.error(data?.error || 'Gagal'); }
                  else { toast.success('Admin ditambahkan!'); setNewAdminEmail(''); setNewAdminPassword(''); loadAdmins(); }
                } catch { toast.error('Error'); }
                setAdminLoading(false);
              }} className="w-full py-2 rounded-xl gradient-primary text-primary-foreground font-bold text-sm disabled:opacity-50">{adminLoading ? 'Memproses...' : '➕ Tambah Admin'}</button>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-foreground text-sm mb-2">Daftar Admin ({adminList.length})</h3>
              {adminList.map(a => (
                <div key={a.user_id} className="glass-card rounded-xl p-3 flex items-center justify-between">
                  <div><p className="font-bold text-foreground text-sm">{a.username || 'Unknown'}</p><p className="text-xs text-muted-foreground">{a.email} {a.profile_code ? `• #${a.profile_code}` : ''}</p></div>
                  {a.user_id !== user?.id && (
                    <button onClick={async () => {
                      if (!confirm(`Hapus ${a.email} dari admin?`)) return;
                      await supabase.functions.invoke('manage-admin', { body: { action: 'remove_admin', user_id: a.user_id } });
                      toast.success('Admin dihapus'); loadAdmins();
                    }} className="px-3 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition">Hapus</button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default OwnerPanel;
