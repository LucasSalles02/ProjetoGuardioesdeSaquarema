import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import PageShell from "../components/PageShell";
import AdminDialog from "../components/admin/AdminDialog";
import { HighlightCard, highlightTypes } from "../components/HomeHighlights";
import { admin } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { can } from "../services/permissions";

const empty = { title: "", description: "", target_kind: "", target_id: "", module_id: "", image: "", image_alt: "", color: "blue", active: false, sort_order: 0 };
const contentKey = item => JSON.stringify([item.kind, item.id, item.module_id]);

export default function AdminHighlights({ embedded = false }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [interval, setIntervalValue] = useState(8);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  async function load() {
    setLoading(true); setError("");
    try { const result = await admin.listarDestaques(); setItems(result.destaques); setTargets(result.conteudos); setIntervalValue(result.interval_seconds); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  async function save(data) {
    setBusy(true); setDialogError("");
    try { await admin.salvarDestaque(editing.id, data); setEditing(null); setNotice("Destaque salvo. A publicação será exibida nos perfis com acesso ao conteúdo."); await load(); }
    catch (err) { setDialogError(err.message); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setDialogError("");
    try { await admin.excluirDestaque(removing.id); setRemoving(null); setNotice("Destaque excluído. O conteúdo vinculado foi preservado."); await load(); }
    catch (err) { setDialogError(err.message); }
    finally { setBusy(false); }
  }
  const Container = embedded ? "section" : PageShell;
  return <Container title="Gerenciar destaques" description="Crie as novidades exibidas na tela inicial e vincule-as aos conteúdos da plataforma.">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-cyan-100 bg-cyan-50 p-5"><p className="max-w-2xl text-sm leading-relaxed text-sky-900">Cadastre cada destaque do zero. Escolha uma imagem ecológica relacionada ao conteúdo. Destaques em rascunho e conteúdos desativados não aparecem na tela inicial.</p>{can(user, "highlights.create") && <button type="button" disabled={loading || Boolean(error)} onClick={() => { setDialogError(""); setEditing({ ...empty }); }} className="home-primary-button inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Plus size={18} aria-hidden="true" />Criar destaque</button>}</div>
    <form onSubmit={async event => {
      event.preventDefault(); setSettingsBusy(true); setSettingsError(""); setNotice("");
      try { const result = await admin.salvarConfiguracaoDestaques({ interval_seconds: Number(interval) }); setIntervalValue(result.interval_seconds); setNotice("Intervalo atualizado para todos os destaques da tela inicial."); }
      catch (err) { setSettingsError(err.message); }
      finally { setSettingsBusy(false); }
    }} className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-cyan-100 bg-white p-4">
      <label className="text-sm font-bold text-sky-950">Tempo de exibição (segundos)<input type="number" min={2} max={300} step={1} required value={interval} disabled={loading || settingsBusy || !can(user, "highlights.update")} onChange={event => setIntervalValue(event.target.value)} className="mt-2 block w-32 rounded-xl border border-slate-300 px-3 py-2.5 text-sm disabled:opacity-50" /></label>
      {can(user, "highlights.update") && <button type="submit" disabled={loading || settingsBusy} className="home-primary-button rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{settingsBusy ? "Salvando…" : "Salvar intervalo"}</button>}
      <p className="w-full text-xs text-slate-600">Padrão: 8 segundos. Intervalo global de 2 a 300 segundos, aplicado igualmente a todos os destaques publicados.</p>
    </form>
    {settingsError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{settingsError}</p>}
    {notice && <p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{notice}</p>}
    {error && <div role="alert" className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">{error} <button type="button" onClick={load} className="rounded font-bold underline">Tentar novamente</button></div>}
    {loading ? <p role="status" className="mt-6 flex items-center gap-2 text-sm text-slate-600"><Loader2 className="motion-safe:animate-spin" size={20} aria-hidden="true" />Carregando destaques…</p> : !error && !items.length ? <div className="mt-6 rounded-3xl border-2 border-dashed border-cyan-200 bg-white p-8 text-center"><Megaphone className="mx-auto text-cyan-700" size={40} aria-hidden="true" /><h2 className="mt-3 text-lg font-black text-sky-950">Nenhum destaque cadastrado</h2><p className="mt-2 text-sm text-slate-600">Use “Criar destaque” para selecionar o primeiro conteúdo e configurar sua apresentação.</p></div> : !error && <div className="adaptive-card-grid mt-6 grid items-start gap-5">{items.map(item => <div key={item.id} className="min-w-0"><HighlightCard item={item} preview /><div className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded-lg px-2 py-1 text-xs font-bold ${item.active && item.available ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{!item.available ? "Conteúdo indisponível" : item.active ? "Publicado" : "Rascunho"}</span><span className="text-xs text-slate-500">Ordem {item.sort_order}</span></div><p className="mt-2 break-words text-xs text-slate-600">Vinculado: {item.target_title}</p><div className="mt-3 flex flex-wrap gap-2">{can(user, "highlights.update") && <button type="button" onClick={() => { setDialogError(""); setEditing(item); }} aria-label={`Editar destaque ${item.title}`} className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm font-bold text-sky-800"><Pencil size={16} aria-hidden="true" />Editar</button>}{can(user, "highlights.delete") && <button type="button" onClick={() => { setDialogError(""); setRemoving(item); }} aria-label={`Excluir destaque ${item.title}`} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-2.5 text-sm font-bold text-rose-800"><Trash2 size={16} aria-hidden="true" />Excluir</button>}</div></div>)}</div>}
    {editing && <HighlightForm key={editing.id || "new"} value={editing} targets={targets} busy={busy} error={dialogError} onClose={() => setEditing(null)} onSave={save} />}
    {removing && <AdminDialog title="Excluir destaque?" description="Esta ação remove apenas a divulgação da tela inicial." icon={Trash2} onClose={() => setRemoving(null)} busy={busy}><div className="p-5"><p className="break-words text-sm text-slate-700">Deseja excluir “{removing.title}”? O jogo, missão, trilha ou atividade continuará cadastrado.</p>{dialogError && <p role="alert" className="mt-3 text-sm text-rose-800">{dialogError}</p>}<div className="mt-5 flex justify-end gap-3"><button type="button" disabled={busy} onClick={() => setRemoving(null)} className="rounded-xl border px-4 py-3 text-sm font-bold">Cancelar</button><button type="button" disabled={busy} onClick={remove} className="rounded-xl bg-rose-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Excluindo…" : "Excluir destaque"}</button></div></div></AdminDialog>}
  </Container>;
}

function HighlightForm({ value, targets, busy, error, onClose, onSave }) {
  const [form, setForm] = useState({ ...empty, ...value });
  const [imageError, setImageError] = useState("");
  const [processing, setProcessing] = useState(false);
  const uploadVersion = useRef(0);
  useEffect(() => () => { uploadVersion.current += 1; }, []);
  const update = (field, next) => setForm(current => ({ ...current, [field]: next }));
  const currentKey = JSON.stringify([form.target_kind, form.target_id, form.module_id]);
  const selected = targets.find(item => contentKey(item) === currentKey);
  const inputClass = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-cyan-600 focus:outline-cyan-600 disabled:opacity-50";
  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const version = ++uploadVersion.current;
    setImageError(""); setProcessing(true);
    try {
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 8_000_000) throw new Error("Escolha uma imagem PNG, JPEG ou WebP de até 8 MB.");
      const image = await createImageBitmap(file);
      try {
        const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        const encoded = canvas.toDataURL("image/webp", 0.82);
        if (encoded.length > 930_000) throw new Error("A imagem ficou muito grande. Escolha uma imagem menor.");
        if (version === uploadVersion.current) update("image", encoded);
      } finally { image.close(); }
    } catch (err) { if (version === uploadVersion.current) setImageError(err.message || "Não foi possível processar a imagem."); }
    finally { if (version === uploadVersion.current) setProcessing(false); event.target.value = ""; }
  }
  return <AdminDialog title={value.id ? "Editar destaque" : "Criar destaque"} description="Personalize a divulgação e escolha um conteúdo já cadastrado." icon={Megaphone} onClose={onClose} busy={busy || processing}><form onSubmit={event => { event.preventDefault(); if (!processing) onSave(form); }} className="p-5"><fieldset disabled={busy || processing} className="space-y-4 disabled:opacity-70">
    <label className="block text-sm font-bold">Título<input required maxLength={100} value={form.title} onChange={event => update("title", event.target.value)} className={inputClass} /></label>
    <label className="block text-sm font-bold">Descrição<textarea maxLength={300} rows={3} value={form.description} onChange={event => update("description", event.target.value)} className={inputClass} /></label>
    <label className="block text-sm font-bold">Conteúdo vinculado<select required value={selected ? currentKey : ""} onChange={event => { const [kind, id, parent] = JSON.parse(event.target.value); setForm(current => ({ ...current, target_kind: kind, target_id: id, module_id: parent })); }} className={inputClass}><option value="" disabled>Selecione um conteúdo</option>{Object.entries(highlightTypes).map(([kind, meta]) => <optgroup key={kind} label={meta.plural}>{targets.filter(item => item.kind === kind).map(item => <option key={contentKey(item)} value={contentKey(item)}>{item.title}{!item.active ? " (desativado)" : ""}</option>)}</optgroup>)}</select></label>
    {value.id && !selected && <p className="text-sm text-amber-800">O conteúdo vinculado foi removido. Escolha outro para salvar.</p>}
    {selected && !selected.active && <p className="text-sm text-amber-800">Este conteúdo está desativado. Mantenha o destaque como rascunho até ativá-lo.</p>}
    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4"><p className="text-sm font-bold">Imagem ecológica</p><p className="mt-1 text-xs leading-relaxed text-slate-600">Use natureza, reciclagem ou vida marinha relacionada ao conteúdo. Envie uma imagem ou informe sua URL HTTPS. Não inclua dados pessoais de alunos.</p><label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-2.5 text-sm font-bold text-cyan-800"><ImagePlus size={18} aria-hidden="true" />Enviar imagem<input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} className="block w-full max-w-44 text-xs" /></label><p className="mt-1 text-xs text-slate-500">Até 8 MB. A imagem será reduzida e otimizada antes de salvar.</p><label className="mt-3 block text-sm font-bold">URL da imagem (opcional)<input type="url" maxLength={2048} placeholder="https://…" value={form.image.startsWith("data:") ? "" : form.image} onChange={event => update("image", event.target.value)} className={inputClass} /></label>{form.image && <button type="button" onClick={() => { update("image", ""); update("image_alt", ""); }} className="mt-2 rounded text-xs font-bold text-rose-800 underline">Remover imagem</button>}<label className="mt-3 block text-sm font-bold">Descrição da imagem<input required={Boolean(form.image)} maxLength={160} value={form.image_alt} onChange={event => update("image_alt", event.target.value)} className={inputClass} placeholder="Descreva o que aparece na imagem" /></label></div>
    <div className="grid grid-cols-2 gap-4"><label className="block text-sm font-bold">Cor de destaque<select value={form.color} onChange={event => update("color", event.target.value)} className={inputClass}><option value="blue">Azul</option><option value="green">Verde</option><option value="yellow">Amarelo</option><option value="red">Vermelho</option></select></label><label className="block text-sm font-bold">Ordem de exibição<input type="number" required min={0} max={9999} step={1} value={form.sort_order} onChange={event => update("sort_order", event.target.value === "" ? "" : Number(event.target.value))} className={inputClass} /></label></div>
    <p className="text-xs text-slate-500">Menores números aparecem primeiro.</p><label className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-900"><input type="checkbox" checked={form.active} onChange={event => update("active", event.target.checked)} className="h-5 w-5 accent-emerald-700" />Publicado na tela inicial</label>
    <div><p className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">Prévia</p><HighlightCard item={form} preview /></div>
  </fieldset>{processing && <p role="status" className="mt-3 text-sm text-cyan-800">Otimizando imagem…</p>}{(error || imageError) && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{error || imageError}</p>}<div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" disabled={busy || processing} onClick={onClose} className="rounded-xl border px-4 py-3 text-sm font-bold">Cancelar</button><button type="submit" disabled={busy || processing} className="home-primary-button rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Salvando…" : "Salvar destaque"}</button></div></form></AdminDialog>;
}
