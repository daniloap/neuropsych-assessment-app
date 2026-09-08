"use client";
import { useState } from "react";
import { AlertCircle, Archive, BookOpen, CalendarDays, Check, CheckCircle2, ClipboardList, Clock3, Edit3, FileText, History, ListChecks, Plus, Search, SlidersHorizontal, Users } from "lucide-react";
import { addDays, ageAt, byCode, dateLabel, instruments, progress, qualityOf, readiness, sourceKey, stageLabels, stages, todayBR } from "@/lib/domain";
import type { Assessment, Stage } from "@/lib/domain";
import { useApp } from "./context";
import { AppLink, AssessmentTable, Avatar, Badge, Button, DocumentLink, Empty, Heading, LearningCurve, Notice, PanelTitle, ProfilePlot, Progress, ResultTable, StageBadge } from "./ui";

function timeLabel(s: string) { return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }).format(new Date(s)); }
export function Dashboard() {
  const { w, open, navigate } = useApp(), today = todayBR();
  const active = w.assessments.filter(a => a.stage !== "concluida").sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const quality = w.results.filter(r => !r.excluded && !qualityOf(r, w.results).valid);
  const review = w.reports.filter(r => r.status === "revisao");
  const sessions = w.appointments.filter(s => s.startsAt.slice(0, 10) === today && s.status !== "cancelado");
  const featured = active[0], patient = featured && w.patients.find(p => p.id === featured.patientId)!;
  const metrics = [
    { label: "Pacientes ativos", value: w.patients.filter(p => !p.archived).length, detail: "Prontuários disponíveis", icon: Users, to: "/pacientes" },
    { label: "Avaliações em curso", value: active.length, detail: "Da entrevista à revisão", icon: ClipboardList, to: "/avaliacoes" },
    { label: "Documentos em revisão", value: review.length, detail: "Aguardando conferência", icon: FileText, to: "/relatorios" },
    { label: "Resultados a revisar", value: quality.length, detail: "Regras de qualidade do protocolo", icon: ListChecks, to: "/avaliacoes?filtro=qualidade" },
  ];
  return <><Heading title="Visão geral" eyebrow={new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "full" }).format(new Date())}
    action={<Button onClick={() => open({ kind: "assessment" })}><Plus size={18} />Nova avaliação</Button>}>Seu trabalho clínico, organizado em um só lugar.</Heading>
    <section className="metrics-grid" aria-label="Indicadores dos registros atuais">{metrics.map((m, i) => <AppLink to={m.to} className={"metric-card metric-" + i} key={m.label}>
      <div className="metric-top"><span>{m.label}</span><m.icon size={19} strokeWidth={1.7} /></div><strong>{m.value.toString().padStart(2, "0")}</strong><small>{m.detail}</small>
    </AppLink>)}</section>
    <div className="dashboard-grid"><section className="focus-card">
      {featured && patient ? <><div className="focus-top"><span className="eyebrow">CONTINUAR AVALIAÇÃO</span><Badge tone="inverse">{featured.dueDate < today ? "Prazo a revisar" : "Em andamento"}</Badge></div>
        <div className="focus-person"><Avatar patient={patient} large /><div><h2>{patient.name}</h2><p>{ageAt(patient.birthDate, featured.startDate)} anos · {patient.education} anos de estudo</p></div></div>
        <p className="focus-title">{featured.title}</p><Progress value={progress(featured, w.results)} label="Instrumentos registrados" />
        <div className="focus-flow">{stages.slice(0, 4).map((s, i) => <span className={stages.indexOf(featured.stage) >= i ? "reached" : ""} key={s}><i>{stages.indexOf(featured.stage) > i ? <Check size={12} /> : i + 1}</i>{stageLabels[s]}</span>)}</div>
        <div className="focus-bottom"><span><CalendarDays size={15} />Prazo: {dateLabel(featured.dueDate)}</span><Button onClick={() => navigate("/avaliacoes/" + featured.id)}>Retomar avaliação</Button></div></>
        : <Empty title="Tudo em dia" action={<Button onClick={() => open({ kind: "assessment" })}>Iniciar avaliação</Button>}>Suas avaliações em andamento aparecerão aqui.</Empty>}
    </section><section className="panel agenda-today"><PanelTitle title="Sua agenda de hoje" detail={sessions.length + " atendimento" + (sessions.length !== 1 ? "s" : "")} action={<AppLink className="text-link" to="/agenda">Ver agenda</AppLink>} />
      {sessions.length ? <div className="session-list">{sessions.map(s => { const a = w.assessments.find(a => a.id === s.assessmentId)!, p = w.patients.find(p => p.id === a.patientId)!; return <button className="session-row" onClick={() => open({ kind: "appointment", appointment: s })} key={s.id}><time>{timeLabel(s.startsAt)}</time><i className={s.kind === "Devolutiva" ? "violet" : ""} /><span><strong>{p.name}</strong><small>{s.kind} · {s.duration} min</small></span>{s.status === "realizado" && <CheckCircle2 size={18} />}</button>; })}</div> : <Empty title="Dia livre">Nenhum atendimento agendado para hoje.</Empty>}
      <Button variant="ghost" className="add-session" onClick={() => open({ kind: "appointment", day: today })}><Plus size={16} />Agendar atendimento</Button></section></div>
    <div className="dashboard-lower"><section className="panel"><PanelTitle title="Avaliações em andamento" detail="Próximos prazos e progresso dos protocolos" action={<AppLink to="/avaliacoes" className="text-link">Ver todas</AppLink>} /><AssessmentTable assessments={active.slice(0, 5)} /></section>
      <section className="panel attention-panel"><PanelTitle title="Pontos de atenção" detail="Pendências que merecem uma nova leitura" />
        {quality.length > 0 && <AppLink className="attention-item" to="/avaliacoes?filtro=qualidade"><span className="attention-icon amber"><AlertCircle size={20} /></span><div><strong>{quality.length} resultados inconsistentes</strong><p>Confira omissões, erros e a compatibilidade do par TDS/TSD.</p><small>Revisar protocolos</small></div></AppLink>}
        {review.map(r => <AppLink className="attention-item" to={"/relatorios/" + r.id} key={r.id}><span className="attention-icon blue"><FileText size={20} /></span><div><strong>{r.snapshot.patient.name}</strong><p>O documento está em revisão.</p><small>Abrir versão {r.version}</small></div></AppLink>)}
        {!quality.length && !review.length && <Empty title="Sem pendências de qualidade" />}
        <div className="quiet-note"><BookOpen size={18} /><span>Os percentis são ilustrativos. As normas clínicas ainda não estão integradas.</span></div>
      </section></div></>;
}
export function PatientDirectory() {
  const { w, open, route } = useApp();
  const [query, setQuery] = useState(new URLSearchParams(route.split("?")[1]).get("q") || "");
  const [status, setStatus] = useState("ativos"), [sort, setSort] = useState("nome");
  const term = query.trim().toLocaleLowerCase("pt-BR");
  const patients = w.patients.filter(p => (!term || [p.name, p.id, p.occupation].some(t => t.toLocaleLowerCase("pt-BR").includes(term)))
    && (status === "todos" || (status === "arquivados" ? p.archived : !p.archived))).sort((a, b) => sort === "nome" ? a.name.localeCompare(b.name, "pt-BR") : b.updatedAt.localeCompare(a.updatedAt));
  return <><Heading title="Pacientes" eyebrow="PRONTUÁRIOS" action={<Button onClick={() => open({ kind: "patient" })}><Plus size={18} />Novo paciente</Button>}>História, avaliações e documentos conectados ao mesmo registro.</Heading>
    <section className="panel"><div className="toolbar"><label className="field-search"><Search size={18} /><input placeholder="Buscar por nome, código ou ocupação" aria-label="Buscar pacientes" value={query} onChange={e => setQuery(e.target.value)} /></label>
      <label className="inline-select"><span>Situação</span><select value={status} onChange={e => setStatus(e.target.value)}><option value="ativos">Ativos</option><option value="arquivados">Arquivados</option><option value="todos">Todos</option></select></label>
      <label className="inline-select"><span>Ordem</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="nome">Nome</option><option value="recentes">Atualização recente</option></select></label></div>
      <div className="list-count">{patients.length} prontuários encontrados</div>
      {!patients.length ? <Empty title="Nenhum paciente encontrado">Tente outro nome ou altere a situação do prontuário.</Empty> : <div className="table-scroll"><table className="data-table patient-directory"><thead><tr><th>Paciente</th><th>Escolaridade</th><th>Avaliações</th><th>Atualizado em</th><th>Situação</th></tr></thead><tbody>{patients.map(p => {
        const aa = w.assessments.filter(a => a.patientId === p.id);
        return <tr key={p.id}><td><AppLink to={"/pacientes/" + p.id} className="person-cell"><Avatar patient={p} /><span><strong>{p.name}</strong><small>{ageAt(p.birthDate, todayBR())} anos · {p.occupation || "Ocupação não informada"}</small></span></AppLink></td>
          <td>{p.education} anos de estudo</td><td><strong>{aa.length}</strong><small>{aa.filter(a => a.stage !== "concluida").length} em andamento</small></td><td>{dateLabel(p.updatedAt, true)}</td><td><Badge tone={p.archived ? "neutral" : "success"}>{p.archived ? "Arquivado" : "Ativo"}</Badge></td></tr>;
      })}</tbody></table></div>}</section></>;
}
export function PatientDetail({ id }: { id: string }) {
  const { w, open, run, busy } = useApp(), p = w.patients.find(p => p.id === id);
  const [tab, setTab] = useState("clinica"), [selectedId, setSelectedId] = useState("");
  if (!p) return <Empty title="Prontuário não encontrado" />;
  const aa = w.assessments.filter(a => a.patientId === p.id).sort((a, b) => b.startDate.localeCompare(a.startDate));
  const selected = aa.find(a => a.id === selectedId) ?? aa[0];
  const rr = w.results.filter(r => r.assessmentId === selected?.id), docs = w.reports.filter(r => aa.some(a => a.id === r.assessmentId));
  const events = w.audit.filter(e => e.entityId === p.id || aa.some(a => a.id === e.entityId) || rr.some(r => r.id === e.entityId) || docs.some(r => r.id === e.entityId));
  return <><div className="back-link"><AppLink to="/pacientes">Todos os pacientes</AppLink><span>/</span>Prontuário</div>
    <div className="patient-header"><Avatar patient={p} large /><div><h1>{p.name}</h1><p>{ageAt(p.birthDate, todayBR())} anos · {p.education} anos de estudo · {p.occupation || "Ocupação não informada"}</p><span className="record-id">Registro {p.id.slice(-8).toUpperCase()} · dados fictícios</span></div><div className="patient-header-actions"><Button variant="secondary" onClick={() => open({ kind: "patient", patient: p })}><Edit3 size={16} />Editar prontuário</Button><Button disabled={!!p.archived} onClick={() => open({ kind: "assessment", patientId: p.id })}><Plus size={17} />Nova avaliação</Button></div></div>
    <div className="segmented" role="group" aria-label="Seções do prontuário">{[["clinica", "Visão clínica"], ["resultados", "Resultados"], ["documentos", "Documentos"], ["historico", "Histórico"]].map(([key, label]) => <button key={key} aria-pressed={tab === key} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === "clinica" && <div className="detail-grid"><div className="stack"><section className="panel prose-panel"><PanelTitle title="Questão clínica" detail="Motivo do encaminhamento" /><p>{p.referral}</p></section>
      <section className="panel prose-panel"><PanelTitle title="História e contexto" detail="Informações da entrevista" /><p>{p.history || "História ainda não registrada."}</p><h3>Funcionalidade, autonomia e independência</h3><p>{p.functioning || "Funcionalidade ainda não registrada."}</p>{p.notes && <><h3>Observações</h3><p>{p.notes}</p></>}</section>
      {selected && <section className="panel"><PanelTitle title="Perfil da avaliação" detail={selected.title} action={<AppLink to={"/avaliacoes/" + selected.id} className="text-link">Abrir avaliação</AppLink>} /><ProfilePlot results={rr} /></section>}
    </div><aside className="stack"><section className="panel"><PanelTitle title="Avaliações" detail={aa.length + " registros vinculados"} />{aa.length ? aa.map(a => <AppLink to={"/avaliacoes/" + a.id} className="assessment-list-item" key={a.id}><StageBadge stage={a.stage} /><strong>{a.title}</strong><small>{dateLabel(a.startDate, true)}</small><Progress value={progress(a, w.results)} /></AppLink>) : <Empty title="Nenhuma avaliação" />}</section>
      <section className="panel"><PanelTitle title="Documentos" />{docs.length ? docs.map(r => <DocumentLink key={r.id} id={r.id} title={r.title} status={r.status} version={r.version} />) : <p className="panel-note">Os documentos aparecerão após a criação de uma avaliação e o registro dos resultados.</p>}</section>
      <Button variant="ghost" disabled={busy} onClick={() => run("patient.archive", { id: p.id }, p.archived ? "Prontuário restaurado." : "Prontuário arquivado.")}><Archive size={16} />{p.archived ? "Restaurar prontuário" : "Arquivar prontuário"}</Button></aside></div>}
    {tab === "resultados" && <section className="panel"><PanelTitle title="Resultados por avaliação" action={aa.length > 0 && <label className="inline-select"><span>Avaliação</span><select value={selected?.id} onChange={e => setSelectedId(e.target.value)}>{aa.map(a => <option value={a.id} key={a.id}>{a.title} · {dateLabel(a.startDate)}</option>)}</select></label>} /><ProfilePlot results={rr} /><ResultTable results={rr} editableAssessment={selected} /></section>}
    {tab === "documentos" && <section className="panel"><PanelTitle title="Documentos preservados" detail="Cada versão conserva os dados usados na sua elaboração" />{docs.length ? docs.map(r => <DocumentLink key={r.id} id={r.id} title={r.title} status={r.status} version={r.version} />) : <Empty title="Nenhum documento criado" />}</section>}
    {tab === "historico" && <section className="panel"><PanelTitle title="Histórico de alterações" detail="Eventos disponíveis nos 100 registros mais recentes do ambiente" />{events.length ? events.map(e => <div className="timeline-item" key={e.id}><span><History size={16} /></span><div><strong>{e.summary}</strong><small>{dateLabel(e.createdAt, true)} · {timeLabel(e.createdAt)}</small></div></div>) : <Empty title="Nenhuma alteração individual registrada">Os dados iniciais foram criados em conjunto como demonstração.</Empty>}</section>}
  </>;
}
export function AssessmentBoard() {
  const { w, open, route } = useApp(), [view, setView] = useState("quadro"), [query, setQuery] = useState("");
  const qualityOnly = new URLSearchParams(route.split("?")[1]).get("filtro") === "qualidade";
  const assessments = w.assessments.filter(a => {
    const p = w.patients.find(p => p.id === a.patientId)!;
    return (p.name + " " + a.title).toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")) &&
      (!qualityOnly || w.results.some(r => r.assessmentId === a.id && !r.excluded && !qualityOf(r, w.results).valid));
  });
  return <><Heading title="Avaliações" eyebrow="FLUXO CLÍNICO" action={<Button onClick={() => open({ kind: "assessment" })}><Plus size={18} />Nova avaliação</Button>}>Acompanhe cada caso, da entrevista à versão revisada do documento.</Heading>
    {qualityOnly && <Notice tone="warning">Exibindo apenas avaliações com resultados a revisar. <AppLink to="/avaliacoes">Mostrar todas</AppLink></Notice>}
    <div className="board-toolbar"><label className="field-search"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar paciente ou avaliação" aria-label="Buscar avaliações" /></label><div className="segmented compact" role="group" aria-label="Visualização"><button aria-pressed={view === "quadro"} onClick={() => setView("quadro")}>Quadro</button><button aria-pressed={view === "lista"} onClick={() => setView("lista")}>Lista</button></div></div>
    {view === "lista" ? <section className="panel"><AssessmentTable assessments={assessments} /></section> : <div className="kanban">{stages.map(stage => {
      const list = assessments.filter(a => a.stage === stage);
      return <section className={"kanban-column column-" + stage} key={stage}><header><h2>{stageLabels[stage]}</h2><span>{list.length}</span></header>{list.map(a => {
        const p = w.patients.find(p => p.id === a.patientId)!;
        const invalid = w.results.some(r => r.assessmentId === a.id && !r.excluded && !qualityOf(r, w.results).valid);
        return <AppLink className="case-card" to={"/avaliacoes/" + a.id} key={a.id}><div className="case-card-top"><Avatar patient={p} />{a.priority === "alta" ? <Badge tone="warning">Prioridade</Badge> : <span className="case-code">{a.id.slice(-5).toUpperCase()}</span>}</div><h3>{p.name}</h3><p>{a.title}</p><Progress value={progress(a, w.results)} label="Protocolo" />{invalid && <div className="case-alert"><AlertCircle size={14} />Revisar consistência</div>}<footer><CalendarDays size={14} /><span>Até {dateLabel(a.dueDate)}</span></footer></AppLink>;
      })}{!list.length && <div className="kanban-empty">Nenhum caso nesta etapa</div>}</section>;
    })}</div>}</>;
}
export function AssessmentDetail({ id }: { id: string }) {
  const { w, open, run, busy, navigate } = useApp(), a = w.assessments.find(a => a.id === id);
  if (!a) return <Empty title="Avaliação não encontrada" />;
  const p = w.patients.find(p => p.id === a.patientId)!, rr = w.results.filter(r => r.assessmentId === a.id), report = w.reports.find(r => r.assessmentId === a.id);
  const issues = readiness(a, w.results), stageIndex = stages.indexOf(a.stage), ravlt = rr.find(r => r.instrumentCode === "RAVLT");
  const nextStage = stages[stageIndex + 1];
  return <><div className="back-link"><AppLink to="/avaliacoes">Todas as avaliações</AppLink><span>/</span>{p.name}</div><Heading title={a.title} eyebrow="AVALIAÇÃO" action={<Button variant="secondary" disabled={a.stage === "concluida"} onClick={() => open({ kind: "assessment", assessment: a })}><SlidersHorizontal size={16} />Editar protocolo</Button>}>
    <AppLink to={"/pacientes/" + p.id}>{p.name}</AppLink> · {ageAt(p.birthDate, a.startDate)} anos na avaliação · início em {dateLabel(a.startDate, true)}</Heading>
    <div className="stage-strip">{stages.map((stage, i) => <div className={i === stageIndex ? "current" : i < stageIndex ? "completed" : ""} key={stage}><span>{i < stageIndex ? <Check size={15} /> : i + 1}</span><strong>{stageLabels[stage]}</strong></div>)}</div>
    <div className="detail-grid"><div className="stack"><section className="panel protocol-panel"><PanelTitle title="Protocolo de avaliação" detail={rr.length + " de " + a.plan.length + " instrumentos registrados"} action={a.stage !== "concluida" && <Button onClick={() => open({ kind: "score", assessment: a })} disabled={!a.plan.length}><Plus size={16} />Registrar resultado</Button>} />
      <div className="protocol-list">{a.plan.map(code => { const r = rr.find(r => r.instrumentCode === code), q = r && qualityOf(r, rr); return <div className="protocol-item" key={code}><span className={"protocol-check " + (r ? q?.valid || r.excluded ? "done" : "issue" : "")}>{r ? q?.valid || r.excluded ? <Check size={16} /> : <AlertCircle size={16} /> : <ClipboardList size={16} />}</span><div><strong>{code}</strong><p>{byCode[code].name}</p></div><Badge tone={r ? r.excluded ? "neutral" : q?.valid ? "success" : "warning" : "neutral"}>{r ? r.excluded ? "Excluído" : q?.valid ? "Registrado" : "Revisar" : "Pendente"}</Badge><Button variant="ghost" disabled={a.stage === "concluida"} onClick={() => open({ kind: "score", assessment: a, code })}>{r ? "Editar" : "Registrar"}</Button></div>; })}</div>
      {!a.plan.length && <Empty title="Selecione o protocolo" action={<Button onClick={() => open({ kind: "assessment", assessment: a })}>Escolher instrumentos</Button>} />}</section>
      <section className="panel"><PanelTitle title="Resultados registrados" detail="Escores brutos, percentis ilustrativos e controle de qualidade" /><ResultTable results={rr} editableAssessment={a} /></section>
      <section className="panel"><PanelTitle title="Perfil por instrumento" /><ProfilePlot results={rr} /></section>
    </div><aside className="stack"><section className="panel next-step"><PanelTitle title="Próxima etapa" /><StageBadge stage={a.stage} /><Progress value={progress(a, w.results)} label="Instrumentos registrados" />
      {a.stage !== "concluida" && <><h3>Para concluir a avaliação</h3>{issues.length ? <ul className="requirements">{issues.map(issue => <li key={issue}><span /><span>{issue}</span></li>)}</ul> : <p className="success-line"><CheckCircle2 size={17} />Protocolo pronto para integração.</p>}
        {nextStage && nextStage !== "concluida" && <Button className="full" disabled={busy} onClick={() => run("assessment.stage", { id: a.id, stage: nextStage }, "Etapa atualizada.")}>Avançar para {stageLabels[nextStage].toLocaleLowerCase("pt-BR")}</Button>}
        {stageIndex > 0 && <Button variant="ghost" className="full" disabled={busy} onClick={() => run("assessment.stage", { id: a.id, stage: stages[stageIndex - 1] }, "Etapa atualizada.")}>Retornar uma etapa</Button>}</>}
      {report ? <DocumentLink id={report.id} title="Abrir documento" status={report.status} version={report.version} /> : <Button variant="secondary" className="full" disabled={busy || !rr.length} onClick={async () => { const r = await run("report.create", { assessmentId: a.id }, "Rascunho criado."); if (r) navigate("/relatorios/" + r.id); }}><FileText size={16} />Criar relatório</Button>}
      <div className="detail-facts"><span>Prazo<strong>{dateLabel(a.dueDate, true)}</strong></span><span>Prioridade<strong>{a.priority === "alta" ? "Alta" : "Normal"}</strong></span><span>Entrevista<strong>{a.anamnesisReviewed ? "Revisada" : "Pendente"}</strong></span></div></section>
      {ravlt && <section className="panel"><PanelTitle title="Curva de aprendizagem" detail="Teste de Aprendizagem Auditivo-Verbal de Rey" /><LearningCurve result={ravlt} /></section>}
      <Notice>Os resultados são sintéticos. A consistência de um protocolo não comprova validade clínica nem autoriza conclusões diagnósticas.</Notice>
    </aside></div></>;
}
export function InstrumentCatalog() {
  const { w } = useApp(), [query, setQuery] = useState(""), [family, setFamily] = useState("Todos"), [selected, setSelected] = useState("TDS");
  const current = byCode[selected];
  const filtered = instruments.filter(i => (family === "Todos" || i.family === family) && (i.name + " " + i.code).toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  return <><Heading title="Instrumentos" eyebrow="BIBLIOTECA TÉCNICA">Definições corretas, campos de registro e regras de qualidade transparentes.</Heading>
    <div className="catalog-summary"><span><strong>{instruments.length}</strong> instrumentos e simuladores</span><span><strong>4</strong> protocolos CogMetrics</span><span><Badge tone="warning">Normas clínicas não integradas</Badge></span></div>
    <div className="catalog-layout"><section className="panel"><div className="toolbar"><label className="field-search"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar instrumento" aria-label="Buscar instrumento" /></label><select aria-label="Família do instrumento" value={family} onChange={e => setFamily(e.target.value)}>{["Todos", "CogMetrics", "Registro externo", "Simulador"].map(v => <option key={v}>{v}</option>)}</select></div>
      {filtered.map(i => <button className={"instrument-row " + (selected === i.code ? "selected" : "")} key={i.code} onClick={() => setSelected(i.code)}><span className="instrument-code">{i.code}</span><span><strong>{i.name}</strong><small>{i.domain}</small><Badge tone={i.family === "CogMetrics" ? "blue" : "neutral"}>{i.family}</Badge></span></button>)}
      {!filtered.length && <Empty title="Nenhum instrumento encontrado" />}</section>
      <section className="panel instrument-detail"><span className="instrument-code large-code">{current.code}</span><Badge tone="blue">{current.family}</Badge><h2>{current.name}</h2><p>{current.description}</p><h3>Regra de qualidade</h3><Notice>{current.qualityRule}</Notice><h3>Campos de registro</h3><div className="field-chips">{current.fields.map(f => <span key={f.key}>{f.label}</span>)}</div><h3>Rastreabilidade técnica</h3><p>{current.provenance}</p>
        <p className="small-note">{current.family === "CogMetrics" ? "Os limites de 0 a 999 são proteções de entrada do software. Não representam amplitude normativa ou limite oficial do teste." : "Nenhum estímulo protegido é reproduzido."}</p>
        <div className="catalog-usage"><strong>{w.results.filter(r => r.instrumentCode === current.code).length}</strong><span>registros neste ambiente</span></div></section></div></>;
}
export function Agenda() {
  const { w, open } = useApp(), [day, setDay] = useState(todayBR()), [includeCancelled, setIncludeCancelled] = useState(false);
  const weekday = new Date(day + "T12:00:00Z").getUTCDay(), monday = addDays(day, -(weekday === 0 ? 6 : weekday - 1));
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const sessions = w.appointments.filter(s => s.startsAt.slice(0, 10) === day && (includeCancelled || s.status !== "cancelado"));
  return <><Heading title="Agenda" eyebrow="ATENDIMENTOS" action={<Button onClick={() => open({ kind: "appointment", day })}><Plus size={18} />Agendar atendimento</Button>}>Horários em Brasília · duração, situação e avaliação vinculada.</Heading>
    <section className="panel calendar-panel"><div className="toolbar"><div className="calendar-controls"><Button variant="secondary" onClick={() => setDay(addDays(day, -7))}>Semana anterior</Button><Button variant="ghost" onClick={() => setDay(todayBR())}>Hoje</Button><Button variant="secondary" onClick={() => setDay(addDays(day, 7))}>Próxima semana</Button></div><label className="inline-select"><span>Ir para a data</span><input type="date" value={day} onChange={e => e.target.value && setDay(e.target.value)} /></label></div>
      <div className="week-strip">{week.map(d => <button key={d} className={d === day ? "selected" : ""} aria-pressed={d === day} onClick={() => setDay(d)}><span>{new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"))}</span><strong>{Number(d.slice(-2))}</strong><small>{w.appointments.filter(s => s.startsAt.slice(0, 10) === d && s.status === "agendado").length} agendados</small></button>)}</div>
      <PanelTitle title={dateLabel(day, true)} detail={sessions.length + " atendimentos exibidos"} action={<label className="checkbox-label"><input type="checkbox" checked={includeCancelled} onChange={e => setIncludeCancelled(e.target.checked)} />Incluir cancelados</label>} />
      {sessions.length ? sessions.map(s => { const a = w.assessments.find(a => a.id === s.assessmentId)!, p = w.patients.find(p => p.id === a.patientId)!; return <div className="appointment-row" key={s.id}><div className="appointment-time"><strong>{timeLabel(s.startsAt)}</strong><small>{s.duration} min</small></div><Avatar patient={p} /><div className="appointment-person"><AppLink to={"/pacientes/" + p.id}>{p.name}</AppLink><span>{s.kind} · {a.title}</span>{s.notes && <small>{s.notes}</small>}</div><Badge tone={s.status === "realizado" ? "success" : s.status === "cancelado" ? "neutral" : "blue"}>{s.status === "agendado" ? "Agendado" : s.status === "realizado" ? "Realizado" : "Cancelado"}</Badge><Button variant="secondary" onClick={() => open({ kind: "appointment", appointment: s })}>Editar</Button></div>; }) : <Empty title="Nenhum atendimento nesta data" action={<Button onClick={() => open({ kind: "appointment", day })}>Agendar atendimento</Button>}>Escolha outro dia ou reserve um novo horário.</Empty>}
    </section></>;
}
export function ActivityLog() {
  const { w, user } = useApp(), [filter, setFilter] = useState("todos");
  const events = w.audit.filter(e => filter === "todos" || e.action.startsWith(filter));
  return <><Heading title="Atividade" eyebrow="RASTREABILIDADE">Alterações confirmadas no seu ambiente, com horário e registro relacionado.</Heading>
    <section className="panel"><div className="toolbar"><div><strong>{w.auditTotal} eventos registrados</strong><p className="caption">Exibindo até 100 eventos mais recentes · {user.displayName}</p></div><select aria-label="Filtrar tipo de alteração" value={filter} onChange={e => setFilter(e.target.value)}><option value="todos">Todas as alterações</option><option value="patient">Prontuários</option><option value="assessment">Avaliações</option><option value="result">Resultados</option><option value="report">Documentos</option><option value="appointment">Agenda</option></select></div>
      {events.map(e => <div className="timeline-item" key={e.id}><span><History size={17} /></span><div><strong>{e.summary}</strong><small>{dateLabel(e.createdAt, true)} às {timeLabel(e.createdAt)} · referência {e.entityId.slice(-8)}</small></div><Badge>{e.action.split(".")[0] === "report" ? "Documento" : e.action.split(".")[0] === "result" ? "Resultado" : e.action.split(".")[0] === "appointment" ? "Agenda" : e.action.split(".")[0] === "patient" ? "Prontuário" : "Ambiente"}</Badge></div>)}
      {!events.length && <Empty title="Nenhum evento neste filtro" />}</section></>;
}
export function About() {
  return <><Heading title="Um piloto para explorar o fluxo completo" eyebrow="SOBRE A COGMETRICS">Da história clínica à revisão de um documento, com operações reais sobre dados fictícios.</Heading>
    <Notice tone="warning"><strong>Use somente dados simulados.</strong> Este ambiente não está liberado para atendimento clínico ou armazenamento de informações de pacientes reais.</Notice>
    <div className="about-grid"><section className="panel prose-panel"><PanelTitle title="O que você pode fazer" /><ul className="feature-list"><li><CheckCircle2 size={18} />Cadastrar e editar prontuários, história e funcionalidade.</li><li><CheckCircle2 size={18} />Selecionar instrumentos e acompanhar as etapas da avaliação.</li><li><CheckCircle2 size={18} />Registrar escores e identificar inconsistências de protocolo.</li><li><CheckCircle2 size={18} />Editar, revisar e exportar documentos com versões preservadas.</li><li><CheckCircle2 size={18} />Agendar, reagendar e registrar atendimentos realizados.</li><li><CheckCircle2 size={18} />Consultar alterações e recuperar os registros após recarregar.</li></ul></section>
      <section className="panel prose-panel"><PanelTitle title="Como explorar" /><ol className="walkthrough"><li>Abra Maria Oliveira e continue sua avaliação.</li><li>Consulte Rafael Lima para ver as inconsistências intencionais em TDS/TSD.</li><li>Edite o relatório de Helena Duarte e percorra a revisão.</li><li>Abra João Carvalho para consultar um documento concluído e iniciar uma nova versão.</li><li>Crie seu próprio caso fictício e teste o ciclo completo.</li></ol></section>
      <section className="panel prose-panel"><PanelTitle title="Limites psicométricos" /><p>Os percentis associados aos instrumentos são valores sintéticos informados na demonstração. Não são calculados a partir de tabelas clínicas, idade ou escolaridade.</p><p>A medida CM-DEMO permite explorar uma transformação matemática com média 50 e desvio-padrão 15, escolhidos artificialmente. Os coeficientes das normas regressivas CogMetrics ainda precisam ser incorporados e verificados.</p><p>Não há diagnóstico automático, intervalo de confiança inventado, índice de mudança confiável ou assinatura clínica.</p></section>
      <section className="panel prose-panel"><PanelTitle title="Dados e documentos" /><p>O ambiente usa a sua conta conectada. Os registros pertencem ao seu espaço e as alterações são salvas. As versões anteriores dos documentos conservam uma cópia dos dados usados em sua elaboração.</p><p>A exportação de dados contém os registros atuais e os últimos 100 eventos. No documento, use o histórico para consultar e baixar versões anteriores; a função de impressão permite salvar em PDF pelo navegador.</p><a className="button secondary" href="/api/export">Exportar dados simulados</a></section></div></>;
}
