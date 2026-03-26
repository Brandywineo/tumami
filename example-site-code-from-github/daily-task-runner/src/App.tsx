import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RoleSelect from "./pages/RoleSelect";
import Dashboard from "./pages/Dashboard";
import PostErrand from "./pages/PostErrand";
import Errands from "./pages/Errands";
import WalletPage from "./pages/WalletPage";
import Profile from "./pages/Profile";
import RunnerVerification from "./pages/RunnerVerification";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/role-select" element={<RoleSelect />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/post-errand" element={<PostErrand />} />
          <Route path="/errands" element={<Errands />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/runner-verification" element={<RunnerVerification />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
