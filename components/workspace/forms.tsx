"use client";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Check, Search, X } from "lucide-react";
import { addDays, byCode, instruments, qualityOf, rawLabel, syntheticPercentile, todayBR } from "@/lib/domain";
import type { Assessment, Result } from "@/lib/domain";
import { useApp } from "./context";
import type { ModalSpec } from "./context";
import { AppLink, Avatar, Button, Empty, Notice } from "./ui";

function FormShell({ title, subtitle, children, onSubmit, submit = "Salvar", wide = false }: { title: string; subtitle: string; children: ReactNode; onSubmit: (e: FormEvent<HTMLFormElement>) => void; submit?: string; wide?: boolean }) {
  const { busy, close, error, refresh, setUnsaved } = useApp();
  return <form className={wide ? "modal-content wide" : "modal-content"} onSubmit={onSubmit} onChangeCapture={() => setUnsaved(true)}>
    <header className="modal-heading"><div><p className="eyebrow">COGMETRICS · DEMONSTRAÇÃO</p><h2 id="modal-title">{title}</h2><p>{subtitle}</p></div><button type="button" className="icon-button" onClick={close} disabled={busy} aria-label="Fechar formulário"><X size={20} /></button></header>
    <fieldset disabled={busy} className="form-body">{children}</fieldset>
    {error && <div className="form-error" role="alert"><p>{error}</p><Button type="button" variant="ghost" onClick={() => refresh().catch(() => {})}>Atualizar dados sem fechar o formulário</Button></div>}
    <footer className="modal-footer"><Button type="button" variant="secondary" onClick={close} disabled={busy}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? "Salvando…" : submit}</Button></footer>
  </form>;
}
export function WorkspaceModal({ spec }: { spec: ModalSpec }) {
  const ref = useRef<HTMLDialogElement>(null), { close, busy } = useApp();
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={"workspace-modal " + (spec.kind === "search" ? "search-modal" : "")} aria-labelledby="modal-title"
    onCancel={e => { e.preventDefault(); if (!busy) close(); }} onClick={e => { if (e.target === ref.current && !busy) close(); }}>
    {spec.kind === "patient" ? <PatientForm spec={spec} /> : spec.kind === "assessment" ? <AssessmentForm spec={spec} /> : spec.kind === "score" ? <ScoreForm spec={spec} /> : spec.kind === "appointment" ? <AppointmentForm spec={spec} /> : <SearchForm />}
  </dialog>;
}
function PatientForm({ spec }: { spec: Extract<ModalSpec, { kind: "patient" }> }) {
  const { run, close, navigate, setUnsaved } = useApp(), p = spec.patient;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const data = { id: p?.id, name: f.get("name"), birthDate: f.get("birthDate"), education: Number(f.get("education")),
      occupation: f.get("occupation"), referral: f.get("referral"), history: f.get("history"), functioning: f.get("functioning"), notes: f.get("notes") };
    const result = await run(p ? "patient.update" : "patient.create", data, p ? "Prontuário atualizado." : "Paciente fictício cadastrado.");
    if (result) { setUnsaved(false); close(); if (!p) navigate("/pacientes/" + result.id); }
  }
  return <FormShell title={p ? "Editar prontuário" : "Novo paciente"} subtitle="Preencha somente informações fictícias para explorar o sistema." onSubmit={submit} submit={p ? "Salvar prontuário" : "Criar prontuário"} wide>
    <div className="form-grid"><label className="span-two">Nome fictício<input autoFocus name="name" required minLength={3} maxLength={120} defaultValue={p?.name} placeholder="Nome do caso demonstrativo" autoComplete="off" /></label>
      <label>Data de nascimento<input type="date" name="birthDate" required defaultValue={p?.birthDate} max={todayBR()} /></label><label>Anos de estudo<input type="number" name="education" required min={0} max={40} step={1} defaultValue={p?.education} placeholder="Ex.: 16" /></label>
      <label className="span-two">Ocupação<input name="occupation" maxLength={160} defaultValue={p?.occupation} /></label></div>
    <label>Questão clínica e motivo do encaminhamento<textarea name="referral" required minLength={8} maxLength={3000} rows={3} defaultValue={p?.referral} placeholder="Descreva a demanda do caso fictício." /></label>
    <label>História e contexto<textarea name="history" maxLength={6000} rows={4} defaultValue={p?.history} placeholder="Histórico, queixas, condições de aplicação e informações relevantes." /></label>
    <label>Funcionalidade, autonomia e independência<textarea name="functioning" maxLength={6000} rows={4} defaultValue={p?.functioning} placeholder="Atividades básicas, atividades instrumentais e apoios necessários." /></label>
    <label>Observações<textarea name="notes" maxLength={6000} rows={2} defaultValue={p?.notes} /></label>
  </FormShell>;
}
function AssessmentForm({ spec }: { spec: Extract<ModalSpec, { kind: "assessment" }> }) {
  const { w, run, close, navigate, setUnsaved } = useApp(), a = spec.assessment;
  const patients = w.patients.filter(p => !p.archived);
  const [patientId, setPatientId] = useState(a?.patientId ?? spec.patientId ?? patients[0]?.id ?? ""), [plan, setPlan] = useState<string[]>(a?.plan ?? ["TDS", "TSD"]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const data = { id: a?.id, patientId, title: f.get("title"), startDate: f.get("startDate"), dueDate: f.get("dueDate"), priority: f.get("priority"), plan,
      anamnesisReviewed: f.get("anamnesisReviewed") === "on", notes: f.get("notes") ?? "" };
    const result = await run(a ? "assessment.update" : "assessment.create", data, a ? "Protocolo atualizado." : "Avaliação criada.");
    if (result) { setUnsaved(false); close(); if (!a) navigate("/avaliacoes/" + result.id); }
  }
  return <FormShell title={a ? "Editar protocolo" : "Nova avaliação"} subtitle="Escolha o paciente, a questão de investigação e os instrumentos." onSubmit={submit} submit={a ? "Salvar protocolo" : "Iniciar avaliação"} wide>
    <label>Paciente<select value={patientId} onChange={e => setPatientId(e.target.value)} required disabled={!!a}>{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>Título da avaliação<input name="title" required minLength={5} maxLength={160} defaultValue={a?.title ?? "Avaliação neuropsicológica"} /></label>
    <div className="form-grid"><label>Início<input type="date" name="startDate" required defaultValue={a?.startDate ?? todayBR()} max={todayBR()} readOnly={!!a} /></label><label>Prazo<input type="date" name="dueDate" required defaultValue={a?.dueDate ?? addDays(todayBR(), 14)} min={a?.startDate} /></label></div>
    <label>Prioridade<select name="priority" defaultValue={a?.priority ?? "normal"}><option value="normal">Normal</option><option value="alta">Alta</option></select></label>
    <div><h3 className="form-section-title">Instrumentos do protocolo</h3><div className="instrument-picker">{instruments.map(i => {
      const recorded = !!a && w.results.some(r => r.assessmentId === a.id && r.instrumentCode === i.code);
      return <label key={i.code} className={"instrument-option " + (plan.includes(i.code) ? "checked" : "")}><input type="checkbox" checked={plan.includes(i.code)} disabled={recorded}
        onChange={e => setPlan(e.target.checked ? [...plan, i.code] : plan.filter(c => c !== i.code))} /><span><strong>{i.code}{recorded ? " · registrado" : ""}</strong><small>{i.name}</small></span></label>;
    })}</div></div>
    {a && <><label className="checkbox-label review-confirm"><input type="checkbox" name="anamnesisReviewed" defaultChecked={!!a.anamnesisReviewed} />Revisei a história e a funcionalidade do prontuário.</label><label>Notas do planejamento<textarea rows={3} name="notes" maxLength={6000} defaultValue={a.notes} /></label></>}
    {!patients.length && <Notice tone="warning">Cadastre um paciente fictício antes de iniciar uma avaliação.</Notice>}
  </FormShell>;
}
function ScoreForm({ spec }: { spec: Extract<ModalSpec, { kind: "score" }> }) {
  const { w, setUnsaved } = useApp();
  const a = w.assessments.find(a => a.id === spec.assessment.id)!;
  const initial = spec.code ?? a.plan.find(code => !w.results.some(r => r.assessmentId === a.id && r.instrumentCode === code)) ?? a.plan[0];
  const [code, setCode] = useState(initial), [changed, setChanged] = useState(false);
  if (!code) return <Empty title="Selecione instrumentos no protocolo antes de registrar resultados." />;
  return <ScoreFields key={code} a={a} code={code} onDirty={() => setChanged(true)} selectCode={next => {
    if (changed && !window.confirm("Trocar de instrumento descartará os campos ainda não salvos. Continuar?")) return;
    setChanged(false); setUnsaved(false); setCode(next);
  }} />;
}
function ScoreFields({ a, code, selectCode, onDirty }: { a: Assessment; code: string; selectCode: (code: string) => void; onDirty: () => void }) {
  const { w, run, close, setUnsaved } = useApp(), p = w.patients.find(p => p.id === a.patientId)!;
  const existing = w.results.find(r => r.assessmentId === a.id && r.instrumentCode === code), instrument = byCode[code];
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(instrument.fields.map(f => [f.key, existing ? String(existing.raw[f.key]) : ""])));
  const [percentile, setPercentile] = useState(existing?.percentile === null || existing?.percentile === undefined ? "" : String(existing.percentile));
  const [excluded, setExcluded] = useState(!!existing?.excluded), [synthetic, setSynthetic] = useState(existing?.percentile !== null && existing?.percentile !== undefined);
  const raw = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === "" ? NaN : Number(v)]));
  const complete = instrument.fields.every(f => values[f.key] !== "" && Number.isInteger(raw[f.key]) && raw[f.key] >= f.min && raw[f.key] <= f.max);
  const candidate = { ...existing, id: existing?.id ?? "draft", assessmentId: a.id, instrumentCode: code, raw } as Result;
  const peers = [...w.results.filter(r => !(r.assessmentId === a.id && r.instrumentCode === code)), candidate];
  const quality = complete ? qualityOf(candidate, peers) : null;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const result = await run("result.save", { assessmentId: a.id, instrumentCode: code, raw, percentile: percentile.trim() === "" ? null : Number(percentile), excluded,
      exclusionReason: f.get("exclusionReason") ?? "", notes: f.get("notes") ?? "", syntheticConfirmed: synthetic }, "Resultado vinculado à avaliação e salvo.");
    if (result) { setUnsaved(false); close(); }
  }
  return <FormShell title="Registrar resultado" subtitle={p.name + " · " + a.title} onSubmit={submit} submit="Salvar resultado" wide>
    <label>Instrumento<select value={code} onChange={e => selectCode(e.target.value)}>{a.plan.map(c => <option key={c} value={c}>{c} · {byCode[c].name}</option>)}</select></label>
    <div className="score-fields">{instrument.fields.map((f, i) => <label key={f.key}>{f.label}<input autoFocus={i === 0} type="number" inputMode="numeric" required min={f.min} max={f.max} step={1} value={values[f.key]} onChange={e => { onDirty(); setValues({ ...values, [f.key]: e.target.value }); }} /><small>{f.min} a {f.max}</small></label>)}</div>
    <div className="score-preview"><div><span>Escore registrado</span><strong>{complete ? rawLabel(candidate) : "Preencha os campos"}</strong></div><div><span>Qualidade do protocolo</span><strong className={quality && !quality.valid ? "overdue" : ""}>{quality ? quality.valid ? "Consistente" : "Revisar" : "Aguardando registro"}</strong></div></div>
    {quality && !quality.valid && <Notice tone="warning">{quality.reasons.join(" ")} O escore bruto será preservado e o percentil ficará suprimido.</Notice>}
    {code === "CM-DEMO" ? <Notice><strong>Percentil sintético: {complete ? "P" + syntheticPercentile(raw.total) : "—"}</strong><br />Z = (bruto − 50) / 15. Parâmetros artificiais, sem norma clínica. O servidor refaz esse cálculo ao salvar.</Notice> : <div className="synthetic-input"><label>Percentil ilustrativo, opcional<input type="number" min={1} max={99} step={1} value={percentile} onChange={e => { onDirty(); setPercentile(e.target.value); }} placeholder="Sem conversão normativa" /></label><label className="checkbox-label"><input type="checkbox" checked={synthetic} required={percentile !== ""} onChange={e => setSynthetic(e.target.checked)} />Este percentil foi inventado apenas para visualizar a demonstração.</label></div>}
    <label>Observações de aplicação<textarea name="notes" rows={3} maxLength={6000} defaultValue={existing?.notes} placeholder="Observações do caso fictício; sem texto clínico predefinido." onChange={onDirty} /></label>
    <label className="checkbox-label"><input type="checkbox" checked={excluded} onChange={e => { onDirty(); setExcluded(e.target.checked); }} />Excluir este resultado da interpretação, preservando o escore bruto.</label>
    {excluded && <label>Justificativa da exclusão<textarea name="exclusionReason" rows={2} required minLength={10} maxLength={1500} defaultValue={existing?.exclusionReason} placeholder="Descreva por que este protocolo não será interpretado." onChange={onDirty} /></label>}
    <p className="small-note">{instrument.qualityRule}</p>
  </FormShell>;
}
function AppointmentForm({ spec }: { spec: Extract<ModalSpec, { kind: "appointment" }> }) {
  const { w, run, close, setUnsaved } = useApp(), s = spec.appointment;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const result = await run(s ? "appointment.update" : "appointment.create", { id: s?.id, assessmentId: f.get("assessmentId"),
      startsAt: f.get("date") + "T" + f.get("time") + ":00-03:00", duration: Number(f.get("duration")), kind: f.get("kind"), status: f.get("status"), notes: f.get("notes") },
      s ? "Atendimento atualizado." : "Atendimento agendado.");
    if (result) { setUnsaved(false); close(); }
  }
  return <FormShell title={s ? "Editar atendimento" : "Agendar atendimento"} subtitle="Horário de Brasília. Sobreposições são verificadas ao salvar." onSubmit={submit}>
    <label>Avaliação<select name="assessmentId" required defaultValue={s?.assessmentId ?? spec.assessmentId ?? w.assessments[0]?.id}>{w.assessments.map(a => <option key={a.id} value={a.id}>{w.patients.find(p => p.id === a.patientId)!.name} · {a.title}</option>)}</select></label>
    <div className="form-grid"><label>Data<input name="date" type="date" required defaultValue={s?.startsAt.slice(0, 10) ?? spec.day ?? todayBR()} /></label><label>Horário<input name="time" type="time" required step={60} defaultValue={s?.startsAt.slice(11, 16) ?? "09:00"} /></label></div>
    <div className="form-grid"><label>Duração em minutos<input name="duration" type="number" required min={15} max={240} step={1} defaultValue={s?.duration ?? 50} /></label><label>Tipo<select name="kind" defaultValue={s?.kind ?? "Aplicação"}>{["Entrevista", "Aplicação", "Integração", "Devolutiva"].map(v => <option key={v}>{v}</option>)}</select></label></div>
    <label>Situação<select name="status" defaultValue={s?.status ?? "agendado"}><option value="agendado">Agendado</option><option value="realizado">Realizado</option><option value="cancelado">Cancelado</option></select></label>
    <label>Notas<textarea rows={3} name="notes" maxLength={1500} defaultValue={s?.notes} /></label>
  </FormShell>;
}
function SearchForm() {
  const { w, close } = useApp(), [term, setTerm] = useState("");
  const matches = w.patients.filter(p => (p.name + " " + p.id + " " + p.occupation).toLocaleLowerCase("pt-BR").includes(term.toLocaleLowerCase("pt-BR"))).slice(0, 8);
  return <div className="search-dialog-body"><header><h2 id="modal-title">Buscar paciente</h2><button className="icon-button" onClick={close} aria-label="Fechar busca"><X size={20} /></button></header><label className="field-search"><Search size={20} /><input autoFocus value={term} onChange={e => setTerm(e.target.value)} placeholder="Nome, ocupação ou código…" aria-label="Nome, ocupação ou código" /></label>
    <div className="search-results">{matches.map(p => <AppLink key={p.id} to={"/pacientes/" + p.id} className="search-result"><Avatar patient={p} /><span><strong>{p.name}</strong><small>{p.occupation || "Prontuário demonstrativo"}</small></span></AppLink>)}
      {!matches.length && <Empty title="Nenhum paciente encontrado" />}</div><footer>Abra uma busca a qualquer momento com Ctrl + K ou ⌘ K.</footer></div>;
}
