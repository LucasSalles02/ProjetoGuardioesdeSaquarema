import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { School } from "lucide-react";
import { useSchool } from "../context/SchoolContext";
import PageShell from "../components/PageShell";
import { useAuth } from "../context/AuthContext";
import { can } from "../services/permissions";
import HomeWelcome from "../components/HomeWelcome";
import HomeHighlights from "../components/HomeHighlights";

export default function AccessHome() {
  const { user } = useAuth();
  const { activeUnit } = useSchool();
  const links = [["learning.read", "/aprender", "Aprender"], ["games.read", "/jogos", "Jogos"], ["missions.read", "/missoes", "Missões"], ["progress.read", "/progresso", "Meu progresso"], ["achievements.read", "/conquistas", "Conquistas"]];
  return <PageShell title={`Olá, ${user.nome}`} description={`Perfil de acesso: ${user.profile_name}`}>
    <div className="home-top-grid"><HomeWelcome title={user.role === "USER" ? "Sua próxima descoberta começa aqui." : "Juntos, cultivamos novas descobertas."} description={user.role === "USER" ? "Aprenda sobre a natureza, explore Saquarema e descubra novas formas de cuidar do nosso planeta nos seus módulos disponíveis." : "Cultura local, natureza e educação se encontram em Saquarema. Encontre abaixo os módulos autorizados para seu perfil e continue seu trabalho."} eyebrow={user.profile_name} playful={user.role === "USER"} /><HomeHighlights /></div>
    {user.role === "GESTOR_ESCOLAR" && activeUnit && <section className="home-card mb-5 mt-6 rounded-3xl border border-cyan-100 bg-white p-6"><span className="mb-2 inline-flex rounded-2xl border-2 border-white bg-cyan-50 p-3 text-ocean-700"><School size={28} aria-hidden="true" /></span><p className="mt-4 text-xs font-bold uppercase tracking-wide text-sky-700">Unidade Escolar selecionada</p><h2 className="mt-2 break-words text-2xl font-black text-slate-950">{activeUnit.name}</h2><p className="mt-2 text-sm text-slate-500">Unidade #{activeUnit.id} · Acesso autorizado</p><p className="mt-4 text-sm text-slate-600">Você está trabalhando nesta unidade. Para acessar outra, use o menu do seu perfil no canto superior direito.</p></section>}
    <div className="home-card mt-6 rounded-3xl border border-cyan-100 bg-white p-6"><ShieldCheck className="mb-3 text-sky-700" aria-hidden="true" /><h2 className="font-bold">Seus módulos de acesso</h2>

      <nav className="mt-4 flex flex-wrap gap-3" aria-label="Módulos disponíveis">{user.role === "GESTOR_ESCOLAR" && (can(user, "classes.read") || can(user, "enrollments.read")) && <Link to="/gestao-escolar" className="home-primary-button rounded-xl px-4 py-3 text-sm font-bold text-white">Gestão de Turmas e Alunos</Link>}{links.filter(([permission]) => can(user, permission)).map(([, to, title]) => <Link key={to} to={to} className="home-secondary-button rounded-xl border px-4 py-3 text-sm font-bold text-sky-800">{title}</Link>)}{user.admin && <Link to="/admin/dashboard" className="home-secondary-button rounded-xl border px-4 py-3 text-sm font-bold text-sky-800">Administração</Link>}<Link to="/conta" className="home-secondary-button rounded-xl border px-4 py-3 text-sm font-bold text-sky-800">Minha conta</Link></nav>
    </div>
  </PageShell>;
}
