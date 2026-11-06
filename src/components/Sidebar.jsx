import { BarChart3, BookOpen, Gamepad2, GraduationCap, Home, Leaf, Medal, Menu, PanelLeftClose, PanelLeftOpen, Settings, ShieldCheck, Target, Waves, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
const adminNavItems = [{ to: "/admin/dashboard", label: "Administrador", icon: ShieldCheck }];

function currentItem(item, pathname) {
  return pathname === item.to || (!item.end && pathname.startsWith(`${item.to}/`))
    || (item.label === "Gestão" && pathname.startsWith("/gestao-escolar"))
    || (item.to === "/admin/dashboard" && (pathname.startsWith("/admin/usuarios") || pathname.startsWith("/admin/unidades-escolares") || pathname.startsWith("/admin/destaques") || pathname === "/gestao"));
}

export default function Sidebar({ mobile = false }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const navigationId = useId();
  const { pathname } = useLocation();
  const canManage = (can(user, "classes.read") || can(user, "enrollments.read")) && (user?.role === "GESTOR_ESCOLAR" || (user?.admin && can(user, "institutions.read")));
  const managementItems = canManage ? [{ to: user?.admin ? "/selecionar-unidade" : "/gestao-escolar", label: "Gestão", icon: GraduationCap }] : [];
  const items = (user?.role === "GESTOR_ESCOLAR"
    ? [navItems[0], ...managementItems, navItems[navItems.length - 1]]
    : user?.admin ? [...adminNavItems, { ...navItems[0], label: "Tela Inicial do Aluno" }, ...navItems.slice(1), ...managementItems] : navItems
  ).filter(item => !routePermission(item.to) || can(user, routePermission(item.to)));

  if (mobile) return <MobileSidebar items={items} pathname={pathname} user={user} />;
  return <aside data-collapsed={collapsed} className={`ocean-navigation relative isolate hidden shrink-0 overflow-hidden border-r border-cyan-100 transition-[width] duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col ${collapsed ? "lg:w-20" : "lg:w-64 xl:w-72"}`}>
    <NavigationBackdrop />
    <header className={`relative border-b border-white/90 py-5 ${collapsed ? "px-3" : "px-4"}`}>
      <div className={`flex items-center justify-between gap-2 ${collapsed ? "flex-col gap-3" : ""}`}><NavigationBrand collapsed={collapsed} />
        <button type="button" onClick={() => setCollapsed(value => !value)} aria-label={collapsed ? "Expandir menu lateral" : "Minimizar menu lateral"} aria-expanded={!collapsed} aria-controls={navigationId} title={collapsed ? "Expandir menu lateral" : "Minimizar menu lateral"} className="ocean-nav-control flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-100 bg-white text-ocean-700 focus-visible:outline-sky-600">{collapsed ? <PanelLeftOpen size={19} aria-hidden="true" /> : <PanelLeftClose size={19} aria-hidden="true" />}</button>
      </div>
      {!collapsed && <NavigationRole user={user} />}
    </header>
    {!collapsed && <p className="relative px-6 pb-1 pt-5 text-[10px] font-black uppercase tracking-[0.16em] text-sky-800">Explore a plataforma</p>}
    <NavigationLinks id={navigationId} items={items} pathname={pathname} collapsed={collapsed} />
    <NavigationFooter collapsed={collapsed} />
  </aside>;
}

function NavigationBrand({ collapsed = false, onNavigate }) {
  return <Link to="/" onClick={onNavigate} aria-label="Guardiões de Saquarema — início" title={collapsed ? "Guardiões de Saquarema" : undefined} className="flex min-w-0 items-center gap-2.5 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600">
    <span className="ocean-nav-brand-icon relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-white text-white"><Waves size={25} strokeWidth={2.4} aria-hidden="true" /></span>
    {!collapsed && <span className="min-w-0 text-sm font-black leading-tight text-sky-950">Guardiões<span className="block text-xs font-bold text-ocean-700">de Saquarema</span></span>}
  </Link>;
}

function NavigationRole({ user }) {
  const Icon = user?.admin ? ShieldCheck : user?.role === "GESTOR_ESCOLAR" ? BookOpen : GraduationCap;
  const label = user?.profile_name || (user?.admin ? "Administrador" : user?.role === "GESTOR_ESCOLAR" ? "Gestão Escolar" : "Aluno");
  return <div className="mt-4 flex min-w-0 items-center gap-2.5 rounded-2xl border border-white bg-white/80 px-3 py-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-ocean-700"><Icon size={17} aria-hidden="true" /></span><div className="min-w-0"><p className="text-[10px] font-semibold text-slate-500">Seu espaço</p><p className="break-words text-xs font-black text-sky-900">{label}</p></div><span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" aria-hidden="true" /></div>;
}

function NavigationLinks({ id, items, pathname, collapsed = false, onNavigate }) {
  return <nav id={id} aria-label="Menu principal" className={`relative flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-3 py-3 ${collapsed ? "mt-2" : ""}`}>{items.map(item => {
    const Icon = item.icon;
    const active = currentItem(item, pathname);
    return <Link key={item.to} to={item.to} onClick={onNavigate} aria-label={item.label} aria-current={active ? "page" : undefined} title={collapsed ? item.label : undefined} data-active={active} data-collapsed={collapsed} className="ocean-nav-link group relative flex min-w-0 items-center gap-3 rounded-2xl border px-2.5 py-2 text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">
      <span className="ocean-nav-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"><Icon size={21} strokeWidth={active ? 2.3 : 1.9} aria-hidden="true" /></span>
      {!collapsed && <><span className="min-w-0 flex-1 break-words leading-snug">{item.label}</span><span className="ocean-nav-marker h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true" /></>}
    </Link>;
  })}</nav>;
}

function NavigationFooter({ collapsed = false }) {
  return <footer className="relative shrink-0 border-t border-white/90 px-4 py-4">{collapsed ? <Leaf size={20} className="mx-auto text-teal-600" aria-hidden="true" /> : <p className="flex items-center justify-center gap-2 text-xs font-semibold text-ocean-700"><Leaf size={15} className="shrink-0 text-teal-600" aria-hidden="true" />Aprender é cuidar.</p>}</footer>;
}

function NavigationBackdrop() {
  return <div className="ocean-nav-decoration pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true"><span className="ocean-nav-glow absolute -right-20 -top-24 h-64 w-64 rounded-full" /><span className="ocean-nav-bubble ocean-nav-bubble--one" /><span className="ocean-nav-bubble ocean-nav-bubble--two" /><span className="ocean-nav-bubble ocean-nav-bubble--three" /><svg className="ocean-nav-wave absolute bottom-0 left-0 h-24 w-full text-teal-300/30" viewBox="0 0 280 90" fill="none" preserveAspectRatio="none"><path d="M-20 40Q50 5 120 40T300 40M-20 60Q50 25 120 60T300 60M-20 80Q50 45 120 80T300 80" stroke="currentColor" strokeWidth="1.5" /></svg></div>;
}

function MobileSidebar({ items, pathname, user }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  const trigger = useRef(null);
  const titleId = useId();
  const menuId = useId();
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const triggerElement = trigger.current;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    const media = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = event => { if (event.matches) setOpen(false); };
    media.addEventListener("change", closeOnDesktop);
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      media.removeEventListener("change", closeOnDesktop);
      if (!media.matches && triggerElement?.isConnected) triggerElement.focus();
    };
  }, [open]);

  return <div className="shrink-0 lg:hidden">
    <button ref={trigger} type="button" onClick={() => setOpen(true)} aria-label="Abrir menu principal" aria-expanded={open} aria-controls={menuId} className="ocean-nav-control flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-white bg-cyan-50 text-ocean-700 shadow-sm focus-visible:outline-sky-600"><Menu size={23} aria-hidden="true" /></button>
    <dialog ref={dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); setOpen(false); }} onClick={event => { if (event.target === event.currentTarget) setOpen(false); }} className="mobile-navigation-dialog ocean-navigation m-0 h-dvh max-h-dvh w-[min(20rem,calc(100%_-_2rem))] max-w-none overflow-hidden border-0 p-0 text-slate-950 shadow-2xl backdrop:bg-slate-950/40 backdrop:backdrop-blur-sm">
      <div className="relative isolate flex h-full min-h-0 flex-col"><NavigationBackdrop /><header className="relative shrink-0 border-b border-white px-4 pb-4 pt-5"><div className="flex items-center justify-between gap-3"><NavigationBrand onNavigate={() => setOpen(false)} /><button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" className="ocean-nav-control flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-100 bg-white text-ocean-700"><X size={21} aria-hidden="true" /></button></div><h2 id={titleId} className="sr-only">Navegação de Guardiões de Saquarema</h2><NavigationRole user={user} /></header>
        <p className="relative px-6 pb-1 pt-5 text-[10px] font-black uppercase tracking-[0.16em] text-sky-800">Explore a plataforma</p><NavigationLinks id={menuId} items={items} pathname={pathname} onNavigate={() => setOpen(false)} /><NavigationFooter />
      </div>
    </dialog>
  </div>;
}
