import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerified?: boolean;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireVerified, requireAdmin }: ProtectedRouteProps) => {
  const { user, loading, verificationStatus, roles } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !roles.includes("admin")) {
    return <Navigate to="/" replace />;
  }

  // Gate runner routes: redirect unverified runners
  if (requireVerified) {
    if (!verificationStatus || verificationStatus === "not_submitted" || verificationStatus === "rejected") {
      return <Navigate to="/runner/verification" replace />;
    }
    if (verificationStatus === "under_review") {
      return <Navigate to="/runner/pending" replace />;
    }
    // verified — allow through
  }

  return <>{children}</>;
};

export default ProtectedRoute;
