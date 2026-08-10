import { lazy, Suspense } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { InstallPrompt } from "@/components/InstallPrompt";

const HomePage = lazy(() => import("./pages/HomePage"));
const BrowsePage = lazy(() => import("./pages/BrowsePage"));
const BusinessProfilePage = lazy(() => import("./pages/BusinessProfilePage"));
const BookServicePage = lazy(() => import("./pages/BookServicePage"));
const BookingsPage = lazy(() => import("./pages/BookingsPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const BusinessDashboard = lazy(() => import("./pages/BusinessDashboard"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const CommissionHistoryPage = lazy(() => import("./pages/CommissionHistoryPage"));
const BusinessAnalyticsPage = lazy(() => import("./pages/BusinessAnalyticsPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TermsPage = lazy(() => import("./pages/TermsPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Sonner />
        <ErrorBoundary>
          <BrowserRouter>
            <div className="max-w-lg mx-auto min-h-screen bg-background relative">
              <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
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
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <BottomNav />
              <InstallPrompt />
            </div>
          </BrowserRouter>
        </ErrorBoundary>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
