import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeTable } from '@/hooks/useRealtimeTable';
import type { Tables } from '@/integrations/supabase/types';
import { Trash2, Plus, Ban, CheckCircle, Eye, XCircle, Search, Play, Lock, Megaphone, Tag, Image, Shield, Sparkles, Radio, Send, ImageIcon, Coins, Star } from 'lucide-react';
import CoinPanel from '@/components/CoinPanel';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Voucher { id: string; code: string; discount_percent: number; max_uses: number; used_count: number; expires_at: string | null; is_active: boolean; created_at: string; }
interface Prize { id: string; name: string; description: string; chance_percent: number; sort_order: number; }

const SLIDER_KEYS = ['home_slider_1', 'home_slider_2', 'home_slider_3', 'home_slider_4'];

const OwnerPanel = () => {
  const { isOwner, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'products' | 'users' | 'orders' | 'replay' | 'announcements' | 'vouchers' | 'slider' | 'maintenance' | 'prizes' | 'logo' | 'live' | 'spintransfer' | 'coins' | 'levels'>('products');
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, coin_price: 0, description: '', category: 'Show', image: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [searchUser, setSearchUser] = useState('');
  const [newVideo, setNewVideo] = useState({ title: '', youtubeUrl: '', password: '' });
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [globalPassword, setGlobalPassword] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', description: '', date: '', type: 'show' as string, image_url: '' });
  const [showAddAnnouncement, setShowAddAnnouncement] = useState(false);
  const [newVoucher, setNewVoucher] = useState({ code: '', discount_percent: 10, max_uses: 100, expires_at: '' });
  const [showAddVoucher, setShowAddVoucher] = useState(false);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [sliderImages, setSliderImages] = useState<Record<string, string>>({});
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('Website sedang dalam pemeliharaan.');
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [editPrize, setEditPrize] = useState<Prize | null>(null);
  const [showAddPrize, setShowAddPrize] = useState(false);
  const [newPrize, setNewPrize] = useState({ name: '', description: '', chance_percent: 10, sort_order: 0 });
  const [logoImg, setLogoImg] = useState('');
  // Spin transfer
  const [transferUserId, setTransferUserId] = useState('');
  const [transferAmount, setTransferAmount] = useState(1);
  // Live settings
  const [liveUrl, setLiveUrl] = useState('');
  const [liveTitle, setLiveTitle] = useState('');
  const [liveDesc, setLiveDesc] = useState('');
  const [liveActive, setLiveActive] = useState(false);
  // Level rewards
  const [levelRewards, setLevelRewards] = useState<{id: string; level: number; reward_name: string; reward_description: string}[]>([]);
  const [editRewardLevel, setEditRewardLevel] = useState<number | null>(null);
  const [editRewardName, setEditRewardName] = useState('');
  const [editRewardDesc, setEditRewardDesc] = useState('');

  const { data: products } = useRealtimeTable<Tables<'products'>>('products');
  const { data: profiles } = useRealtimeTable<Tables<'profiles'>>('profiles');
  const { data: purchases } = useRealtimeTable<Tables<'purchases'>>('purchases', { order: { column: 'created_at', ascending: false } });
  const { data: purchaseItems } = useRealtimeTable<Tables<'purchase_items'>>('purchase_items');
  const { data: videos } = useRealtimeTable<Tables<'replay_videos'>>('replay_videos');
  const { data: announcements } = useRealtimeTable<Tables<'announcements'>>('announcements');
  const { data: settings } = useRealtimeTable<Tables<'app_settings'>>('app_settings');

  useEffect(() => { if (!isOwner) navigate('/'); }, [isOwner, navigate]);

  useEffect(() => {
    const pw = settings.find(s => s.key === 'replay_global_password');
    if (pw) setGlobalPassword(pw.value);
    const mm = settings.find(s => s.key === 'maintenance_mode');
    if (mm) setMaintenanceMode(mm.value === 'true');
    const mmsg = settings.find(s => s.key === 'maintenance_message');
    if (mmsg) setMaintenanceMessage(mmsg.value);
    const imgs: Record<string, string> = {};
    SLIDER_KEYS.forEach(k => { const s = settings.find(x => x.key === k); if (s?.value) imgs[k] = s.value; });
    setSliderImages(imgs);
    const logo = settings.find(s => s.key === 'site_logo');
    if (logo?.value) setLogoImg(logo.value);
    // Live settings
    const lu = settings.find(s => s.key === 'livestream_url');
    if (lu) setLiveUrl(lu.value);
    const lt = settings.find(s => s.key === 'livestream_title');
    if (lt) setLiveTitle(lt.value);
    const ld = settings.find(s => s.key === 'livestream_description');
    if (ld) setLiveDesc(ld.value);
    const la = settings.find(s => s.key === 'livestream_active');
    if (la) setLiveActive(la.value === 'true');
  }, [settings]);

  useEffect(() => {
    const loadVouchers = async () => { const { data } = await supabase.from('vouchers').select('*').order('created_at', { ascending: false }); if (data) setVouchers(data as Voucher[]); };
    loadVouchers();
    const ch = supabase.channel('vouchers-rt').on('postgres_changes' as any, { event: '*', schema: 'public', table: 'vouchers' }, () => loadVouchers()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Load level rewards
  useEffect(() => {
    const loadRewards = async () => { const { data } = await supabase.from('level_rewards' as any).select('*').order('level', { ascending: true }); if (data) setLevelRewards(data as any[]); };
    loadRewards();
    const ch = supabase.channel('level-rewards-rt').on('postgres_changes' as any, { event: '*', schema: 'public', table: 'level_rewards' }, () => loadRewards()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  useEffect(() => {
    const loadPrizes = async () => { const { data } = await supabase.from('spin_prizes' as any).select('*').order('sort_order', { ascending: true }); if (data) setPrizes(data as unknown as Prize[]); };
    loadPrizes();
    const ch = supabase.channel('prizes-rt').on('postgres_changes' as any, { event: '*', schema: 'public', table: 'spin_prizes' }, () => loadPrizes()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => { e.preventDefault(); const { error } = await supabase.from('products').insert({ name: newProduct.name, price: newProduct.price, description: newProduct.description, category: newProduct.category, image: newProduct.image, coin_price: newProduct.coin_price } as any); if (error) { toast.error('Gagal'); return; } setNewProduct({ name: '', price: 0, coin_price: 0, description: '', category: 'Show', image: '' }); setShowAdd(false); toast.success('Produk ditambahkan!'); };
  const handleDeleteProduct = async (id: string) => { const { error } = await supabase.from('products').delete().eq('id', id); if (error) { toast.error('Gagal menghapus: ' + error.message); return; } toast.success('Produk dihapus!'); };
  const handleBlacklist = async (userId: string, isBlacklisted: boolean) => { await supabase.from('profiles').update({ is_blacklisted: !isBlacklisted }).eq('user_id', userId); toast.success(isBlacklisted ? 'User di-unblock!' : 'User diblokir!'); };
  const handleAddVideo = async (e: React.FormEvent) => { e.preventDefault(); const { error } = await supabase.from('replay_videos').insert({ title: newVideo.title, youtube_url: newVideo.youtubeUrl, password: newVideo.password || globalPassword }); if (error) { toast.error('Gagal'); return; } setNewVideo({ title: '', youtubeUrl: '', password: '' }); setShowAddVideo(false); toast.success('Video ditambahkan!'); };
  const handleDeleteVideo = async (id: string) => { await supabase.from('replay_videos').delete().eq('id', id); toast.success('Video dihapus!'); };
  const handleSaveGlobalPassword = async () => { await supabase.from('app_settings').upsert({ key: 'replay_global_password', value: globalPassword }); toast.success('Sandi disimpan!'); };
  const handleAddAnnouncement = async (e: React.FormEvent) => { e.preventDefault(); const { error } = await supabase.from('announcements').insert({ title: newAnnouncement.title, description: newAnnouncement.description, date: newAnnouncement.date ? new Date(newAnnouncement.date).toISOString() : null, type: newAnnouncement.type, image_url: newAnnouncement.image_url } as any); if (error) { toast.error('Gagal'); return; } setNewAnnouncement({ title: '', description: '', date: '', type: 'show', image_url: '' }); setShowAddAnnouncement(false); toast.success('Pengumuman ditambahkan!'); };
  const handleDeleteAnnouncement = async (id: string) => { await supabase.from('announcements').delete().eq('id', id); toast.success('Dihapus!'); };
  const handleUpdateOrderStatus = async (id: string, status: 'confirmed' | 'completed') => { await supabase.from('purchases').update({ status }).eq('id', id); toast.success(status === 'confirmed' ? 'Dikonfirmasi!' : 'Diselesaikan!'); };
  const handleAddVoucher = async (e: React.FormEvent) => { e.preventDefault(); const { error } = await supabase.from('vouchers').insert({ code: newVoucher.code.toUpperCase(), discount_percent: newVoucher.discount_percent, max_uses: newVoucher.max_uses, expires_at: newVoucher.expires_at ? new Date(newVoucher.expires_at).toISOString() : null } as any); if (error) { toast.error('Gagal'); return; } setNewVoucher({ code: '', discount_percent: 10, max_uses: 100, expires_at: '' }); setShowAddVoucher(false); toast.success('Voucher dibuat!'); };
  const handleDeleteVoucher = async (id: string) => { await supabase.from('vouchers').delete().eq('id', id); setVouchers(prev => prev.filter(v => v.id !== id)); toast.success('Dihapus!'); };

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

  const handleToggleMaintenance = async () => {
    const newVal = !maintenanceMode;
    await supabase.from('app_settings').upsert({ key: 'maintenance_mode', value: String(newVal) });
    setMaintenanceMode(newVal);
    toast.success(newVal ? 'Website ditutup!' : 'Website dibuka!');
  };
  const handleSaveMaintenanceMsg = async () => {
    await supabase.from('app_settings').upsert({ key: 'maintenance_message', value: maintenanceMessage });
    toast.success('Pesan disimpan!');
  };

  const handleSavePrize = async () => {
    if (!editPrize) return;
    await supabase.from('spin_prizes' as any).update({ name: editPrize.name, description: editPrize.description, chance_percent: editPrize.chance_percent } as any).eq('id', editPrize.id);
    setEditPrize(null);
    toast.success('Hadiah diperbarui!');
  };
  const handleDeletePrize = async (id: string) => { await supabase.from('spin_prizes' as any).delete().eq('id', id); toast.success('Hadiah dihapus!'); };
  const handleAddPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    await supabase.from('spin_prizes' as any).insert({ name: newPrize.name, description: newPrize.description, chance_percent: newPrize.chance_percent, sort_order: newPrize.sort_order } as any);
    setNewPrize({ name: '', description: '', chance_percent: 10, sort_order: 0 });
    setShowAddPrize(false);
    toast.success('Hadiah ditambahkan!');
  };

  // Logo
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

  // Spin transfer
  const handleSpinTransfer = async () => {
    if (!transferUserId || transferAmount < 1) { toast.error('Isi data transfer'); return; }
    const targetProfile = profiles.find(p => p.username.toLowerCase() === transferUserId.toLowerCase() || p.user_id === transferUserId);
    if (!targetProfile) { toast.error('User tidak ditemukan'); return; }
    await supabase.from('user_spins' as any).insert({ user_id: targetProfile.user_id, spins_total: transferAmount, spins_used: 0 } as any);
    toast.success(`${transferAmount} spin ditransfer ke ${targetProfile.username}!`);
    setTransferUserId('');
    setTransferAmount(1);
  };

  // Live settings save
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

  const formatPrice = (price: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(price);
  const filteredUsers = profiles.filter(u => u.username.toLowerCase().includes(searchUser.toLowerCase()) || u.email.toLowerCase().includes(searchUser.toLowerCase()) || ((u as any).profile_code || '').toLowerCase().includes(searchUser.toLowerCase().replace('#', '')));

  const tabs = [
    { key: 'products' as const, label: 'Produk' },
    { key: 'users' as const, label: `Anggota (${profiles.length})` },
    { key: 'orders' as const, label: 'Pesanan' },
    { key: 'replay' as const, label: 'Replay' },
    { key: 'announcements' as const, label: 'Pengumuman' },
    { key: 'vouchers' as const, label: 'Voucher' },
    { key: 'slider' as const, label: 'Slider' },
    { key: 'prizes' as const, label: 'Spin' },
    { key: 'spintransfer' as const, label: 'Transfer Spin' },
    { key: 'coins' as const, label: '🪙 Koin' },
    { key: 'levels' as const, label: '⭐ Level' },
    { key: 'live' as const, label: 'Live' },
    { key: 'logo' as const, label: 'Logo' },
    { key: 'maintenance' as const, label: 'Akses' },
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
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Harga QRIS (Rp)" type="number" value={newProduct.price || ''} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" required />
                  <input placeholder="Harga Koin (0=nonaktif)" type="number" value={newProduct.coin_price || ''} onChange={e => setNewProduct({...newProduct, coin_price: Number(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" />
                </div>
                <input placeholder="Deskripsi" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" />
                <input placeholder="Kategori" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" />
                <button type="submit" className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium">Simpan</button>
              </form>
            )}
            <div className="space-y-3">
              {products.map(p => (
                <div key={p.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{p.name}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-primary font-bold">{formatPrice(p.price)}</span>
                      {(p as any).coin_price > 0 && <span className="text-xs text-accent font-bold">🪙 {(p as any).coin_price} Koin</span>}
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
            <div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Cari..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm" /></div>
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
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 pt-4 border-t border-border/50">
                        <h4 className="text-sm font-bold text-foreground mb-2">Riwayat Pembelian ({userPurchases.length})</h4>
                        {userPurchases.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada.</p> : userPurchases.map(p => {
                          const items = purchaseItems.filter(pi => pi.purchase_id === p.id);
                          return (<div key={p.id} className="bg-secondary/50 rounded-lg p-3 text-xs mb-2"><div className="flex justify-between mb-1"><span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString('id-ID')}</span><span className="font-bold text-foreground">{formatPrice(p.total)}</span></div><span className={`px-1.5 py-0.5 text-[10px] rounded-full ${p.status === 'completed' ? 'bg-success/20 text-success' : p.status === 'confirmed' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'}`}>{p.status}</span>{items.map(item => <p key={item.id} className="text-foreground mt-1">{item.product_name} x{item.quantity}</p>)}</div>);
                        })}
                      </motion.div>
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
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${p.payment_method === 'dana' ? 'bg-primary/20 text-primary' : p.payment_method === 'gopay' ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent'}`}>{p.payment_method.toUpperCase()}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${p.status === 'completed' ? 'bg-success/20 text-success' : p.status === 'confirmed' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'}`}>{p.status === 'pending' ? 'Menunggu' : p.status === 'confirmed' ? 'Dikonfirmasi' : 'Selesai'}</span>
                      </div>
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
                <input placeholder="Sandi khusus (kosongkan = global)" value={newVideo.password} onChange={e => setNewVideo({...newVideo, password: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" />
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
                <input type="datetime-local" value={newAnnouncement.date} onChange={e => setNewAnnouncement({...newAnnouncement, date: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" required />
                <select value={newAnnouncement.type} onChange={e => setNewAnnouncement({...newAnnouncement, type: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground">
                  <option value="show">Show</option>
                  <option value="2s">2-Shot</option>
                  <option value="mng">Meet & Greet</option>
                  <option value="vc">Video Call</option>
                  <option value="other">Pengumuman</option>
                </select>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Foto (opsional, max 3MB)</label>
                  <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files?.[0]; if (!file) return;
                    if (file.size > 3 * 1024 * 1024) { toast.error('Max 3MB!'); return; }
                    const reader = new FileReader();
                    reader.onloadend = () => setNewAnnouncement(prev => ({...prev, image_url: reader.result as string}));
                    reader.readAsDataURL(file);
                  }} className="w-full text-sm text-foreground" />
                  {newAnnouncement.image_url && <img src={newAnnouncement.image_url} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg" />}
                </div>
                <button type="submit" className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium">Simpan</button>
              </form>
            )}
            <div className="space-y-3">{announcements.map(a => (<div key={a.id} className="glass-card rounded-xl p-4 flex items-center justify-between"><div className="flex items-center gap-3"><Megaphone className="w-5 h-5 text-accent" /><div><h3 className="font-semibold text-foreground">{a.title}</h3><p className="text-xs text-muted-foreground">{a.type} • {a.date ? new Date(a.date).toLocaleDateString('id-ID') : ''}</p></div></div><button onClick={() => handleDeleteAnnouncement(a.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition"><Trash2 className="w-4 h-4 text-destructive" /></button></div>))}{announcements.length === 0 && <p className="text-muted-foreground text-sm">Belum ada.</p>}</div>
          </motion.div>
        )}

        {tab === 'vouchers' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button onClick={() => setShowAddVoucher(!showAddVoucher)} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground font-medium mb-4"><Plus className="w-4 h-4" /> Buat Voucher</button>
            {showAddVoucher && (
              <form onSubmit={handleAddVoucher} className="glass-card rounded-xl p-6 mb-6 space-y-3">
                <input placeholder="Kode voucher" value={newVoucher.code} onChange={e => setNewVoucher({...newVoucher, code: e.target.value.toUpperCase()})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground uppercase" required />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground mb-1 block">Diskon (%)</label><input type="number" min={1} max={100} value={newVoucher.discount_percent} onChange={e => setNewVoucher({...newVoucher, discount_percent: Number(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" required /></div>
                  <div><label className="text-xs text-muted-foreground mb-1 block">Maks. Penggunaan</label><input type="number" min={1} value={newVoucher.max_uses} onChange={e => setNewVoucher({...newVoucher, max_uses: Number(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" required /></div>
                </div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Kedaluwarsa</label><input type="datetime-local" value={newVoucher.expires_at} onChange={e => setNewVoucher({...newVoucher, expires_at: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" /></div>
                <button type="submit" className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium">Simpan</button>
              </form>
            )}
            <div className="space-y-3">{vouchers.map(v => (<div key={v.id} className="glass-card rounded-xl p-4 flex items-center justify-between"><div className="flex items-center gap-3"><Tag className="w-5 h-5 text-primary" /><div><h3 className="font-semibold text-foreground">{v.code}</h3><p className="text-xs text-muted-foreground">Diskon {v.discount_percent}% • {v.used_count}/{v.max_uses}{v.expires_at && ` • Exp: ${new Date(v.expires_at).toLocaleDateString('id-ID')}`}</p><span className={`text-xs font-medium ${v.is_active && v.used_count < v.max_uses ? 'text-success' : 'text-destructive'}`}>{v.is_active && v.used_count < v.max_uses ? '● Aktif' : '● Nonaktif'}</span></div></div><button onClick={() => handleDeleteVoucher(v.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition"><Trash2 className="w-4 h-4 text-destructive" /></button></div>))}{vouchers.length === 0 && <p className="text-muted-foreground text-sm">Belum ada.</p>}</div>
          </motion.div>
        )}

        {tab === 'slider' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Image className="w-5 h-5 text-primary" /> Kelola Slider Home</h2>
            <p className="text-sm text-muted-foreground mb-4">Upload 4 foto untuk slider. Perubahan langsung terlihat secara realtime.</p>
            <div className="grid grid-cols-2 gap-4">
              {SLIDER_KEYS.map((key, i) => (
                <div key={key} className="glass-card rounded-xl p-4">
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

        {tab === 'prizes' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-warning" /> Kelola Hadiah Spin Wheel</h2>
            <button onClick={() => setShowAddPrize(!showAddPrize)} className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground font-medium mb-4"><Plus className="w-4 h-4" /> Tambah Hadiah</button>
            {showAddPrize && (
              <form onSubmit={handleAddPrize} className="glass-card rounded-xl p-6 mb-6 space-y-3">
                <input placeholder="Nama hadiah" value={newPrize.name} onChange={e => setNewPrize({...newPrize, name: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" required />
                <input placeholder="Deskripsi" value={newPrize.description} onChange={e => setNewPrize({...newPrize, description: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground mb-1 block">Peluang (%)</label><input type="number" min={1} max={100} value={newPrize.chance_percent} onChange={e => setNewPrize({...newPrize, chance_percent: Number(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" required /></div>
                  <div><label className="text-xs text-muted-foreground mb-1 block">Urutan</label><input type="number" value={newPrize.sort_order} onChange={e => setNewPrize({...newPrize, sort_order: Number(e.target.value)})} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" /></div>
                </div>
                <button type="submit" className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium">Simpan</button>
              </form>
            )}
            <div className="space-y-3">
              {prizes.map(p => (
                <div key={p.id} className="glass-card rounded-xl p-4">
                  {editPrize?.id === p.id ? (
                    <div className="space-y-2">
                      <input value={editPrize.name} onChange={e => setEditPrize({ ...editPrize, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
                      <input value={editPrize.description} onChange={e => setEditPrize({ ...editPrize, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" placeholder="Deskripsi" />
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-muted-foreground">Peluang (%):</label>
                        <input type="number" min={1} max={100} value={editPrize.chance_percent} onChange={e => setEditPrize({ ...editPrize, chance_percent: Number(e.target.value) })} className="w-20 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSavePrize} className="px-4 py-1.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">Simpan</button>
                        <button onClick={() => setEditPrize(null)} className="px-4 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm">Batal</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{p.name}</h3>
                        <p className="text-xs text-muted-foreground">{p.description} • Peluang: {p.chance_percent}%</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => setEditPrize(p)} className="p-2 rounded-lg hover:bg-primary/10 transition"><Eye className="w-4 h-4 text-primary" /></button>
                        <button onClick={() => handleDeletePrize(p.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition"><Trash2 className="w-4 h-4 text-destructive" /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {prizes.length === 0 && <p className="text-muted-foreground text-sm">Belum ada hadiah.</p>}
              <p className="text-xs text-muted-foreground mt-2">Total peluang: {prizes.reduce((s, p) => s + p.chance_percent, 0)}%</p>
            </div>
          </motion.div>
        )}

        {tab === 'spintransfer' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Send className="w-5 h-5 text-primary" /> Transfer Spin</h2>
            <p className="text-sm text-muted-foreground mb-4">Berikan spin gratis ke pengguna tertentu.</p>
            <div className="glass-card rounded-xl p-6 space-y-3">
              <input value={transferUserId} onChange={e => setTransferUserId(e.target.value)} placeholder="Username penerima..." className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" />
              <div><label className="text-xs text-muted-foreground mb-1 block">Jumlah Spin</label><input type="number" min={1} max={100} value={transferAmount} onChange={e => setTransferAmount(Number(e.target.value))} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground" /></div>
              <button onClick={handleSpinTransfer} className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium">Transfer Spin</button>
            </div>
          </motion.div>
        )}

        {tab === 'live' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Radio className="w-5 h-5 text-destructive" /> Kelola Livestream</h2>
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
              <input value={liveUrl} onChange={e => setLiveUrl(e.target.value)} placeholder="URL YouTube Livestream..." className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
              <input value={liveTitle} onChange={e => setLiveTitle(e.target.value)} placeholder="Judul Livestream..." className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
              <textarea value={liveDesc} onChange={e => setLiveDesc(e.target.value)} placeholder="Deskripsi..." rows={3} className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" />
              <button onClick={handleSaveLive} className="px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium">Simpan Pengaturan</button>
            </div>
          </motion.div>
        )}

        {tab === 'logo' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-primary" /> Logo Website</h2>
            <div className="glass-card rounded-xl p-6 text-center">
              {logoImg ? (
                <div className="mb-4">
                  <img src={logoImg} alt="Logo" className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-primary" />
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="w-10 h-10 text-muted-foreground" />
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-6 py-2 rounded-xl gradient-primary text-primary-foreground font-medium cursor-pointer">
                📷 {logoImg ? 'Ganti Logo' : 'Upload Logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
              <p className="text-xs text-muted-foreground mt-3">Logo akan tampil di header website secara realtime.</p>
            </div>
          </motion.div>
        )}

        {tab === 'maintenance' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-destructive" /> Akses Website</h2>
            <div className="glass-card rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Mode Pemeliharaan</h3>
                  <p className="text-sm text-muted-foreground">Tutup akses website untuk semua pengunjung</p>
                </div>
                <button onClick={handleToggleMaintenance} className={`px-4 py-2 rounded-xl font-medium text-sm transition ${maintenanceMode ? 'bg-destructive text-destructive-foreground' : 'gradient-primary text-primary-foreground'}`}>
                  {maintenanceMode ? '🔴 Website Ditutup' : '🟢 Website Aktif'}
                </button>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Pesan saat website ditutup:</label>
                <textarea value={maintenanceMessage} onChange={e => setMaintenanceMessage(e.target.value)} rows={3}
                  className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm resize-none" />
                <button onClick={handleSaveMaintenanceMsg} className="mt-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">Simpan Pesan</button>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'levels' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-warning" /> Kelola Hadiah Level</h2>
            <p className="text-sm text-muted-foreground mb-2">Atur hadiah untuk setiap level. Syarat naik level:</p>
            <div className="glass-card rounded-xl p-4 mb-4 text-xs text-muted-foreground space-y-1">
              <p>• Level 1→3: Topup 4 koin per level</p>
              <p>• Level 3→8: Topup 8 koin per level</p>
              <p>• Level 8→20: Topup 13 koin per level</p>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 20 }, (_, i) => i + 1).map(level => {
                const reward = levelRewards.find(r => r.level === level);
                const isEditing = editRewardLevel === level;
                return (
                  <div key={level} className="glass-card rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">{level}</span>
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">Level {level}</h3>
                          {reward?.reward_name ? (
                            <p className="text-xs text-muted-foreground">🎁 {reward.reward_name}{reward.reward_description ? ` — ${reward.reward_description}` : ''}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Belum ada hadiah</p>
                          )}
                        </div>
                      </div>
                      <button onClick={() => { setEditRewardLevel(level); setEditRewardName(reward?.reward_name || ''); setEditRewardDesc(reward?.reward_description || ''); }} className="px-3 py-1 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium">Edit</button>
                    </div>
                    {isEditing && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-3 pt-3 border-t border-border/50 space-y-2">
                        <input value={editRewardName} onChange={e => setEditRewardName(e.target.value)} placeholder="Nama hadiah..." className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
                        <input value={editRewardDesc} onChange={e => setEditRewardDesc(e.target.value)} placeholder="Deskripsi hadiah..." className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm" />
                        <div className="flex gap-2">
                          <button onClick={async () => {
                            await supabase.from('level_rewards' as any).upsert({ level, reward_name: editRewardName, reward_description: editRewardDesc } as any, { onConflict: 'level' });
                            setEditRewardLevel(null);
                            toast.success(`Hadiah level ${level} disimpan!`);
                          }} className="px-4 py-1.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium">Simpan</button>
                          <button onClick={() => setEditRewardLevel(null)} className="px-4 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-sm">Batal</button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {tab === 'coins' && <CoinPanel />}
      </main>
    </div>
  );
};

export default OwnerPanel;
