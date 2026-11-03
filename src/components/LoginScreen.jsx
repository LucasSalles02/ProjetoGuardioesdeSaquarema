import { useState } from "react";
import { ArrowRight, Leaf, LockKeyhole, Mail, School, Waves } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen({ administrative = false }) {
  const { login, adminLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const identityField = administrative ? "username" : "email";
  const [form, setForm] = useState({ [identityField]: "", senha: "" });
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      const account = await (administrative ? adminLogin(form) : login(form));
      navigate(account.must_change_password ? "/primeiro-acesso" : account.admin ? "/admin/dashboard" : "/", { replace: true });
    } catch (error) {
      setErro(error.message || "Não foi possível entrar.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="grid min-h-screen bg-cyan-50 text-white lg:grid-cols-[1fr_480px]">
      <section className="relative flex min-h-[46vh] items-end overflow-hidden bg-[linear-gradient(135deg,#0284c7,#14b8a6_58%,#0f766e)] px-6 py-10 lg:min-h-screen lg:px-12">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,#fff_0_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="absolute bottom-0 left-0 h-28 w-full bg-white/20 [clip-path:polygon(0_62%,35%_25%,70%_48%,100%_20%,100%_100%,0_100%)]" />
        <div className="absolute bottom-0 left-0 h-20 w-full bg-emerald-300/25 [clip-path:polygon(0_35%,48%_12%,100%_44%,100%_100%,0_100%)]" />

        <div className="relative max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-3 rounded-3xl bg-white/95 px-4 py-3 text-sky-800 shadow-sm">
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white">
              <Waves size={24} aria-hidden="true" />
              <Leaf className="absolute right-1.5 top-1.5 text-emerald-100" size={15} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-base font-black uppercase tracking-wide">Guardiões</span>
              <span className="block text-xs font-black uppercase tracking-wide">de Saquarema</span>
            </span>
          </div>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            Educação ambiental para proteger praias, lagoas e vida marinha.
          </h1>
          <p className="mt-4 max-w-xl text-base font-semibold text-cyan-50 sm:text-lg">
            Complete missões, aprenda com trilhas curtas e acompanhe atitudes sustentáveis que podem sair da sala de aula para o território.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-2 text-sm font-bold text-white">
            <School size={17} aria-hidden="true" />
            Rede municipal, ciência cidadã e cuidado com o oceano
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center bg-white px-5 py-10 text-slate-950">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="text-sm font-bold uppercase tracking-wide text-sky-700">Acesso seguro</p>
            <h2 className="mt-2 text-3xl font-black">{administrative ? "Acesso administrativo" : "Entrar na conta"}</h2>
            <p className="mt-2 text-sm text-slate-600">{administrative ? "Use seu CPF ou usuário administrativo e senha." : "Use seu CPF ou email e senha."} No primeiro acesso após cadastro ou reset, a senha é o CPF com 11 dígitos. Solicitações externas precisam ser aprovadas antes.</p>
          </div>

          {location.state?.notice && <p role="status" className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">{location.state.notice}</p>}
          {erro ? (
            <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {erro}
            </div>
          ) : null}

          {!administrative && <Link to="/admin/login" className="mb-4 block text-sm font-bold text-sky-700">Acesso administrativo</Link>}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">{administrative ? "CPF ou usuário" : "CPF ou email"}</span>
              <span className="relative block">
                <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name={identityField}
                  type="text"
                  value={form[identityField]}
                  onChange={handleChange}
                  autoComplete="username"
                  className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-slate-950 outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
                  required
                />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-700">Senha</span>
              <span className="relative block">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  name="senha"
                  type="password"
                  value={form.senha}
                  onChange={handleChange}
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-slate-950 outline-none transition focus:border-sky-600 focus:ring-4 focus:ring-sky-100"
                  required
                />
              </span>
            </label>

            <button
              type="submit"
              disabled={carregando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 font-black text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregando ? "Entrando..." : "Entrar"}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {administrative ? "Acesso comum?" : "Ainda não tem conta?"}{" "}
            <Link className="font-bold text-sky-700 hover:text-sky-900" to={administrative ? "/login" : "/cadastro"}>
              {administrative ? "Entrar como usuário" : "Criar cadastro"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
