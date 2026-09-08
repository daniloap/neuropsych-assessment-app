"use client";
import { useEffect, useState } from "react";
import { Check, CheckCircle2, Download, Edit3, FileText, History, Plus, Printer, RefreshCw, Search } from "lucide-react";
import { ageAt, byCode, dateLabel, sourceKey } from "@/lib/domain";
import type { Report, ReportSnapshot, ReportVersion } from "@/lib/domain";
import { useApp } from "./context";
import { AppLink, Avatar, Badge, Button, Empty, Heading, Notice, PanelTitle, ProfilePlot, ResultTable } from "./ui";

const statusLabels = { rascunho: "Rascunho", revisao: "Em revisão", finalizado: "Concluído" };
export function ReportDirectory() {
  const { w, run, navigate, busy } = useApp(), [query, setQuery] = useState(""), [status, setStatus] = useState("todos"), [creating, setCreating] = useState(false), [assessmentId, setAssessmentId] = useState("");
  const candidates = w.assessments.filter(a => !w.reports.some(r => r.assessmentId === a.id) && w.results.some(r => r.assessmentId === a.id));
  const reports = w.reports.filter(r => (status === "todos" || r.status === status) && r.snapshot.patient.name.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  return <><Heading title="Relatórios" eyebrow="DOCUMENTOS" action={<Button onClick={() => setCreating(v => !v)}><Plus size={18} />Novo relatório</Button>}>Redija, revise e preserve cada versão do documento.</Heading>
    {creating && <section className="panel report-composer"><h2>Criar a partir de uma avaliação</h2>{candidates.length ? <form onSubmit={async e => { e.preventDefault(); const id = assessmentId || candidates[0].id; const result = await run("report.create", { assessmentId: id }, "Documento criado."); if (result) navigate("/relatorios/" + result.id); }}>
      <label>Avaliação<select value={assessmentId || candidates[0].id} onChange={e => setAssessmentId(e.target.value)}>{candidates.map(a => <option key={a.id} value={a.id}>{w.patients.find(p => p.id === a.patientId)!.name} · {a.title}</option>)}</select></label><Button disabled={busy}>Criar rascunho</Button><Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancelar</Button></form>
      : <p>Todas as avaliações com resultados já possuem um documento. <AppLink to="/avaliacoes">Abrir avaliações</AppLink></p>}</section>}
    <div className="report-metrics">{(["rascunho", "revisao", "finalizado"] as const).map((s, i) => <button key={s} className={status === s ? "selected" : ""} onClick={() => setStatus(status === s ? "todos" : s)}><span className={"report-stage-icon report-stage-" + i}>{i === 0 ? <Edit3 size={21} /> : i === 1 ? <FileText size={21} /> : <CheckCircle2 size={21} />}</span><span><strong>{w.reports.filter(r => r.status === s).length}</strong><small>{statusLabels[s]}</small></span></button>)}</div>
    <section className="panel"><div className="toolbar"><label className="field-search"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar documento por paciente" aria-label="Buscar documentos" /></label><select aria-label="Situação do documento" value={status} onChange={e => setStatus(e.target.value)}><option value="todos">Todas as situações</option>{Object.entries(statusLabels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></div>
      {reports.length ? reports.map(r => {
        const a = w.assessments.find(a => a.id === r.assessmentId)!, p = w.patients.find(p => p.id === a.patientId)!;
        const stale = r.snapshot.sourceKey !== sourceKey(p, a, w.results);
        return <AppLink key={r.id} className="report-list-row" to={"/relatorios/" + r.id}><span className="file-icon"><FileText size={25} /></span><div className="report-list-title"><strong>{p.name}</strong><span>{r.title}</span><small>{dateLabel(r.updatedAt, true)} · Versão {r.version}</small></div><div className="report-list-status"><Badge tone={r.status === "finalizado" ? "success" : r.status === "revisao" ? "blue" : "neutral"}>{statusLabels[r.status]}</Badge>{stale && <small className="overdue">Há novos dados no prontuário</small>}</div><span className="text-link">Abrir documento</span></AppLink>;
      }) : <Empty title="Nenhum documento neste recorte">Altere a busca ou crie um documento a partir de uma avaliação.</Empty>}</section></>;
}
export function ReportDetail({ id }: { id: string }) {
  const { w, run, busy, setUnsaved } = useApp();
  const r = w.reports.find(r => r.id === id);
  const [integration, setIntegration] = useState(r?.snapshot.integration ?? ""), [recommendations, setRecommendations] = useState(r?.snapshot.recommendations ?? ""), [title, setTitle] = useState(r?.title ?? "");
  const [mode, setMode] = useState("visualizar"), [versions, setVersions] = useState<ReportVersion[]>([]), [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false), [historyError, setHistoryError] = useState("");
  const dirty = !!r && (integration !== r.snapshot.integration || recommendations !== r.snapshot.recommendations || title !== r.title);
  useEffect(() => { setUnsaved(dirty); return () => setUnsaved(false); }, [dirty, setUnsaved]);
  useEffect(() => {
    if (!r) return;
    let live = true;
    fetch("/api/reports/" + id + "/versions", { cache: "no-store" }).then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error); if (live) { setVersions(data.versions); setHistoryError(""); } }).catch(e => { if (live) setHistoryError(e.message); });
    return () => { live = false; };
  }, [id, r?.version]);
  if (!r) return <Empty title="Documento não encontrado" />;
  const a = w.assessments.find(a => a.id === r.assessmentId)!, p = w.patients.find(p => p.id === a.patientId)!;
  const stale = r.snapshot.sourceKey !== sourceKey(p, a, w.results), historical = selectedVersion !== null && selectedVersion !== r.version;
  const selected = versions.find(v => v.version === selectedVersion);
  const currentSnapshot = { ...r.snapshot, title, integration, recommendations };
  const snapshot = historical && selected ? selected.snapshot : currentSnapshot;
  const status = historical && selected ? selected.status : r.status, version = historical && selected ? selected.version : r.version;
  async function save(action: string) {
    const saved = await run(action, { id, title, integration, recommendations, reviewConfirmed: confirmed }, action === "report.finalize" ? "Versão demonstrativa concluída." : "Nova versão preservada.");
    if (saved) { setUnsaved(false); setConfirmed(false); }
  }
  function selectHistory(v: ReportVersion) {
    if (dirty && !window.confirm("Há texto não salvo. Descartar alterações para consultar outra versão?")) return;
    setIntegration(r!.snapshot.integration); setRecommendations(r!.snapshot.recommendations); setTitle(r!.title); setUnsaved(false); setSelectedVersion(v.version); setMode("visualizar");
  }
  return <><div className="back-link"><AppLink to="/relatorios">Todos os documentos</AppLink><span>/</span>{p.name}</div>
    <Heading title={p.name} eyebrow="DOCUMENTO DEMONSTRATIVO" action={<><Button variant="secondary" disabled={dirty} onClick={() => window.print()}><Printer size={16} />Imprimir / PDF</Button><a className={"button secondary " + (dirty ? "disabled-link" : "")} aria-disabled={dirty} onClick={e => dirty && e.preventDefault()} href={"/api/reports/" + r.id + "/export?version=" + version}><Download size={16} />Baixar HTML</a></>}>{r.title} · versão {version} · {statusLabels[status]}</Heading>
    {historical && <Notice>Você está consultando uma versão anterior, preservada como foi salva. <button className="inline-link" onClick={() => setSelectedVersion(null)}>Abrir versão atual</button></Notice>}
    {!historical && stale && <Notice tone="warning">O prontuário ou os resultados mudaram desde esta versão. {r.status === "finalizado" ? "Abra uma nova versão para incorporar as mudanças." : "Salve o documento novamente para atualizar a cópia dos dados e refaça a revisão."}</Notice>}
    {!historical && dirty && <Notice>Há alterações de texto não salvas. Salve uma versão antes de exportar ou concluir.</Notice>}
    <div className="report-workspace"><section className="report-surface"><div className="report-surface-toolbar"><div className="segmented compact" role="group" aria-label="Modo do documento"><button aria-pressed={mode === "visualizar"} onClick={() => setMode("visualizar")}>Visualizar</button><button disabled={historical || r.status === "finalizado"} aria-pressed={mode === "editar"} onClick={() => setMode("editar")}>Editar texto</button></div><Badge tone={status === "finalizado" ? "success" : "blue"}>{statusLabels[status]}</Badge></div>
      {mode === "editar" && !historical ? <div className="report-editor"><label>Título do documento<input value={title} onChange={e => setTitle(e.target.value)} maxLength={180} /></label>
        <Notice>A identificação e os resultados vêm dos registros vinculados. A integração e as recomendações são redigidas e revisadas por você.</Notice>
        <label>Integração dos achados<textarea value={integration} onChange={e => { setIntegration(e.target.value); setConfirmed(false); }} rows={12} maxLength={15000} placeholder="Integre a questão clínica, a história, a funcionalidade, as observações e os resultados deste caso fictício." /><small>{integration.length.toLocaleString("pt-BR")} / 15.000 caracteres</small></label>
        <label>Recomendações e encaminhamentos<textarea value={recommendations} onChange={e => { setRecommendations(e.target.value); setConfirmed(false); }} rows={8} maxLength={10000} placeholder="Redija recomendações apenas para a demonstração." /></label>
        <Button disabled={busy} onClick={() => save("report.save")}>Salvar nova versão</Button>
      </div> : <ReportPaper snapshot={snapshot} version={version} status={status} unsaved={!historical && dirty} />}
    </section><aside className="stack report-sidebar"><section className="panel report-actions"><PanelTitle title="Revisão do documento" />
      {historical ? <p>Esta versão está preservada para consulta. A edição acontece na versão atual.</p> : r.status === "finalizado" ? <><Notice tone="success">Versão concluída no ambiente demonstrativo. Sem assinatura clínica.</Notice><Button variant="secondary" className="full" disabled={busy} onClick={async () => { const saved = await run("report.reopen", { id }, "Nova versão aberta. A anterior foi preservada."); if (saved) { setMode("editar"); setUnsaved(false); } }}><Edit3 size={16} />Abrir nova versão</Button></> : <>
        <p>Conferir os registros é parte do processo. A conclusão preserva uma cópia do documento e encerra a avaliação demonstrativa.</p>
        <Button className="full" variant="secondary" disabled={busy} onClick={() => save("report.save")}>Salvar nova versão</Button>
        <Button className="full" disabled={busy} onClick={() => save("report.review")}><FileText size={16} />Enviar à revisão</Button>
        {r.status === "revisao" && <><label className="checkbox-label review-confirm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />Conferi a versão salva e os dados deste exemplo.</label><Button className="full" disabled={!confirmed || dirty || stale || busy} onClick={() => save("report.finalize")}><Check size={16} />Concluir demonstração</Button></>}
      </>}<AppLink to={"/avaliacoes/" + a.id} className="text-link source-link">Consultar avaliação de origem</AppLink></section>
      <section className="panel version-panel"><PanelTitle title="Histórico de versões" detail="Cópias preservadas a cada salvamento" />{historyError ? <p className="panel-note">{historyError}</p> : versions.map(v => <button className={"version-row " + (version === v.version ? "selected" : "")} key={v.id} onClick={() => selectHistory(v)}><span className="version-icon"><History size={17} /></span><span><strong>Versão {v.version}</strong><small>{statusLabels[v.status]} · {dateLabel(v.createdAt)}</small></span>{version === v.version && <Check size={15} />}</button>)}</section>
      <Notice>O documento contém dados fictícios e não deve ser usado para decisão clínica ou encaminhamento assistencial.</Notice>
    </aside></div></>;
}
function ReportPaper({ snapshot: s, version, status, unsaved }: { snapshot: ReportSnapshot; version: number; status: Report["status"]; unsaved: boolean }) {
  return <article id="report-print" className="report-paper"><header className="paper-header"><div className="paper-brand">CogMetrics<span>AVALIAÇÃO NEUROPSICOLÓGICA</span></div><span>DOCUMENTO DEMONSTRATIVO<br />VERSÃO {version}{unsaved ? " · NÃO SALVO" : ""}</span></header>
    <h1>{s.title}</h1><p className="paper-subtitle">Organização dos achados e integração profissional</p><div className="paper-disclaimer">{s.disclaimer}</div>
    <section><h2><span>01</span>Identificação e demanda</h2><dl className="paper-identity"><div><dt>Paciente fictício</dt><dd>{s.patient.name}</dd></div><div><dt>Idade na avaliação</dt><dd>{ageAt(s.patient.birthDate, s.assessment.startDate)} anos</dd></div><div><dt>Escolaridade</dt><dd>{s.patient.education} anos de estudo</dd></div><div><dt>Início da avaliação</dt><dd>{dateLabel(s.assessment.startDate, true)}</dd></div></dl><p>{s.patient.referral}</p></section>
    <section><h2><span>02</span>História e funcionalidade</h2><p>{s.patient.history || "História não registrada."}</p><p>{s.patient.functioning || "Funcionalidade não registrada."}</p>{s.patient.notes && <p>{s.patient.notes}</p>}</section>
    <section><h2><span>03</span>Procedimentos registrados</h2><p>Protocolo demonstrativo: {s.assessment.title}. Os registros listados abaixo são fictícios e não documentam a aplicação real de instrumentos.</p><div className="paper-test-list">{s.assessment.plan.map(code => <span key={code}><b>{code}</b> · {byCode[code].name}</span>)}</div></section>
    <section><h2><span>04</span>Resultados por instrumento</h2><ProfilePlot results={s.results} /><ResultTable results={s.results} /><p className="paper-small">As regras de qualidade não substituem a análise das condições de aplicação. Protocolos excluídos ou inconsistentes não exibem percentil interpretável.</p></section>
    <section><h2><span>05</span>Integração dos achados</h2><p className={!s.integration ? "unwritten" : ""}>{s.integration || "Esta seção ainda precisa ser redigida."}</p></section>
    <section><h2><span>06</span>Recomendações</h2><p className={!s.recommendations ? "unwritten" : ""}>{s.recommendations || "Esta seção ainda precisa ser redigida."}</p></section>
    <section className="paper-provenance"><h2><span>07</span>Rastreabilidade</h2><p>Dados preservados em {dateLabel(s.createdAt, true)}. Regras: {s.rulesVersion}. Percentis atribuídos para demonstração ou calculados pela medida artificial CM-DEMO. Situação: {statusLabels[status]}. Sem assinatura profissional.</p></section>
    <footer>CogMetrics · Uso demonstrativo <span>Versão {version}</span></footer></article>;
}
