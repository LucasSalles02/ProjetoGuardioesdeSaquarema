import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-blue-700">
      <Loader2 className="animate-spin" size={28} aria-hidden="true" />
    </div>
  );
}

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/primeiro-acesso" replace />;

  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to={user.must_change_password ? "/primeiro-acesso" : user.admin ? "/admin/dashboard" : "/"} replace />;

  return <Outlet />;
}

export function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (user.must_change_password) return <Navigate to="/primeiro-acesso" replace />;
  if (!user.admin) return <Navigate to="/" replace />;

  return <Outlet />;
}

