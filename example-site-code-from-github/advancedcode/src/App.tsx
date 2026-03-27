import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import RoleSelect from "./pages/RoleSelect";
import CustomerDashboard from "./pages/customer/CustomerDashboard";
import CustomerErrands from "./pages/customer/CustomerErrands";
import PostErrand from "./pages/customer/PostErrand";
import MpesaPay from "./pages/customer/MpesaPay";
import ErrandDetail from "./pages/customer/ErrandDetail";
import RunnerDashboard from "./pages/runner/RunnerDashboard";
import RunnerErrands from "./pages/runner/RunnerErrands";
import RunnerVerification from "./pages/runner/RunnerVerification";
import RunnerPending from "./pages/runner/RunnerPending";
import WalletPage from "./pages/shared/WalletPage";
import ProfilePage from "./pages/shared/ProfilePage";
import AdminDashboard from "./pages/admin/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/role-select" element={<ProtectedRoute><RoleSelect /></ProtectedRoute>} />
            
            {/* Customer routes */}
            <Route path="/customer" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/customer/errands" element={<ProtectedRoute><CustomerErrands /></ProtectedRoute>} />
            <Route path="/customer/post-errand" element={<ProtectedRoute><PostErrand /></ProtectedRoute>} />
            <Route path="/customer/mpesa-pay" element={<ProtectedRoute><MpesaPay /></ProtectedRoute>} />
            <Route path="/customer/errand/:id" element={<ProtectedRoute><ErrandDetail /></ProtectedRoute>} />
            <Route path="/customer/wallet" element={<ProtectedRoute><WalletPage type="customer" /></ProtectedRoute>} />
            <Route path="/customer/profile" element={<ProtectedRoute><ProfilePage type="customer" /></ProtectedRoute>} />
            
            {/* Runner routes — verification + pending are NOT gated */}
            <Route path="/runner/verification" element={<ProtectedRoute><RunnerVerification /></ProtectedRoute>} />
            <Route path="/runner/pending" element={<ProtectedRoute><RunnerPending /></ProtectedRoute>} />
            
            {/* Runner routes — gated by verification */}
            <Route path="/runner" element={<ProtectedRoute requireVerified><RunnerDashboard /></ProtectedRoute>} />
            <Route path="/runner/errands" element={<ProtectedRoute requireVerified><RunnerErrands /></ProtectedRoute>} />
            <Route path="/runner/errand/:id" element={<ProtectedRoute requireVerified><ErrandDetail /></ProtectedRoute>} />
            <Route path="/runner/wallet" element={<ProtectedRoute requireVerified><WalletPage type="runner" /></ProtectedRoute>} />
            <Route path="/runner/profile" element={<ProtectedRoute requireVerified><ProfilePage type="runner" /></ProtectedRoute>} />
            
            {/* Admin route */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
