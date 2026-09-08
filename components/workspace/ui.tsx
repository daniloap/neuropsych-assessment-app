"use client";
import type { ReactNode, MouseEvent, ButtonHTMLAttributes } from "react";
import { AlertCircle, BookOpen, Check, FileText, Plus } from "lucide-react";
import { ageAt, byCode, dateLabel, progress, qualityOf, rawLabel, stageLabels, todayBR, visiblePercentile } from "@/lib/domain";
import type { Assessment, Patient, Result, Stage } from "@/lib/domain";
import { useApp } from "./context";

export function Button({ children, variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button {...props} className={"button " + variant + " " + className}>{children}</button>;
}
export function AppLink({ to, children, className = "", onNavigate }: { to: string; children: ReactNode; className?: string; onNavigate?: () => void }) {
  const { navigate } = useApp();
  function go(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault(); onNavigate?.(); navigate(to);
  }
  return <a href={to} className={className} onClick={go}>{children}</a>;
}
export function Heading({ title, eyebrow, children, action }: { title: string; eyebrow?: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{children && <div className="heading-sub">{children}</div>}</div>{action && <div className="heading-actions">{action}</div>}</div>;
}
export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: string }) { return <span className={"badge " + tone}>{children}</span>; }
export function StageBadge({ stage }: { stage: Stage }) { return <Badge tone={stage}>{stageLabels[stage]}</Badge>; }
export function Avatar({ patient, large = false }: { patient: Pick<Patient, "name">; large?: boolean }) {
  const parts = patient.name.split(" ").filter(Boolean), text = (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
  const tone = patient.name.charCodeAt(0) % 4;
  return <span className={"avatar tone-" + tone + (large ? " large" : "")} aria-hidden="true">{text}</span>;
}
export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-icon"><BookOpen size={26} /></span><h3>{title}</h3>{children && <p>{children}</p>}{action}</div>;
}
export function PanelTitle({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return <div className="panel-title"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>;
}
export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warning" | "success" }) {
  return <div className={"notice " + tone}>{tone === "success" ? <Check size={18} /> : <AlertCircle size={18} />}<div>{children}</div></div>;
}
export function Progress({ value, label }: { value: number; label?: string }) {
  return <div className="progress-block"><div className="progress-meta">{label && <span>{label}</span>}<strong>{value}%</strong></div><div className="progress-track" role="progressbar" aria-label={label || "Instrumentos registrados"} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: value + "%" }} /></div></div>;
}
export function AssessmentTable({ assessments }: { assessments: Assessment[] }) {
  const { w } = useApp();
  if (!assessments.length) return <Empty title="Nenhuma avaliação neste recorte">Altere os filtros ou inicie uma avaliação.</Empty>;
  return <div className="table-scroll"><table className="data-table"><thead><tr><th>Paciente</th><th>Avaliação</th><th>Etapa</th><th>Instrumentos</th><th>Prazo</th></tr></thead><tbody>{assessments.map(a => {
    const p = w.patients.find(p => p.id === a.patientId)!;
    return <tr key={a.id}><td><AppLink to={"/pacientes/" + p.id} className="person-cell"><Avatar patient={p} /><span><strong>{p.name}</strong><small>{ageAt(p.birthDate, a.startDate)} anos na avaliação</small></span></AppLink></td>
      <td><AppLink to={"/avaliacoes/" + a.id} className="row-link">{a.title}</AppLink>{a.priority === "alta" && <small className="priority-label">Prioridade alta</small>}</td>
      <td><StageBadge stage={a.stage} /></td><td><Progress value={progress(a, w.results)} /></td>
      <td><span className={a.dueDate < todayBR() && a.stage !== "concluida" ? "overdue" : ""}>{dateLabel(a.dueDate)}</span></td></tr>;
  })}</tbody></table></div>;
}
export function ResultTable({ results, editableAssessment }: { results: Result[]; editableAssessment?: Assessment }) {
  const { open } = useApp();
  if (!results.length) return <Empty title="Resultados ainda não registrados" action={editableAssessment && <Button onClick={() => open({ kind: "score", assessment: editableAssessment })}><Plus size={16} />Registrar resultado</Button>}>O perfil será construído a partir dos instrumentos registrados.</Empty>;
  return <div className="table-scroll"><table className="data-table result-table"><thead><tr><th>Instrumento</th><th>Escore bruto</th><th>Percentil ilustrativo</th><th>Qualidade</th>{editableAssessment && <th><span className="sr-only">Editar</span></th>}</tr></thead><tbody>{results.map(r => {
    const quality = qualityOf(r, results), pct = visiblePercentile(r, results);
    return <tr key={r.id}><td><strong>{r.instrumentCode}</strong><small>{byCode[r.instrumentCode]?.domain}</small></td><td>{rawLabel(r)}</td>
      <td><span className="percentile">{pct === null ? "—" : "P" + pct}</span>{pct !== null && <small>Sintético</small>}</td>
      <td>{r.excluded ? <Badge tone="neutral">Excluído</Badge> : quality.valid ? <Badge tone="success">Consistente</Badge> : <Badge tone="warning">Revisar</Badge>}
        {!quality.valid && <small className="quality-reason">{quality.reasons.join(" ")}</small>}{r.excluded ? <small>{r.exclusionReason}</small> : null}</td>
      {editableAssessment && <td><Button variant="ghost" disabled={editableAssessment.stage === "concluida"} onClick={() => open({ kind: "score", assessment: editableAssessment, code: r.instrumentCode })}>Editar</Button></td>}
    </tr>;
  })}</tbody></table></div>;
}
export function ProfilePlot({ results }: { results: Result[] }) {
  if (!results.length) return <Empty title="O perfil aparecerá aqui">Registre resultados para visualizar o perfil por instrumento.</Empty>;
  return <div className="profile-plot"><div className="plot-axis"><span>Instrumento</span><div>{[1, 25, 50, 75, 99].map(n => <span key={n}>P{n}</span>)}</div><span /></div>
    {results.map(r => { const pct = visiblePercentile(r, results); return <div className="plot-row" key={r.id}><strong>{r.instrumentCode}</strong><div className={"plot-track " + (pct === null ? "no-point" : "")}>
      {[0, 25, 50, 75, 100].map(n => <i key={n} style={{ left: n + "%" }} />)}
      {pct !== null ? <span className="plot-point" style={{ left: pct + "%" }} title={"Percentil ilustrativo " + pct} /> : <span className="plot-unavailable">{r.excluded ? "Excluído" : "Sem percentil"}</span>}
    </div><b>{pct ?? "—"}</b></div>; })}
    <p className="caption">Percentis exclusivamente ilustrativos. Cada ponto representa um instrumento; não há média ou escore global por domínio.</p>
  </div>;
}
export function LearningCurve({ result }: { result: Result }) {
  const keys = ["A1", "A2", "A3", "A4", "A5"], values = keys.map(k => result.raw[k]), xs = [36, 101, 166, 231, 296];
  return <div className="learning-curve"><svg viewBox="0 0 330 172" role="img" aria-label={"Curva de aprendizagem: " + values.join(", ") + " palavras nas cinco tentativas."}>
    {[0, 5, 10, 15].map(n => <g key={n}><line x1="36" x2="296" y1={135 - n * 7} y2={135 - n * 7} stroke="#e2e8f1" /><text x="10" y={139 - n * 7}>{n}</text></g>)}
    <polyline points={values.map((v, i) => xs[i] + "," + (135 - v * 7)).join(" ")} fill="none" stroke="#4266d5" strokeWidth="2.5" />
    {values.map((v, i) => <g key={i}><circle cx={xs[i]} cy={135 - v * 7} r="4.5" fill="#4266d5" stroke="white" strokeWidth="2" /><text x={xs[i]} y={123 - v * 7} textAnchor="middle">{v}</text><text x={xs[i]} y="160" textAnchor="middle">{keys[i]}</text></g>)}
  </svg><p className="caption">Palavras registradas por tentativa · dados simulados</p></div>;
}
export function DocumentLink({ id, title, version, status }: { id: string; title: string; version: number; status: string }) {
  return <AppLink className="document-link" to={"/relatorios/" + id}><span className="file-icon"><FileText size={21} /></span><span><strong>{title}</strong><small>Versão {version} · {status}</small></span></AppLink>;
}
