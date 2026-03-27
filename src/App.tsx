import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Cart from "./pages/Cart";
import Payment from "./pages/Payment";
import MyPage from "./pages/MyPage";
import OwnerPanel from "./pages/OwnerPanel";
import Members from "./pages/Members";
import ShowCatalog from "./pages/ShowCatalog";
import ReplayShow from "./pages/ReplayShow";
import Announcements from "./pages/Announcements";
import Ranking from "./pages/Ranking";
import AdminLogin from "./pages/AdminLogin";
import GroupChat from "./pages/GroupChat";
import SpinWheel from "./pages/SpinWheel";
import LiveStream from "./pages/LiveStream";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const MaintenanceGuard = ({ children }: { children: React.ReactNode }) => {
  const { isOwner, loading: authLoading } = useAuth();
  const [maintenance, setMaintenance] = useState(false);
  const [message, setMessage] = useState("Website sedang dalam pemeliharaan.");
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.from("app_settings").select("*").in("key", ["maintenance_mode", "maintenance_message"]);
      if (data) {
        const mm = data.find(d => d.key === "maintenance_mode");
        const msg = data.find(d => d.key === "maintenance_message");
        if (mm?.value === "true") setMaintenance(true);
        else setMaintenance(false);
        if (msg?.value) setMessage(msg.value);
      }
      setChecking(false);
    };
    check();
    const ch = supabase.channel("maintenance-rt").on("postgres_changes" as any, { event: "*", schema: "public", table: "app_settings" }, () => check()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  if (checking || authLoading) return null;
  if (maintenance && !isOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🔧</div>
          <h1 className="text-2xl font-extrabold text-gradient mb-3">Website Ditutup Sementara</h1>
          <p className="text-muted-foreground whitespace-pre-wrap">{message}</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <MaintenanceGuard>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/payment" element={<Payment />} />
                <Route path="/my-page" element={<MyPage />} />
                <Route path="/owner" element={<OwnerPanel />} />
                <Route path="/members" element={<Members />} />
                <Route path="/show" element={<ShowCatalog />} />
                <Route path="/replay" element={<ReplayShow />} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/ranking" element={<Ranking />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/group-chat" element={<GroupChat />} />
                <Route path="/spin" element={<SpinWheel />} />
                <Route path="/live" element={<LiveStream />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </MaintenanceGuard>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
