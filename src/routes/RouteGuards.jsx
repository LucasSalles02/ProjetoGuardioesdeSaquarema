import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { can, routePermission } from "../services/permissions";
import { useSchool } from "../context/SchoolContext";
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
  const { activeUnit, loading: schoolLoading, switching } = useSchool();
  const { pathname } = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.must_change_password) return <Navigate to="/primeiro-acesso" replace />;
  if ((user.role === "GESTOR_ESCOLAR" || (user.admin && pathname.startsWith("/gestao-escolar"))) && pathname !== "/selecionar-unidade") {
    if (schoolLoading) return <LoadingScreen />;
    if (!activeUnit) return <Navigate to="/selecionar-unidade" replace />;
  }
  return <><div key={user.role === "GESTOR_ESCOLAR" || pathname.startsWith("/gestao-escolar") ? activeUnit?.id || "selection" : user.id}><Outlet /></div>{switching && <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm" role="status"><span className="flex items-center gap-3 rounded-2xl bg-white p-5 text-sm font-bold text-sky-800 shadow-lg"><Loader2 size={22} className="animate-spin" aria-hidden="true" /> Alterando Unidade Escolar...</span></div>}</>;

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


export function PermissionRoute() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const permission = routePermission(pathname);
  const schoolArea = pathname.startsWith("/gestao-escolar");
  const allowed = schoolArea ? (user.role === "GESTOR_ESCOLAR" || (user.admin && can(user, "institutions.read"))) && (can(user, "classes.read") || can(user, "enrollments.read")) : pathname === "/admin/usuarios" ? can(user, "users.read") || can(user, "profiles.read") || can(user, "school_stages.read") : !permission || can(user, permission);
  if (!allowed) return <section className="mx-auto max-w-2xl p-8"><h1 className="text-xl font-bold">Acesso restrito</h1><p className="mt-3 text-slate-600">Seu perfil não permite acessar este módulo. Consulte o administrador.</p><Link to="/" className="mt-5 inline-block font-bold text-sky-700">Voltar ao início</Link></section>;
  return <Outlet />;
}
