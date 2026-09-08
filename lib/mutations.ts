import { AppError, ageAt, byCode, dateField, intField, readiness, snapshotFor, sourceKey, stages, syntheticPercentile, textField, todayBR, validateRaw } from "./domain.ts";
import type { Assessment, Patient, Report, Result, Stage, Workspace } from "./domain.ts";
import { commit, insertRows, readWorkspace } from "./store.ts";
import type { Database, Statement } from "./store.ts";

type Input = Record<string, unknown>;
function object(value: unknown): Input {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AppError("Formulário inválido.");
  return value as Input;
}
function optional(value: unknown, label: string, max = 6000): string { return textField(value ?? "", label, 0, max); }
function choice<T extends string>(v: unknown, allowed: readonly T[], label: string): T {
  if (typeof v !== "string" || !allowed.includes(v as T)) throw new AppError(label + ": opção inválida.");
  return v as T;
}
function flag(value: unknown, label: string): number {
  if (value !== true && value !== false) throw new AppError(label + ": valor inválido.");
  return value ? 1 : 0;
}
function get<T extends { id: string }>(rows: T[], id: unknown): T {
  const row = rows.find(r => r.id === id);
  if (!row) throw new AppError("Registro não encontrado neste ambiente.", 404);
  return row;
}
function patientData(d: Input, existing?: Patient) {
  const birthDate = dateField(d.birthDate, "Nascimento");
  const age = ageAt(birthDate, todayBR());
  if (age < 0 || age > 120) throw new AppError("A data de nascimento deve representar uma idade entre 0 e 120 anos.");
  return { name: textField(d.name, "Nome fictício", 3, 120), birthDate, education: intField(d.education, "Anos de estudo", 0, 40),
    occupation: optional(d.occupation, "Ocupação", 160), referral: textField(d.referral, "Demanda", 8, 3000),
    history: optional(d.history ?? existing?.history, "História"), functioning: optional(d.functioning ?? existing?.functioning, "Funcionalidade"),
    notes: optional(d.notes ?? existing?.notes, "Observações") };
}
function planData(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 9 || value.some(v => typeof v !== "string" || !byCode[v]) || new Set(value).size !== value.length)
    throw new AppError("Selecione instrumentos válidos e sem repetição.");
  return value;
}
function locked(a: Assessment, w: Workspace) {
  if (a.stage === "concluida" || w.reports.some(r => r.assessmentId === a.id && r.status === "finalizado"))
    throw new AppError("Esta avaliação está concluída. Abra uma nova versão do relatório para retomar a edição.", 409);
}
export async function mutate(db: Database, owner: string, body: unknown): Promise<{ id: string; revision: number }> {
  const input = object(body), d = object(input.data);
  const revision = intField(input.revision, "Revisão", 1, Number.MAX_SAFE_INTEGER), action = textField(input.action, "Operação", 1, 80);
  const w = await readWorkspace(db, owner);
  if (w.revision !== revision) throw new AppError("Os dados mudaram. Atualize antes de salvar novamente; seu formulário continua aberto.", 409);
  const stamp = new Date().toISOString(), uuid = () => crypto.randomUUID();
  let id = typeof d.id === "string" ? d.id : uuid(), summary = "";
  const statements: Statement[] = [];
  const add = (table: string, row: Record<string, unknown>) => statements.push(...insertRows(db, table, [{ ...row, ownerId: owner }]));
  const update = (table: string, entityId: string, values: Record<string, unknown>) => {
    const keys = Object.keys(values);
    statements.push(db.prepare("UPDATE " + table + " SET " + keys.map(k => k.replace(/[A-Z]/g, c => "_" + c.toLowerCase()) + " = ?").join(",") + " WHERE owner_id = ? AND id = ?")
      .bind(...keys.map(k => typeof values[k] === "object" ? JSON.stringify(values[k]) : values[k]), owner, entityId));
  };
  if (action === "patient.create" || action === "patient.update") {
    const existing = action === "patient.update" ? get(w.patients, d.id) : undefined;
    const values = patientData(d, existing);
    if (existing) { update("patients", existing.id, { ...values, updatedAt: stamp }); id = existing.id; summary = "Cadastro e informações da entrevista atualizados."; }
    else { id = uuid(); add("patients", { id, ...values, archived: 0, createdAt: stamp, updatedAt: stamp }); summary = "Paciente fictício cadastrado."; }
  } else if (action === "patient.archive") {
    const p = get(w.patients, d.id);
    if (w.assessments.some(a => a.patientId === p.id && a.stage !== "concluida")) throw new AppError("Conclua as avaliações em andamento antes de arquivar.");
    update("patients", p.id, { archived: p.archived ? 0 : 1, updatedAt: stamp }); summary = p.archived ? "Prontuário restaurado." : "Prontuário arquivado.";
  } else if (action === "assessment.create") {
    const p = get(w.patients, d.patientId);
    if (p.archived) throw new AppError("Restaure o prontuário antes de iniciar uma avaliação.");
    const startDate = dateField(d.startDate, "Início"), dueDate = dateField(d.dueDate, "Prazo");
    if (dueDate < startDate || startDate < p.birthDate || startDate > todayBR()) throw new AppError("Revise as datas de início e prazo.");
    id = uuid(); add("assessments", { id, patientId: p.id, title: textField(d.title, "Título", 5, 160),
      stage: "triagem", priority: choice(d.priority, ["normal", "alta"], "Prioridade"), startDate, dueDate,
      plan: planData(d.plan), anamnesisReviewed: 0, notes: "", createdAt: stamp, updatedAt: stamp });
    summary = "Nova avaliação iniciada.";
  } else if (action === "assessment.update") {
    const a = get(w.assessments, d.id); locked(a, w);
    const plan = planData(d.plan), dueDate = dateField(d.dueDate, "Prazo");
    if (dueDate < a.startDate) throw new AppError("O prazo deve ser igual ou posterior ao início.");
    const removed = w.results.filter(r => r.assessmentId === a.id && !plan.includes(r.instrumentCode));
    if (removed.length) throw new AppError("Mantenha no protocolo os instrumentos que já possuem resultados.");
    const reviewed = flag(d.anamnesisReviewed, "Entrevista revisada");
    const p = get(w.patients, a.patientId);
    if (reviewed && (p.history.length < 15 || p.functioning.length < 15)) throw new AppError("Complete a história e a funcionalidade antes de confirmar a revisão.");
    update("assessments", a.id, { title: textField(d.title, "Título", 5, 160), plan, dueDate, priority: choice(d.priority, ["normal", "alta"], "Prioridade"),
      anamnesisReviewed: reviewed, notes: optional(d.notes, "Notas"), updatedAt: stamp });
    summary = "Protocolo e planejamento da avaliação atualizados.";
  } else if (action === "assessment.stage") {
    const a = get(w.assessments, d.id); locked(a, w);
    const stage = choice<Stage>(d.stage, stages, "Etapa");
    if (stage === "concluida") throw new AppError("Conclua a versão do relatório para encerrar a avaliação.");
    if (Math.abs(stages.indexOf(stage) - stages.indexOf(a.stage)) !== 1) throw new AppError("Avance ou retorne uma etapa por vez.");
    if (stages.indexOf(stage) > stages.indexOf(a.stage)) {
      if (!a.anamnesisReviewed || !a.plan.length) throw new AppError("Revise a entrevista e selecione o protocolo antes de avançar.");
      if (stage === "integracao" || stage === "revisao") {
        const issues = readiness(a, w.results); if (issues.length) throw new AppError(issues.join(" "));
      }
      if (stage === "revisao" && !w.reports.some(r => r.assessmentId === a.id)) throw new AppError("Crie o relatório antes de iniciar a revisão.");
    }
    update("assessments", a.id, { stage, updatedAt: stamp }); summary = "Etapa da avaliação alterada.";
  } else if (action === "result.save") {
    const a = get(w.assessments, d.assessmentId); locked(a, w);
    const code = textField(d.instrumentCode, "Instrumento", 1, 20);
    if (!a.plan.includes(code)) throw new AppError("Inclua o instrumento no protocolo desta avaliação.");
    const raw = validateRaw(code, d.raw), excluded = flag(d.excluded, "Excluir da interpretação");
    const exclusionReason = optional(d.exclusionReason, "Justificativa", 1500);
    if (excluded && exclusionReason.length < 10) throw new AppError("Justifique a exclusão com ao menos 10 caracteres.");
    const percentile = code === "CM-DEMO" ? syntheticPercentile(raw.total)
      : d.percentile === null ? null : intField(d.percentile, "Percentil ilustrativo", 1, 99);
    if (code !== "CM-DEMO" && percentile !== null && d.syntheticConfirmed !== true)
      throw new AppError("Confirme que o percentil é inteiramente sintético.");
    const existing = w.results.find(r => r.assessmentId === a.id && r.instrumentCode === code);
    const values = { raw, percentile, notes: optional(d.notes, "Observações"), excluded, exclusionReason, updatedAt: stamp };
    id = existing?.id ?? uuid();
    if (existing) update("results", id, values);
    else add("results", { id, assessmentId: a.id, instrumentCode: code, ...values, createdAt: stamp });
    update("assessments", a.id, { updatedAt: stamp });
    summary = "Resultado de " + code + " registrado na avaliação.";
  } else if (action === "report.create") {
    const a = get(w.assessments, d.assessmentId), p = get(w.patients, a.patientId);
    if (w.reports.some(r => r.assessmentId === a.id)) throw new AppError("Esta avaliação já possui um relatório. Abra o documento existente.");
    if (!w.results.some(r => r.assessmentId === a.id)) throw new AppError("Registre ao menos um resultado antes de criar o documento.");
    id = uuid();
    const snapshot = snapshotFor(p, a, w.results, "", "", stamp);
    add("reports", { id, assessmentId: a.id, title: "Relatório de avaliação neuropsicológica", status: "rascunho", version: 1, snapshot, createdAt: stamp, updatedAt: stamp });
    add("report_versions", { id: uuid(), reportId: id, version: 1, status: "rascunho", snapshot, createdAt: stamp });
    summary = "Rascunho criado com cópia dos dados da avaliação.";
  } else if (["report.save", "report.review", "report.finalize", "report.reopen"].includes(action)) {
    const r = get(w.reports, d.id), a = get(w.assessments, r.assessmentId), p = get(w.patients, a.patientId);
    if (r.status === "finalizado" && action !== "report.reopen") throw new AppError("Abra uma nova versão para editar este documento.");
    if (action === "report.reopen" && r.status !== "finalizado") throw new AppError("Somente um documento concluído precisa ser reaberto.");
    let status: Report["status"] = action === "report.review" ? "revisao" : action === "report.finalize" ? "finalizado" : "rascunho";
    const integration = action === "report.reopen" ? r.snapshot.integration : optional(d.integration, "Integração", 15000);
    const recommendations = action === "report.reopen" ? r.snapshot.recommendations : optional(d.recommendations, "Recomendações", 10000);
    if (status !== "rascunho") {
      const issues = readiness(a, w.results);
      if (issues.length) throw new AppError(issues.join(" "));
      if (integration.length < 40 || recommendations.length < 20) throw new AppError("Complete a integração e as recomendações antes da revisão.");
    }
    if (action === "report.finalize") {
      if (r.status !== "revisao" || d.reviewConfirmed !== true) throw new AppError("Envie à revisão e confirme a conferência dos dados antes de concluir.");
      if (r.snapshot.sourceKey !== sourceKey(p, a, w.results)) throw new AppError("Os dados mudaram desde a revisão. Salve uma versão atualizada e revise novamente.");
      if (integration !== r.snapshot.integration || recommendations !== r.snapshot.recommendations)
        throw new AppError("Salve e revise as alterações de texto antes de concluir.");
    }
    const snapshot = snapshotFor(p, a, w.results, integration, recommendations, stamp), version = r.version + 1;
    snapshot.title = textField(d.title ?? r.title, "Título", 5, 180);
    update("reports", r.id, { title: textField(d.title ?? r.title, "Título", 5, 180), status, version, snapshot, updatedAt: stamp });
    add("report_versions", { id: uuid(), reportId: r.id, version, status, snapshot, createdAt: stamp });
    if (action === "report.reopen") update("assessments", a.id, { stage: "integracao", updatedAt: stamp });
    if (status === "revisao") update("assessments", a.id, { stage: "revisao", updatedAt: stamp });
    if (status === "finalizado") update("assessments", a.id, { stage: "concluida", updatedAt: stamp });
    id = r.id; summary = "Versão " + version + " do documento preservada: " + status + ".";
  } else if (action === "appointment.create" || action === "appointment.update") {
    const existing = action === "appointment.update" ? get(w.appointments, d.id) : undefined;
    const a = get(w.assessments, d.assessmentId);
    const startsAt = textField(d.startsAt, "Horário", 25, 25);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00-03:00$/.test(startsAt) || !Number.isFinite(new Date(startsAt).getTime()))
      throw new AppError("Informe data e horário válidos no fuso de Brasília.");
    dateField(startsAt.slice(0, 10), "Data");
    if (Number(startsAt.slice(11, 13)) > 23 || Number(startsAt.slice(14, 16)) > 59) throw new AppError("Horário inválido.");
    const duration = intField(d.duration, "Duração", 15, 240), status = choice(d.status, ["agendado", "realizado", "cancelado"], "Situação");
    const start = new Date(startsAt).getTime();
    if (status === "agendado" && w.appointments.some(s => s.id !== existing?.id && s.status === "agendado" &&
      start < new Date(s.startsAt).getTime() + s.duration * 60000 && start + duration * 60000 > new Date(s.startsAt).getTime()))
      throw new AppError("Este horário coincide com outro atendimento. Escolha um intervalo livre.");
    const values = { assessmentId: a.id, startsAt, duration, status,
      kind: choice(d.kind, ["Entrevista", "Aplicação", "Integração", "Devolutiva"], "Tipo"), notes: optional(d.notes, "Notas", 1500), updatedAt: stamp };
    id = existing?.id ?? uuid();
    if (existing) update("appointments", id, values); else add("appointments", { id, ...values, createdAt: stamp });
    summary = existing ? "Atendimento atualizado na agenda." : "Atendimento agendado.";
  } else {
    throw new AppError("Operação desconhecida.", 404);
  }
  await commit(db, owner, revision, statements, action, id, summary);
  return { id, revision: revision + 1 };
}
