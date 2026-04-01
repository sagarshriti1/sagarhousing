import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import PropertyDetail from "./pages/PropertyDetail.tsx";
import ListPropertyPage from "./pages/ListPropertyPage.tsx";
import MyListingsPage from "./pages/MyListingsPage.tsx";
import RealtorsPage from "./pages/RealtorsPage.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import RealtorDashboard from "./pages/RealtorDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/property/:id" element={<PropertyDetail />} />
            <Route path="/list-property" element={<ProtectedRoute><ListPropertyPage /></ProtectedRoute>} />
            <Route path="/edit-property/:id" element={<ProtectedRoute><ListPropertyPage /></ProtectedRoute>} />
            <Route path="/my-listings" element={<ProtectedRoute><MyListingsPage /></ProtectedRoute>} />
            <Route path="/realtors" element={<RealtorsPage />} />
            <Route path="/realtor-dashboard" element={<ProtectedRoute><RealtorDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
