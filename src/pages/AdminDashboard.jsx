import { Link } from "react-router-dom";
import { BookOpen, GraduationCap, School, UsersRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { can } from "../services/permissions";
import PageShell from "../components/PageShell";

const modules = [
  { to: "/selecionar-unidade", title: "Gestão de Turmas e Alunos", icon: GraduationCap, description: "Escolha uma unidade para gerenciar suas turmas e alunos.", color: "bg-amber-50 text-amber-700 group-hover:bg-amber-100" },
  { to: "/gestao", title: "Gerenciar missões, aulas e jogos", icon: BookOpen, description: "Organize o conteúdo e as atividades da plataforma.", color: "bg-sky-50 text-sky-700 group-hover:bg-sky-100" },
  { to: "/admin/usuarios", title: "Gerenciar Usuários e Perfis", icon: UsersRound, description: "Cadastre usuários e administre os perfis de acesso.", color: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100" },
  { to: "/admin/unidades-escolares", title: "Gerenciar Unidades Escolares", icon: School, description: "Cadastre unidades e autorize os gestores escolares.", color: "bg-violet-50 text-violet-700 group-hover:bg-violet-100" },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const visibleModules = modules.filter(item => item.to === "/selecionar-unidade" ? can(user, "institutions.read") && (can(user, "classes.read") || can(user, "enrollments.read")) : item.to === "/admin/unidades-escolares" ? can(user, "institutions.read") : item.to === "/gestao" ? can(user, "content.read") : can(user, "users.read") || can(user, "profiles.read") || can(user, "school_stages.read"));
  return (
    <PageShell title="Administração" description="Selecione um submódulo para gerenciar a plataforma.">
      <nav aria-label="Submódulos da Administração" className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 xl:grid-cols-3">
        {visibleModules.map(({ to, title, icon: Icon, description, color }) => <Link key={to} to={to} className="group flex aspect-square w-full max-w-xs flex-col items-center justify-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 motion-reduce:transform-none">
          <span className={`flex h-20 w-20 items-center justify-center rounded-2xl transition-colors ${color}`}><Icon size={36} strokeWidth={1.7} aria-hidden="true" /></span>
          <span className="text-lg font-black leading-snug text-slate-950">{title}</span>
          <span className="text-sm leading-relaxed text-slate-500">{description}</span>
        </Link>)}
      </nav>
      {!visibleModules.length && <p className="mt-5 text-sm text-slate-600">Seu perfil não possui permissões de gerenciamento. Consulte o administrador.</p>}
    </PageShell>
  );
}
