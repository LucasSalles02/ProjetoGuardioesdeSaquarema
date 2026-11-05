import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import { useSchool } from "../context/SchoolContext";
import { useAuth } from "../context/AuthContext";
import { can } from "../services/permissions";

export default function SchoolManagement() {
  const { activeUnit } = useSchool();
  const { user } = useAuth();
  return <PageShell title="Gestão Escolar" description={activeUnit?.name}>
    {(can(user, "classes.read") || can(user, "enrollments.read")) && <Link to="/gestao-escolar/turmas" className="group flex aspect-square w-full max-w-xs flex-col items-center justify-center gap-5 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-md focus-visible:outline-sky-600 motion-reduce:transform-none"><span className="rounded-2xl bg-sky-50 p-5 text-sky-700"><GraduationCap size={36} aria-hidden="true" /></span><span className="text-lg font-black">Gestão de Turmas e Alunos</span><span className="text-sm text-slate-500">{user.admin ? "Consulte as turmas, os alunos e os indicadores da unidade ativa." : "Cadastre turmas e organize os alunos da unidade ativa."}</span></Link>}
  </PageShell>;
}
