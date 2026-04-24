import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { initializeReferralSystem } from "@/lib/initialize";
import Index from "./pages/Index.tsx";
import Chat from "./pages/Chat.tsx";
import Reminders from "./pages/Reminders.tsx";
import Donors from "./pages/Donors.tsx";
import Sos from "./pages/Sos.tsx";
import Vault from "./pages/Vault.tsx";
import Auth from "./pages/Auth.tsx";
import Invite from "./pages/Invite.tsx";
import NotFound from "./pages/NotFound.tsx";
import { useReferralCapture } from "./hooks/useReferralCapture";

const queryClient = new QueryClient();

const ReferralCaptureBoundary = ({ children }: { children: React.ReactNode }) => {
  useReferralCapture();

  useEffect(() => {
    // Initialize referral system on app load
    initializeReferralSystem().catch((err) => {
      console.error("[v0] Failed to initialize referral system:", err);
    });
  }, []);

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ReferralCaptureBoundary>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/reminders" element={<Reminders />} />
              <Route path="/donors" element={<Donors />} />
              <Route path="/sos" element={<Sos />} />
              <Route path="/vault" element={<Vault />} />
              <Route path="/invite" element={<Invite />} />
              <Route path="/auth" element={<Auth />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ReferralCaptureBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
