import { AppError } from "./domain.ts";
import type { Workspace, Report, ReportVersion } from "./domain.ts";
import { exampleWorkspace } from "./seed.ts";

export interface Statement {
  bind(...values: unknown[]): Statement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta: { changes: number } }>;
}
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<{ results: Record<string, unknown>[]; meta: { changes: number } }[]>;
}
function snake(s: string) { return s.replace(/[A-Z]/g, c => "_" + c.toLowerCase()); }
export function decode<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (k === "owner_id") continue;
    out[k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = ["raw", "plan", "snapshot"].includes(k) ? JSON.parse(String(v)) : v;
  }
  return out as T;
}
export function insertRows(db: Database, table: string, rows: Record<string, unknown>[], ignore = false): Statement[] {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]);
  // Stay below the D1 binding limit, including the largest seed records.
  const size = Math.max(1, Math.floor(90 / keys.length)), statements: Statement[] = [];
  for (let i = 0; i < rows.length; i += size) {
    const part = rows.slice(i, i + size);
    statements.push(db.prepare("INSERT " + (ignore ? "OR IGNORE " : "") + "INTO " + table + " (" + keys.map(snake).join(",") + ") VALUES " +
      part.map(() => "(" + keys.map(() => "?").join(",") + ")").join(",")).bind(...part.flatMap(row => keys.map(k =>
        typeof row[k] === "object" && row[k] !== null ? JSON.stringify(row[k]) : row[k]))));
  }
  return statements;
}
export async function ensureWorkspace(db: Database, owner: string): Promise<void> {
  if (await db.prepare("SELECT revision FROM workspaces WHERE owner_id = ?").bind(owner).first()) return;
  const seed = await exampleWorkspace(owner);
  const statements = insertRows(db, "workspaces", [{ ownerId: owner, revision: 1, createdAt: new Date().toISOString() }], true);
  for (const table of ["patients", "assessments", "results", "reports", "appointments", "audit"] as const)
    statements.push(...insertRows(db, table, seed[table].map(row => ({ ...row, ownerId: owner })), true));
  statements.push(...insertRows(db, "report_versions", seed.reports.map(r => ({
    id: r.id + "-v1", ownerId: owner, reportId: r.id, version: 1, status: r.status, snapshot: r.snapshot, createdAt: r.createdAt,
  })), true));
  await db.batch(statements);
}
export async function readWorkspace(db: Database, owner: string): Promise<Workspace> {
  const data = await db.batch([
    db.prepare("SELECT revision FROM workspaces WHERE owner_id = ?").bind(owner),
    db.prepare("SELECT * FROM patients WHERE owner_id = ? ORDER BY name").bind(owner),
    db.prepare("SELECT * FROM assessments WHERE owner_id = ? ORDER BY created_at DESC").bind(owner),
    db.prepare("SELECT * FROM results WHERE owner_id = ? ORDER BY instrument_code").bind(owner),
    db.prepare("SELECT * FROM reports WHERE owner_id = ? ORDER BY updated_at DESC").bind(owner),
    db.prepare("SELECT * FROM appointments WHERE owner_id = ? ORDER BY starts_at").bind(owner),
    db.prepare("SELECT * FROM audit WHERE owner_id = ? ORDER BY created_at DESC, id DESC LIMIT 100").bind(owner),
    db.prepare("SELECT COUNT(*) AS count FROM audit WHERE owner_id = ?").bind(owner),
  ]);
  if (!data[0].results.length) throw new AppError("Ambiente ainda não inicializado. Recarregue a página.", 409);
  return { revision: Number(data[0].results[0].revision),
    patients: data[1].results.map(row => decode(row)), assessments: data[2].results.map(row => decode(row)),
    results: data[3].results.map(row => decode(row)), reports: data[4].results.map(row => decode(row)),
    appointments: data[5].results.map(row => decode(row)), audit: data[6].results.map(row => decode(row)),
    auditTotal: Number(data[7].results[0].count),
  };
}
export async function commit(db: Database, owner: string, revision: number, statements: Statement[], action: string, entityId: string, summary: string): Promise<void> {
  const stamp = new Date().toISOString();
  // A stale revision violates NOT NULL and rolls back the entire D1 batch.
  // This is an atomic compare-and-swap: no write can occur after a failed guard.
  const guard = db.prepare("UPDATE workspaces SET revision = CASE WHEN revision = ? THEN revision + 1 ELSE NULL END WHERE owner_id = ?").bind(revision, owner);
  try {
    await db.batch([guard, ...statements, ...insertRows(db, "audit", [{
      id: crypto.randomUUID(), ownerId: owner, action, entityId, summary, createdAt: stamp,
    }])]);
  } catch (err) {
    if (String(err).includes("workspaces.revision")) throw new AppError("Os dados mudaram em outra sessão. Atualize a página antes de salvar novamente; seu formulário continua aberto.", 409);
    throw err;
  }
}
export async function reportHistory(db: Database, owner: string, id: string): Promise<ReportVersion[]> {
  const report = await db.prepare("SELECT id FROM reports WHERE owner_id = ? AND id = ?").bind(owner, id).first();
  if (!report) throw new AppError("Documento não encontrado.", 404);
  const rows = await db.prepare("SELECT * FROM report_versions WHERE owner_id = ? AND report_id = ? ORDER BY version DESC").bind(owner, id).all();
  return rows.results.map(row => decode<ReportVersion>(row));
}
export async function readReport(db: Database, owner: string, id: string): Promise<Report> {
  const row = await db.prepare("SELECT * FROM reports WHERE owner_id = ? AND id = ?").bind(owner, id).first();
  if (!row) throw new AppError("Documento não encontrado.", 404);
  return decode<Report>(row);
}
