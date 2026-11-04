import {
  BarChart3,
  BookOpen,
  Gamepad2,
  GraduationCap,
  Home,
  Leaf,
  Medal,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShieldCheck,
  Target,
  Waves,
} from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { can, routePermission } from "../services/permissions";
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
  { to: "/admin/dashboard", label: "Administração", icon: ShieldCheck },
];

export default function Sidebar() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const canManage = (can(user, "classes.read") || can(user, "enrollments.read")) && (user?.role === "GESTOR_ESCOLAR" || (user?.admin && can(user, "institutions.read")));
  const managementItems = canManage ? [{ to: user?.admin ? "/selecionar-unidade" : "/gestao-escolar", label: "Gestão", icon: GraduationCap }] : [];
  const items = (user?.role === "GESTOR_ESCOLAR"
    ? [navItems[0], ...managementItems, navItems[navItems.length - 1]]
    : user?.admin ? [...navItems, ...managementItems, ...adminNavItems] : navItems
  ).filter(item => !routePermission(item.to) || can(user, routePermission(item.to)));

  return (
    <aside className={`glass-panel relative shrink-0 overflow-hidden border-b border-cyan-100 transition-[width] duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r ${collapsed ? "lg:w-20" : "lg:w-72"}`}>
      <div className="pointer-events-none absolute -top-20 right-0 h-40 w-40 rounded-full bg-emerald-100/70" />
      <div className="pointer-events-none absolute -bottom-16 -left-12 h-36 w-36 rounded-full bg-cyan-200/50" />

      <div className={`relative flex items-center justify-between gap-2 px-3 py-4 ${collapsed ? "lg:flex-col" : "lg:flex-wrap lg:px-5"}`}>
        <NavLink to="/" aria-label="Guardiões de Saquarema — início" className="relative flex min-w-0 items-center gap-3">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-sm">
            <Waves size={26} aria-hidden="true" />
            <Leaf className="absolute right-2 top-2 text-emerald-100" size={16} aria-hidden="true" />
          </span>
          <span className={collapsed ? "hidden" : "block"}>
            <span className="block text-base font-black uppercase leading-tight tracking-wide text-slate-950">Guardiões</span>
            <span className="block text-xs font-black uppercase tracking-wide text-blue-800">de Saquarema</span>
            <span className="block text-xs font-semibold text-emerald-700">Educação ambiental</span>
          </span>
        </NavLink>

        <button
          type="button"
          onClick={() => setCollapsed(value => !value)}
          aria-label={collapsed ? "Expandir menu lateral" : "Minimizar menu lateral"}
          aria-expanded={!collapsed}
          aria-controls="main-navigation"
          title={collapsed ? "Expandir menu lateral" : "Minimizar menu lateral"}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-100 bg-white text-sky-700 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
        >
          {collapsed ? <PanelLeftOpen size={20} aria-hidden="true" /> : <PanelLeftClose size={20} aria-hidden="true" />}
        </button>
      </div>

      <nav id="main-navigation" aria-label="Menu principal" className="relative flex gap-1 overflow-x-auto px-3 pb-3 lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-3 lg:pb-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => [
                "flex min-w-max items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700",
                collapsed ? "justify-center" : "",
                (isActive || (item.label === "Gestão" && pathname.startsWith("/gestao-escolar")) || (item.to === "/admin/dashboard" && (pathname.startsWith("/admin/usuarios") || pathname.startsWith("/admin/unidades-escolares") || pathname === "/gestao")))
                  ? "bg-sky-500 text-white shadow-sm shadow-sky-200"
                  : "text-slate-600 hover:bg-white hover:text-sky-800",
              ].join(" ")}
            >
              <Icon size={18} aria-hidden="true" />
              <span className={collapsed ? "hidden" : "block"}>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

    </aside>
  );
}
