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
    <div className="marine-app-bg min-h-dvh lg:flex">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <header className="app-topbar sticky top-0 z-40 flex items-start justify-between gap-3 bg-transparent px-3 py-3 sm:px-6 lg:px-8">
          <Sidebar mobile />
          <div className="ml-auto min-w-0 max-w-sm flex-1 lg:w-80 lg:max-w-xs lg:flex-none"><FloatingProfile /></div>
        </header>
        {activeUnit && (user.role === "GESTOR_ESCOLAR" || pathname.startsWith("/gestao-escolar")) && <div className="mx-4 mt-4 flex flex-wrap items-center gap-x-2 rounded-xl border border-sky-100 bg-white/80 px-4 py-2.5 text-sm sm:mx-6 lg:mx-8"><span className="font-medium text-slate-500">Unidade ativa:</span><span className="break-words font-bold text-sky-800">{activeUnit.name}</span></div>}
        <Outlet />
      </main>
    </div>
  );
}
