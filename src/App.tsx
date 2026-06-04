import { useState, useEffect, lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotificationPermissionBanner from "./components/NotificationPermissionBanner";

// Lazy-loaded routes for snappier first paint
const MyPage = lazy(() => import("./pages/MyPage"));
const OwnerPanel = lazy(() => import("./pages/OwnerPanel"));
const Members = lazy(() => import("./pages/Members"));
const ShowCatalog = lazy(() => import("./pages/ShowCatalog"));
const ReplayShow = lazy(() => import("./pages/ReplayShow"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Ranking = lazy(() => import("./pages/Ranking"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const PaidLiveStream = lazy(() => import("./pages/PaidLiveStream"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminPanelPage = lazy(() => import("./pages/AdminPanelPage"));
const Playlist = lazy(() => import("./pages/Playlist"));
const Install = lazy(() => import("./pages/Install"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

const SecurityGuard = () => {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => { e.preventDefault(); };
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const blockedCombo =
        key === "f12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) ||
        (e.ctrlKey && key === "u");
      if (blockedCombo) e.preventDefault();
    };
    window.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);
  return null;
};

const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { isOwner, loading: authLoading } = useAuth();
  const location = useLocation();
  const [maintenance, setMaintenance] = useState(false);
  const [message, setMessage] = useState("Website sedang dalam pemeliharaan.");
  const [checking, setChecking] = useState(true);

  const isAuthRoute = ["/login", "/register", "/reset-password", "/admin-login"].includes(location.pathname);

  useEffect(() => {
    if (isAuthRoute) {
      setChecking(false);
      return;
    }

    let cancelled = false;
    // Hard fail-safe: NEVER block UI more than 2s even if backend is down/CORS-blocked
    const failSafe = setTimeout(() => { if (!cancelled) setChecking(false); }, 2000);

    const check = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("*")
          .in("key", ["maintenance_mode", "maintenance_message"]);
        if (cancelled) return;
        if (!error && data) {
          const mm = data.find(d => d.key === "maintenance_mode");
          const msg = data.find(d => d.key === "maintenance_message");
          setMaintenance(mm?.value === "true");
          if (msg?.value) setMessage(msg.value);
        }
      } catch (e) {
        // backend unreachable — don't block the site
        console.warn("[maintenance] check failed, opening site anyway", e);
      } finally {
        if (!cancelled) setChecking(false);
      }
    };
    check();

    let ch: ReturnType<typeof supabase.channel> | null = null;
    try {
      ch = supabase.channel("maintenance-rt").on("postgres_changes" as any, { event: "*", schema: "public", table: "app_settings" }, () => check()).subscribe();
    } catch {}
    return () => {
      cancelled = true;
      clearTimeout(failSafe);
      if (ch) { try { supabase.removeChannel(ch); } catch {} }
    };
  }, [isAuthRoute]);

  if (isAuthRoute) return <>{children}</>;
  if (checking || authLoading) return null;
  if (maintenance && !isOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔧</div>
          <h1 className="text-2xl font-extrabold text-gradient mb-3">Website Ditutup Sementara</h1>
          <p className="text-muted-foreground whitespace-pre-wrap mb-5">{message}</p>
          <a href="https://whatsapp.com/channel/0029VbBgutpEKyZFRQ8hK33l" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[hsl(142,70%,45%)] text-white font-bold text-sm hover:opacity-90 transition-opacity">
            📢 Gabung Saluran WhatsApp
          </a>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const NotificationListener = () => { useBrowserNotifications(); return null; };

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SecurityGuard />
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <NotificationListener />
          <NotificationPermissionBanner />
          <MaintenanceGuard>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/my-page" element={<MyPage />} />
                <Route path="/owner" element={<OwnerPanel />} />
                <Route path="/members" element={<Members />} />
                <Route path="/show" element={<ShowCatalog />} />
                <Route path="/replay" element={<ReplayShow />} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/ranking" element={<Ranking />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/group-chat" element={<GroupChat />} />
                <Route path="/live" element={<LiveStream />} />
                <Route path="/live-paid" element={<PaidLiveStream />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/admin-panel" element={<AdminPanelPage />} />
                <Route path="/playlist" element={<Playlist />} />
                <Route path="/install" element={<Install />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <div className="w-full text-center py-3 text-xs text-muted-foreground/50 font-medium select-none">@t48id</div>
          </MaintenanceGuard>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
