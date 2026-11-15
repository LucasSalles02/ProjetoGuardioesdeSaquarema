import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { can } from "../services/permissions";
import ProfilesPanel from "../components/admin/ProfilesPanel";
import PageShell from "../components/PageShell";
import UsersPanel from "../components/admin/UsersPanel";

export default function AdminUsers() {
  const { user } = useAuth();
  const { userId } = useParams();
  const [tab, setTab] = useState(can(user, "users.read") ? "users" : "profiles");
  const activeTab = userId ? "users" : tab;
  return <PageShell title="Gerenciar Usuários e Perfis" description="Cadastre usuários, consulte dados e gerencie permissões de acesso.">
    <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-sky-900"><ArrowLeft size={17} aria-hidden="true" /> Voltar à Administração</Link>
    <div className="mt-5 flex gap-2" role="group" aria-label="Gerenciamentos">{[["users", "Usuários", "users.read"], ["profiles", "Perfis de acesso", "profiles.read"]].filter(([, , permission]) => can(user, permission)).map(([key, title]) => <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={activeTab === key} className={`rounded-xl px-4 py-2.5 text-sm font-bold ${activeTab === key ? "bg-sky-600 text-white" : "border border-slate-200 bg-white text-sky-700"}`}>{title}</button>)}</div>
    {activeTab === "users" ? <UsersPanel /> : <ProfilesPanel />}
  </PageShell>;
}
