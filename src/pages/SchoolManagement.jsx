import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { useSchool } from "../context/SchoolContext";
import { useAuth } from "../context/AuthContext";
import { can } from "../services/permissions";
import HomeWelcome from "../components/HomeWelcome";

export default function SchoolManagement() {
  const { activeUnit } = useSchool();
  const { user } = useAuth();
  return <PageShell title="Gestão Escolar" description={activeUnit?.name}>
    <HomeWelcome title="Educação que transforma Saquarema." description="Cada unidade é um novo espaço de aprendizagem e cuidado. Acesse a organização de turmas e alunos da unidade que está sendo visualizada." eyebrow={activeUnit?.name || "Gestão Escolar"} />
    {(can(user, "classes.read") || can(user, "enrollments.read")) && <Link to={can(user, "classes.read") ? "/gestao-escolar/turmas" : "/gestao-escolar/alunos"} className="home-module-card home-card group mt-6 flex aspect-square w-full max-w-xs flex-col items-center justify-center gap-5 rounded-3xl border border-cyan-100 bg-white p-6 text-center shadow-sm focus-visible:outline-sky-600"><span className="home-module-icon rounded-3xl border-2 border-white bg-cyan-50 p-5 text-ocean-700"><GraduationCap size={36} aria-hidden="true" /></span><span className="text-lg font-black">Gestão de Turmas e Alunos</span><span className="text-sm text-slate-500">{user.admin ? "Consulte as turmas, os alunos e os indicadores da unidade ativa." : "Cadastre turmas e organize os alunos da unidade ativa."}</span></Link>}
  </PageShell>;
}
