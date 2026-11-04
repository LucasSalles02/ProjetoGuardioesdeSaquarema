import { useAuth } from "../context/AuthContext";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import FloatingProfile from "../components/FloatingProfile";
import { useSchool } from "../context/SchoolContext";

export default function AppLayout() {
  const { activeUnit } = useSchool();
  const { user } = useAuth();
  const { pathname } = useLocation();
  return (
    <div className="marine-app-bg min-h-screen pt-20 lg:flex lg:pt-0">
      <FloatingProfile />
      <Sidebar />
      <main className="min-w-0 flex-1 lg:pt-20">
        {activeUnit && (user.role === "GESTOR_ESCOLAR" || pathname.startsWith("/gestao-escolar")) && <div className="mx-4 mt-4 flex flex-wrap items-center gap-x-2 rounded-xl border border-sky-100 bg-white/80 px-4 py-2.5 text-sm sm:mx-6 lg:mx-8"><span className="font-medium text-slate-500">Unidade ativa:</span><span className="break-words font-bold text-sky-800">{activeUnit.name}</span></div>}
        <Outlet />
      </main>
    </div>
  );
}
