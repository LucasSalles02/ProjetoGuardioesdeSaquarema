import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, GraduationCap, Leaf, School, UsersRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { can } from "../services/permissions";
import PageShell from "../components/PageShell";
import HomeWelcome from "../components/HomeWelcome";

const modules = [
  { to: "/selecionar-unidade", title: "Consultar Turmas e Alunos", icon: GraduationCap, description: "Escolha uma unidade para consultar turmas e alunos.", color: "bg-cyan-50 text-ocean-700 group-hover:bg-cyan-100" },
  { to: "/gestao", title: "Gerenciar missões, aulas e jogos", icon: BookOpen, description: "Organize o conteúdo e as atividades da plataforma.", color: "bg-sky-50 text-sky-700 group-hover:bg-sky-100" },
  { to: "/admin/usuarios", title: "Gerenciar Usuários e Perfis", icon: UsersRound, description: "Cadastre usuários e administre os perfis de acesso.", color: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100" },
  { to: "/admin/unidades-escolares", title: "Gerenciar Unidades Escolares", icon: School, description: "Cadastre unidades, etapas escolares e autorize os gestores.", color: "bg-teal-50 text-teal-700 group-hover:bg-teal-100" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const visibleModules = modules.filter(item => item.to === "/selecionar-unidade" ? can(user, "institutions.read") && (can(user, "classes.read") || can(user, "enrollments.read")) : item.to === "/admin/unidades-escolares" ? can(user, "institutions.read") || can(user, "school_stages.read") : item.to === "/gestao" ? can(user, "content.read") || can(user, "highlights.read") : can(user, "users.read") || can(user, "profiles.read"));
  return (
    <PageShell title="Administração" description="Selecione um submódulo para gerenciar a plataforma.">
      <HomeWelcome title={`Bem-vindo, ${user.nome}!`} description="Cuidar da educação é cultivar o futuro de Saquarema. Organize os acessos, conteúdos e unidades pelos módulos disponíveis para seu perfil." eyebrow="Gestão da plataforma">
        <span className="home-context-chip inline-flex items-center gap-2 rounded-xl border border-cyan-100 bg-white/90 px-3 py-2 text-xs font-bold text-ocean-700"><School size={16} aria-hidden="true" />{visibleModules.length} {visibleModules.length === 1 ? "submódulo disponível" : "submódulos disponíveis"}</span><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800"><Leaf size={15} aria-hidden="true" />Educação que cuida da nossa cidade</span>
      </HomeWelcome>
      <nav aria-label="Submódulos da Administração" className="adaptive-card-grid mt-6 grid gap-5">
        {visibleModules.map(({ to, title, icon: Icon, description, color }) => <Link key={to} to={to} className="home-module-card home-card group relative flex aspect-square w-full max-w-xs flex-col items-center justify-center gap-5 rounded-3xl border border-cyan-100 bg-white p-6 text-center shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600">
          <ArrowUpRight size={17} className="absolute right-4 top-4 text-cyan-700" aria-hidden="true" /><span className={`home-module-icon flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-white ${color}`}><Icon size={36} strokeWidth={1.9} aria-hidden="true" /></span>
          <span className="text-lg font-black leading-snug text-slate-950">{title}</span>
          <span className="text-sm leading-relaxed text-slate-500">{description}</span>
        </Link>)}
      </nav>
      {!visibleModules.length && <p className="mt-5 text-sm text-slate-600">Seu perfil não possui permissões de gerenciamento. Consulte o administrador.</p>}
    </PageShell>
  );
}
