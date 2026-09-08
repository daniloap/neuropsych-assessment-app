import { byCode, dateLabel, rawLabel, visiblePercentile } from "./domain.ts";
import type { Report } from "./domain.ts";
export function escapeHTML(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
export function reportHTML(report: Report): string {
  const s = report.snapshot, e = escapeHTML;
  const paragraph = (value: string) => e(value).replace(/\n/g, "<br>");
  const rows = s.results.map(r => "<tr><td><b>" + e(r.instrumentCode) + "</b><br>" + e(byCode[r.instrumentCode]?.name) +
    "</td><td>" + e(rawLabel(r)) + "</td><td>" + (visiblePercentile(r, s.results) ?? "—") + "</td><td>" +
    e(r.excluded ? "Excluído: " + r.exclusionReason : visiblePercentile(r, s.results) === null ? "Sem percentil interpretável" : "Percentil sintético") + "</td></tr>").join("");
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>CogMetrics · Documento demonstrativo</title><style>" +
    "body{font:16px/1.65 Arial,sans-serif;color:#172b46;margin:40px auto;max-width:900px;padding:24px}" +
    "h1{font-size:30px;line-height:1.2}h2{font-size:19px;margin-top:32px}.brand{font-size:22px;font-weight:700;color:#2857bd}" +
    ".notice{border:1px solid #becae2;background:#f2f5fb;padding:14px;font-size:14px}table{width:100%;border-collapse:collapse;font-size:14px}" +
    "th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #ccd4df;vertical-align:top}small,footer{font-size:13px;color:#4f6076}" +
    "@media print{body{margin:0;padding:0;font-size:11pt}h2{break-after:avoid}tr{break-inside:avoid}@page{size:A4;margin:20mm}}" +
    "</style></head><body><div class='brand'>CogMetrics</div><h1>" + e(s.title) + "</h1><p class='notice'>" + e(s.disclaimer) +
    "</p><p><strong>" + e(s.patient.name) + "</strong><br>Nascimento: " + e(dateLabel(s.patient.birthDate, true)) +
    " · Escolaridade: " + s.patient.education + " anos<br>Documento v" + report.version + " · " + e(report.status) +
    " · " + e(dateLabel(report.updatedAt, true)) + "</p><h2>1. Identificação e demanda</h2><p>" + paragraph(s.patient.referral) +
    "</p><h2>2. História e funcionalidade</h2><p>" + paragraph(s.patient.history) + "</p><p>" + paragraph(s.patient.functioning) +
    "</p><h2>3. Procedimentos registrados</h2><p>Protocolo: " + e(s.assessment.plan.join(", ")) + ". Os procedimentos e escores são simulados.</p>" +
    "<h2>4. Resultados</h2><table><thead><tr><th>Instrumento</th><th>Escore bruto</th><th>Percentil ilustrativo</th><th>Condição</th></tr></thead><tbody>" + rows +
    "</tbody></table><p class='notice'>Não há conversão normativa clínica. As regras de qualidade identificam inconsistências e não estabelecem diagnósticos.</p>" +
    "<h2>5. Integração</h2><p>" + paragraph(s.integration || "Seção ainda não redigida.") + "</p><h2>6. Recomendações</h2><p>" +
    paragraph(s.recommendations || "Seção ainda não redigida.") + "</p><h2>7. Rastreabilidade</h2><p><small>Dados preservados em " + e(s.createdAt) +
    ". Regras: " + e(s.rulesVersion) + ". Percentis: entrada sintética ou transformação artificial CM-DEMO. Sem assinatura profissional.</small></p>" +
    "<footer>CogMetrics · Documento de demonstração · v" + report.version + "</footer></body></html>";
}
