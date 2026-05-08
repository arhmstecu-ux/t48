import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Smartphone, Wifi, Music2, Bell, Zap, Apple, Chrome } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const Install = () => {
  const navigate = useNavigate();
  const [deferred, setDeferred] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [iOS, setIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIOS(/iphone|ipad|ipod/.test(ua));
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    setInstalled(!!standalone);
    const onPrompt = (e: any) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice?.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  };

  const features = [
    { icon: Music2, title: "Lagu JKT48 Tanpa Kuota", desc: "Lagu yang sudah didengar tersimpan otomatis — bisa diputar tanpa internet." },
    { icon: Zap, title: "Lebih Cepat", desc: "Memuat instan setelah dibuka pertama kali, tanpa loading ulang." },
    { icon: Bell, title: "Notifikasi Real-time", desc: "Update show, livestream, dan pengumuman langsung ke layar HP." },
    { icon: Wifi, title: "Mode Hemat Data", desc: "Aset gambar & menu di-cache, hemat hingga 80% kuota." },
    { icon: Smartphone, title: "Berasa Aplikasi Asli", desc: "Tampil layar penuh tanpa bar browser, ada di home screen." },
  ];

  return (
    <div className="min-h-screen bg-background pb-10">
      <Header />
      <main className="container mx-auto px-4 py-6 max-w-xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <div className="w-20 h-20 rounded-3xl gradient-primary mx-auto mb-3 grid place-items-center shadow-2xl">
            <Download className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-gradient">Install Aplikasi T48ID</h1>
          <p className="text-sm text-muted-foreground mt-2">Akses lagu JKT48 tanpa kuota, lebih cepat, dan langsung dari home screen.</p>
        </motion.div>

        {installed ? (
          <Card className="p-6 text-center border-chart-4/30 bg-chart-4/10">
            <div className="text-4xl mb-2">✅</div>
            <div className="font-bold text-chart-4">Aplikasi sudah terpasang!</div>
            <p className="text-xs text-muted-foreground mt-1">Buka dari home screen untuk pengalaman terbaik.</p>
          </Card>
        ) : iOS ? (
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-2 font-bold"><Apple className="w-5 h-5" /> Pasang di iPhone / iPad</div>
            <ol className="text-sm space-y-2 list-decimal pl-5 text-muted-foreground">
              <li>Buka situs ini di <b>Safari</b> (bukan app lain).</li>
              <li>Tekan tombol <b>Bagikan</b> ⬆️ di bawah layar.</li>
              <li>Pilih <b>“Tambah ke Layar Utama”</b>.</li>
              <li>Tekan <b>Tambah</b> di pojok kanan atas.</li>
            </ol>
          </Card>
        ) : (
          <Card className="p-5 space-y-3 text-center">
            <div className="flex items-center justify-center gap-2 font-bold"><Chrome className="w-5 h-5" /> Pasang di Android / Chrome</div>
            {deferred ? (
              <Button onClick={handleInstall} size="lg" className="w-full gradient-primary text-white gap-2">
                <Download className="w-5 h-5" /> Install Sekarang
              </Button>
            ) : (
              <div className="text-xs text-muted-foreground">
                Buka menu browser (⋮ pojok kanan atas) → pilih <b>“Install aplikasi”</b> atau <b>“Tambah ke Layar Utama”</b>.
              </div>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 gap-2 mt-5">
          {features.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-3 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl gradient-primary grid place-items-center shrink-0">
                  <f.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-sm">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        <Button variant="outline" onClick={() => navigate("/")} className="w-full mt-5">Kembali ke Beranda</Button>
      </main>
    </div>
  );
};

export default Install;
