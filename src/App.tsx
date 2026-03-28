import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import HomePage from "./pages/HomePage";
import BrowsePage from "./pages/BrowsePage";
import BusinessProfilePage from "./pages/BusinessProfilePage";
import BookServicePage from "./pages/BookServicePage";
import BookingsPage from "./pages/BookingsPage";
import AccountPage from "./pages/AccountPage";
import AuthPage from "./pages/AuthPage";
import BusinessDashboard from "./pages/BusinessDashboard";
import AdminPanel from "./pages/AdminPanel";
import CommissionHistoryPage from "./pages/CommissionHistoryPage";
import BusinessAnalyticsPage from "./pages/BusinessAnalyticsPage";
import MessagesPage from "./pages/MessagesPage";
import ChatPage from "./pages/ChatPage";
import NotFound from "./pages/NotFound";
import TermsPage from "./pages/TermsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <div className="max-w-lg mx-auto min-h-screen bg-background relative">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/business/:id" element={<BusinessProfilePage />} />
              <Route path="/book/:id" element={<BookServicePage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/dashboard" element={<BusinessDashboard />} />
              <Route path="/dashboard/commissions" element={<CommissionHistoryPage />} />
              <Route path="/dashboard/analytics" element={<BusinessAnalyticsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/messages/:bookingId" element={<ChatPage />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <BottomNav />
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
