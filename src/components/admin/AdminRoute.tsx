import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoadingScreen from "@/components/common/LoadingScreen";

export default function AdminRoute() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <LoadingScreen fullScreen={true} subtitle="Verifying authorization..." />;
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Outlet />;
}
