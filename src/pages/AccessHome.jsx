import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { School } from "lucide-react";
import { useSchool } from "../context/SchoolContext";
import PageShell from "../components/PageShell";
import { useAuth } from "../context/AuthContext";
import { can } from "../services/permissions";

export default function AccessHome() {
  const { user } = useAuth();
  const { activeUnit } = useSchool();
  const links = [["learning.read", "/aprender", "Aprender"], ["games.read", "/jogos", "Jogos"], ["missions.read", "/missoes", "Missões"], ["progress.read", "/progresso", "Meu progresso"], ["achievements.read", "/conquistas", "Conquistas"]];
  return <PageShell title={`Olá, ${user.nome}`} description={`Perfil de acesso: ${user.profile_name}`}>
    {user.role === "GESTOR_ESCOLAR" && activeUnit && <section className="mb-5 rounded-2xl border border-sky-100 bg-white p-6"><School size={28} className="text-sky-700" aria-hidden="true" /><p className="mt-4 text-xs font-bold uppercase tracking-wide text-sky-700">Unidade Escolar selecionada</p><h2 className="mt-2 break-words text-2xl font-black text-slate-950">{activeUnit.name}</h2><p className="mt-2 text-sm text-slate-500">Unidade #{activeUnit.id} · Acesso autorizado</p><p className="mt-4 text-sm text-slate-600">Você está trabalhando nesta unidade. Para acessar outra, use o menu do seu perfil no canto superior direito.</p></section>}
    <div className="rounded-2xl border border-slate-200 bg-white p-6"><ShieldCheck className="mb-3 text-sky-700" aria-hidden="true" /><h2 className="font-bold">Seus módulos de acesso</h2>

      <nav className="mt-4 flex flex-wrap gap-3" aria-label="Módulos disponíveis">{user.role === "GESTOR_ESCOLAR" && (can(user, "classes.read") || can(user, "enrollments.read")) && <Link to="/gestao-escolar" className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white">Gestão de Turmas e Alunos</Link>}{links.filter(([permission]) => can(user, permission)).map(([, to, title]) => <Link key={to} to={to} className="rounded-xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">{title}</Link>)}{user.admin && <Link to="/admin/dashboard" className="rounded-xl bg-sky-50 px-4 py-3 text-sm font-bold text-sky-800">Administração</Link>}<Link to="/conta" className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold">Minha conta</Link></nav>
    </div>
  </PageShell>;
}
