import { AppError } from "./domain.ts";
import type { User } from "./domain.ts";
import { ensureWorkspace, readReport, readWorkspace, reportHistory } from "./store.ts";
import type { Database } from "./store.ts";
import { mutate } from "./mutations.ts";
import { reportHTML } from "./export.ts";

export function authenticatedUser(request: Request): User | null {
  const id = request.headers.get("oai-authenticated-user-id"), email = request.headers.get("oai-authenticated-user-email");
  if (!id || !email) return null;
  let name = "";
  if (request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8")
    try { name = decodeURIComponent(request.headers.get("oai-authenticated-user-full-name") ?? ""); } catch { /* Email is a safe display fallback. */ }
  return { id, email, displayName: name || email };
}
export async function api(request: Request, db: Database | undefined): Promise<Response> {
  const headers = { "Cache-Control": "no-store, private", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin" };
  const json = (data: unknown, status = 200) => Response.json(data, { status, headers });
  try {
    const user = authenticatedUser(request);
    if (!user) throw new AppError("Entre na sua conta para acessar este ambiente.", 401);
    if (!db) throw new AppError("O armazenamento está temporariamente indisponível. Tente novamente.", 503);
    const url = new URL(request.url);
    if (request.method === "GET") {
      if (url.pathname === "/api/workspace") {
        await ensureWorkspace(db, user.id);
        return json({ workspace: await readWorkspace(db, user.id), user });
      }
      if (url.pathname === "/api/export") {
        const workspace = await readWorkspace(db, user.id);
        return new Response(JSON.stringify({ format: "cogmetrics-demo-v2", exportedAt: new Date().toISOString(), scope: "Registros atuais; últimos 100 eventos. Versões de relatório disponíveis separadamente.", workspace }, null, 2),
          { headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="cogmetrics-dados-simulados.json"' } });
      }
      const match = url.pathname.match(/^\/api\/reports\/([^/]+)\/(versions|export)$/);
      if (match) {
        const report = await readReport(db, user.id, match[1]);
        if (match[2] === "versions") return json({ versions: await reportHistory(db, user.id, report.id) });
        const version = url.searchParams.get("version");
        if (version) {
          const selected = (await reportHistory(db, user.id, report.id)).find(v => String(v.version) === version);
          if (!selected) throw new AppError("Versão não encontrada.", 404);
          report.snapshot = selected.snapshot; report.status = selected.status; report.version = selected.version; report.updatedAt = selected.createdAt;
        }
        return new Response(reportHTML(report), { headers: { ...headers, "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": 'attachment; filename="cogmetrics-relatorio-v' + report.version + '.html"',
          "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'" } });
      }
      throw new AppError("Endereço não encontrado.", 404);
    }
    if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
    if (request.headers.get("origin") !== url.origin || request.headers.get("sec-fetch-site") === "cross-site" ||
      request.headers.get("x-cogmetrics-client") !== "workspace" || !request.headers.get("content-type")?.includes("application/json"))
      throw new AppError("Origem da solicitação não autorizada.", 403);
    if (url.pathname !== "/api/mutations") throw new AppError("Operação não encontrada.", 404);
    if (Number(request.headers.get("content-length") || 0) > 64000) throw new AppError("Formulário muito extenso.", 413);
    // Bound the body while reading; do not trust Content-Length.
    const reader = request.body?.getReader();
    if (!reader) throw new AppError("Formulário vazio.");
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) {
      const part = await reader.read(); if (part.done) break;
      length += part.value.byteLength;
      if (length > 64000) { await reader.cancel(); throw new AppError("Formulário muito extenso.", 413); }
      chunks.push(part.value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let body: unknown;
    try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new AppError("Formulário inválido."); }
    const result = await mutate(db, user.id, body);
    return json(result);
  } catch (error) {
    if (error instanceof AppError) return json({ error: error.message }, error.status);
    // Never log a submitted body, patient data, or raw storage exception.
    console.error("CogMetrics storage operation failed.");
    return json({ error: "Não foi possível concluir a operação. Preserve seu formulário e atualize os dados antes de tentar novamente." }, 503);
  }
}
