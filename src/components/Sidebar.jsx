import {
  BarChart3,
  BookOpen,
  Gamepad2,
  Home,
  Layers3,
  Leaf,
  LogOut,
  Medal,
  Settings,
  ShieldCheck,
  Target,
  Waves,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/jogos", label: "Jogos", icon: Gamepad2 },
  { to: "/aprender", label: "Aprender", icon: BookOpen },
  { to: "/conquistas", label: "Conquistas", icon: Medal },
  { to: "/progresso", label: "Meu Progresso", icon: BarChart3 },
  { to: "/missoes", label: "Missões Diárias", icon: Target },
  { to: "/conta", label: "Conta", icon: Settings },
];

const adminNavItems = [
  { to: "/admin/dashboard", label: "Administracao", icon: ShieldCheck },
  { to: "/gestao", label: "Gestao", icon: Layers3 },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const progress = user?.xpProximoNivel ? Math.min(100, (user.xp / user.xpProximoNivel) * 100) : 0;
  const items = user?.admin ? [...navItems, ...adminNavItems] : navItems;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="glass-panel relative overflow-hidden border-b border-cyan-100 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-72 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="pointer-events-none absolute -top-20 right-0 h-40 w-40 rounded-full bg-emerald-100/70" />
      <div className="pointer-events-none absolute -bottom-16 -left-12 h-36 w-36 rounded-full bg-cyan-200/50" />

      <div className="flex items-center justify-between px-4 py-4 lg:block lg:px-5 lg:py-6">
        <NavLink to="/" className="relative flex items-center gap-3">
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-sm">
            <Waves size={26} aria-hidden="true" />
            <Leaf className="absolute right-2 top-2 text-emerald-100" size={16} aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base font-black uppercase leading-tight tracking-wide text-slate-950">Guardiões</span>
            <span className="block text-xs font-black uppercase tracking-wide text-blue-800">de Saquarema</span>
            <span className="block text-xs font-semibold text-emerald-700">Educação ambiental</span>
          </span>
        </NavLink>

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-white hover:text-slate-900 lg:hidden"
          title="Sair"
        >
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>

      <nav className="relative flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => [
                "flex min-w-max items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition",
                isActive
                  ? "bg-sky-500 text-white shadow-sm shadow-sky-200"
                  : "text-slate-600 hover:bg-white hover:text-sky-800",
              ].join(" ")}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {user ? (
        <div className="relative hidden border-t border-cyan-100 p-4 lg:block">
          <div className="rounded-2xl border border-cyan-100 bg-white/85 p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-emerald-100 font-black text-emerald-800">
                {user.nome?.charAt(0)?.toUpperCase() || "E"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-950">{user.nome}</p>
                <p className="truncate text-xs text-slate-500">{user.turma || "Turma não informada"}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-sky-50 hover:text-sky-800"
                title="Sair"
              >
                <LogOut size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs font-semibold text-slate-500">
                <span>Nível {user.nivel}</span>
                <span>{user.xp} XP</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-cyan-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-bold text-sky-800">
                <ShieldCheck size={15} aria-hidden="true" />
                Guardião da Praia
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
