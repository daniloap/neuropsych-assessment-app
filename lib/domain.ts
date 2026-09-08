export type Stage = "triagem" | "aplicacao" | "integracao" | "revisao" | "concluida";
export const stages: Stage[] = ["triagem", "aplicacao", "integracao", "revisao", "concluida"];
export const stageLabels: Record<Stage, string> = { triagem: "Entrevista", aplicacao: "Aplicação", integracao: "Integração", revisao: "Revisão", concluida: "Concluída" };
export type Patient = {
  id: string; name: string; birthDate: string; education: number; occupation: string; referral: string;
  history: string; functioning: string; notes: string; archived: number; createdAt: string; updatedAt: string;
};
export type Assessment = {
  id: string; patientId: string; title: string; stage: Stage; priority: "normal" | "alta";
  startDate: string; dueDate: string; plan: string[]; anamnesisReviewed: number; notes: string; createdAt: string; updatedAt: string;
};
export type Result = {
  id: string; assessmentId: string; instrumentCode: string; raw: Record<string, number>; percentile: number | null;
  notes: string; excluded: number; exclusionReason: string; createdAt: string; updatedAt: string;
};
export type ReportSnapshot = {
  title: string;
  patient: Patient; assessment: Assessment; results: Result[]; integration: string; recommendations: string;
  sourceKey: string; rulesVersion: string; disclaimer: string; createdAt: string;
};
export type Report = {
  id: string; assessmentId: string; title: string; status: "rascunho" | "revisao" | "finalizado"; version: number;
  snapshot: ReportSnapshot; createdAt: string; updatedAt: string;
};
export type ReportVersion = { id: string; reportId: string; version: number; status: Report["status"]; snapshot: ReportSnapshot; createdAt: string };
export type Appointment = {
  id: string; assessmentId: string; startsAt: string; duration: number; kind: string;
  status: "agendado" | "realizado" | "cancelado"; notes: string; createdAt: string; updatedAt: string;
};
export type AuditEvent = { id: string; action: string; entityId: string; summary: string; createdAt: string };
export type Workspace = {
  revision: number; patients: Patient[]; assessments: Assessment[]; results: Result[]; reports: Report[];
  appointments: Appointment[]; audit: AuditEvent[]; auditTotal: number;
};
export type User = { id: string; displayName: string; email: string };
export type RawField = { key: string; label: string; min: number; max: number };
export type Instrument = {
  code: string; name: string; domain: string; family: "CogMetrics" | "Registro externo" | "Simulador";
  description: string; qualityRule: string; provenance: string; fields: RawField[];
};
const countFields: RawField[] = [
  { key: "acertos", label: "Acertos", min: 0, max: 999 },
  { key: "omissoes", label: "Omissões", min: 0, max: 999 },
  { key: "erros", label: "Erros", min: 0, max: 999 },
];
const projectSource = "Requisitos do projeto e revisão v7 recuperados do histórico. Os coeficientes normativos e o manual integral não estão incorporados.";
export const instruments: Instrument[] = [
  { code: "TDS", name: "Teste Dígito Símbolo", domain: "Velocidade de processamento", family: "CogMetrics",
    description: "Registro de acertos, omissões e erros do protocolo Dígito Símbolo.",
    qualityRule: "Omissões > 5 ou erros > 5 invalidam o escore principal. No par TDS/TSD, razão bilateral > 2 sinaliza incompatibilidade. Zero impede calcular a razão.", provenance: projectSource, fields: countFields },
  { code: "TSD", name: "Teste Símbolo Dígito", domain: "Velocidade de processamento", family: "CogMetrics",
    description: "Registro do protocolo Símbolo Dígito e comparação de consistência com o TDS.",
    qualityRule: "Omissões > 5 ou erros > 5 invalidam o escore principal. A consistência do par é verificada nas duas direções.", provenance: projectSource, fields: countFields },
  { code: "TBVN", name: "Teste de Busca Visual de Números", domain: "Busca visual", family: "CogMetrics",
    description: "Registro da busca visual de estímulos numéricos, preservando acertos, erros e omissões.",
    qualityRule: "Erros > 5 invalidam o escore principal. Omissões são registradas, mas não invalidam por esse critério.", provenance: projectSource, fields: countFields },
  { code: "TBVP", name: "Teste de Busca Visual de Palavras", domain: "Busca visual", family: "CogMetrics",
    description: "Registro da busca visual de palavras. Não corresponde a uma tarefa de busca de padrões.",
    qualityRule: "Erros > 5 invalidam o escore principal. Omissões são registradas, mas não invalidam por esse critério.", provenance: projectSource, fields: countFields },
  { code: "RAVLT", name: "Teste de Aprendizagem Auditivo-Verbal de Rey", domain: "Memória episódica", family: "Registro externo",
    description: "Registro das tentativas de aprendizagem, lista de interferência e evocações. A soma A1–A5 é aritmética; nenhuma norma comercial é reproduzida.",
    qualityRule: "Cada tentativa aceita de 0 a 15 palavras. O escore não gera um percentil clínico.", provenance: "Registro de escores; estímulos, manual e tabelas normativas não incluídos.",
    fields: ["A1", "A2", "A3", "A4", "A5", "B1", "A6", "A7"].map(key => ({ key, label: key, min: 0, max: 15 })) },
  { code: "MoCA", name: "Montreal Cognitive Assessment", domain: "Rastreio cognitivo", family: "Registro externo",
    description: "Campo para registro do total informado pelo profissional. A plataforma não aplica correções por escolaridade.",
    qualityRule: "Total de 0 a 30. Sem ponto de corte diagnóstico ou correção normativa automática.", provenance: "Registro externo. Consultar os materiais e condições de uso do titular.",
    fields: [{ key: "total", label: "Total informado", min: 0, max: 30 }] },
  { code: "FAS", name: "Fluência Verbal Fonêmica", domain: "Linguagem e funções executivas", family: "Registro externo",
    description: "Registro separado da produção válida em F, A e S, com soma aritmética.",
    qualityRule: "Contagens inteiras não negativas. A escolaridade não é convertida em norma neste piloto.", provenance: "O limite de 100 por letra é uma proteção de entrada do software, não um limite do teste.",
    fields: ["F", "A", "S"].map(key => ({ key, label: key, min: 0, max: 100 })) },
  { code: "BNT", name: "Teste de Nomeação de Boston", domain: "Linguagem", family: "Registro externo",
    description: "Registro do total de nomeação para a forma com 60 itens. Não contém figuras ou estímulos do teste.",
    qualityRule: "Total de 0 a 60, exclusivamente para a forma de 60 itens.", provenance: "Registro externo da forma extensa. A edição e a norma devem ser definidas antes do uso clínico.",
    fields: [{ key: "total", label: "Total · forma de 60 itens", min: 0, max: 60 }] },
  { code: "CM-DEMO", name: "Medida sintética de demonstração", domain: "Simulação matemática", family: "Simulador",
    description: "Demonstra uma transformação matemática: Z = (bruto − 50) / 15; percentil = 100 × Φ(Z). Média 50 e desvio-padrão 15 foram escolhidos apenas para testar o software.",
    qualityRule: "Bruto de 0 a 100. Os parâmetros não vêm de participantes ou de uma norma clínica.", provenance: "Parâmetros artificiais cm-demo-1.0. Sem aplicação clínica.",
    fields: [{ key: "total", label: "Escore sintético", min: 0, max: 100 }] },
];
export const byCode = Object.fromEntries(instruments.map(i => [i.code, i])) as Record<string, Instrument>;
export const DISCLAIMER = "DEMONSTRAÇÃO — Dados e percentis sintéticos. Sem validade clínica. Este documento não é um laudo para uso assistencial e não possui assinatura profissional.";
export const RULES_VERSION = "cogmetrics-quality-v7-pilot-1";

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function textField(value: unknown, label: string, min = 0, max = 6000): string {
  if (typeof value !== "string") throw new AppError(label + ": informe um texto.");
  const v = value.trim();
  if (v.length < min || v.length > max) throw new AppError(label + ": use de " + min + " a " + max + " caracteres.");
  return v;
}
export function intField(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max)
    throw new AppError(label + ": informe um número inteiro entre " + min + " e " + max + ".");
  return value;
}
export function dateField(value: unknown, label: string): string {
  const v = textField(value, label, 10, 10);
  const d = new Date(v + "T12:00:00Z");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || !Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== v)
    throw new AppError(label + ": data inválida.");
  return v;
}
export function todayBR(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(k => parts.find(p => p.type === k)!.value).join("-");
}
export function addDays(day: string, n: number): string {
  const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
export function ageAt(birth: string, reference: string): number {
  let n = Number(reference.slice(0, 4)) - Number(birth.slice(0, 4));
  if (reference.slice(5) < birth.slice(5)) n--;
  return n;
}
export function dateLabel(value: string, withYear = false): string {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", ...(withYear ? { year: "numeric" as const } : {}), timeZone: "America/Sao_Paulo" })
    .format(new Date(value.length === 10 ? value + "T12:00:00Z" : value));
}
export function normalCDF(z: number): number {
  const x = Math.abs(z), t = 1 / (1 + 0.2316419 * x);
  const density = Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  const tail = density * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z >= 0 ? 1 - tail : tail;
}
export function syntheticPercentile(raw: number): number {
  intField(raw, "Escore sintético", 0, 100);
  return Math.max(1, Math.min(99, Math.round(100 * normalCDF((raw - 50) / 15))));
}
export function validateRaw(code: string, raw: unknown): Record<string, number> {
  const instrument = byCode[code];
  if (!instrument) throw new AppError("Instrumento não encontrado.");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new AppError("Escores inválidos.");
  const data = raw as Record<string, unknown>, out: Record<string, number> = {};
  if (Object.keys(data).some(key => !instrument.fields.some(f => f.key === key))) throw new AppError("O resultado contém campos que não pertencem ao instrumento.");
  for (const f of instrument.fields) out[f.key] = intField(data[f.key], f.label, f.min, f.max);
  return out;
}
export function rawTotal(result: Pick<Result, "instrumentCode" | "raw">): number {
  const r = result.raw;
  if (result.instrumentCode === "RAVLT") return ["A1", "A2", "A3", "A4", "A5"].reduce((a, k) => a + r[k], 0);
  if (result.instrumentCode === "FAS") return r.F + r.A + r.S;
  return r.acertos ?? r.total;
}
export function rawLabel(result: Pick<Result, "instrumentCode" | "raw">): string {
  const n = rawTotal(result);
  if (result.instrumentCode === "RAVLT") return "A1–A5: " + n;
  if (result.raw.acertos !== undefined) return n + " acertos";
  return n + " pontos";
}
export type Quality = { valid: boolean; reasons: string[] };
export function qualityOf(result: Result, peers: Result[]): Quality {
  const reasons: string[] = [];
  const { instrumentCode: code, raw } = result;
  if (["TDS", "TSD", "TBVN", "TBVP"].includes(code) && raw.erros > 5) reasons.push("Mais de 5 erros.");
  if (["TDS", "TSD"].includes(code)) {
    if (raw.omissoes > 5) reasons.push("Mais de 5 omissões.");
    const other = peers.find(r => r.assessmentId === result.assessmentId && r.instrumentCode === (code === "TDS" ? "TSD" : "TDS"));
    if (other) {
      if (raw.acertos === 0 || other.raw.acertos === 0) reasons.push("Razão TDS/TSD indefinida: um escore é zero.");
      else if (Math.max(raw.acertos / other.raw.acertos, other.raw.acertos / raw.acertos) > 2)
        reasons.push("Razão bilateral TDS/TSD maior que 2.");
    }
  }
  return { valid: reasons.length === 0, reasons };
}
export function visiblePercentile(r: Result, peers: Result[]): number | null {
  return r.excluded || !qualityOf(r, peers).valid ? null : r.percentile;
}
export function progress(a: Assessment, results: Result[]): number {
  if (!a.plan.length) return 0;
  return Math.round(100 * a.plan.filter(code => results.some(r => r.assessmentId === a.id && r.instrumentCode === code)).length / a.plan.length);
}
export function readiness(a: Assessment, results: Result[]): string[] {
  const rr = results.filter(r => r.assessmentId === a.id), issues: string[] = [];
  if (!a.anamnesisReviewed) issues.push("Revise a entrevista e a funcionalidade.");
  if (!a.plan.length) issues.push("Selecione ao menos um instrumento.");
  for (const code of a.plan) {
    const r = rr.find(x => x.instrumentCode === code);
    if (!r) issues.push("Registre o resultado de " + code + ".");
    else if (!qualityOf(r, rr).valid && !r.excluded) issues.push("Revise ou justifique a exclusão de " + code + ".");
  }
  return issues;
}
export function sourceKey(patient: Patient, assessment: Assessment, results: Result[]): string {
  return JSON.stringify({
    patient: [patient.name, patient.birthDate, patient.education, patient.occupation, patient.referral, patient.history, patient.functioning, patient.notes],
    assessment: [assessment.title, assessment.startDate, assessment.plan, assessment.notes, assessment.anamnesisReviewed],
    results: results.filter(r => r.assessmentId === assessment.id).sort((a, b) => a.instrumentCode.localeCompare(b.instrumentCode))
      .map(r => [r.instrumentCode, r.raw, r.percentile, r.notes, r.excluded, r.exclusionReason]),
  });
}
export function snapshotFor(patient: Patient, assessment: Assessment, results: Result[], integration: string, recommendations: string, createdAt: string): ReportSnapshot {
  const selected = results.filter(r => r.assessmentId === assessment.id);
  return { title: "Relatório de avaliação neuropsicológica", patient, assessment, results: selected, integration, recommendations, sourceKey: sourceKey(patient, assessment, selected),
    rulesVersion: RULES_VERSION, disclaimer: DISCLAIMER, createdAt };
}
