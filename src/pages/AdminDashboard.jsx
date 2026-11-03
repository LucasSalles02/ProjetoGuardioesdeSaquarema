import { Link } from "react-router-dom";
import PageShell from "../components/PageShell";
import UsersPanel from "../components/admin/UsersPanel";
import RegistrationRequests from "../components/admin/RegistrationRequests";
import { useState } from "react";

export default function AdminDashboard() {
  const [tab, setTab] = useState("users");
  return (
    <PageShell title="Painel administrativo" description="Usuários e conteúdo de Guardiões de Saquarema.">
      <Link className="inline-flex rounded-2xl border border-cyan-100 bg-white px-5 py-3 text-sm font-bold text-sky-700 shadow-sm hover:bg-sky-50" to="/gestao">Gerenciar missões, aulas e jogos →</Link>
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Seções da administração">{[["users", "Usuários"], ["requests", "Solicitações de cadastro"]].map(([key, label]) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)} className={`rounded-xl px-4 py-3 text-sm font-bold ${tab === key ? "bg-sky-600 text-white" : "border border-cyan-100 bg-white text-sky-700"}`}>{label}</button>)}</div>
      {tab === "users" ? <UsersPanel /> : <RegistrationRequests />}
    </PageShell>
  );
}
