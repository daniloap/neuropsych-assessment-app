import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import type { SQLInputValue } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { api } from "../lib/api.ts";
import { AppError, normalCDF, qualityOf, syntheticPercentile, validateRaw, ageAt } from "../lib/domain.ts";
import type { Workspace, Result } from "../lib/domain.ts";
import { commit } from "../lib/store.ts";
import type { Database, Statement } from "../lib/store.ts";

class SQLiteStatement implements Statement {
  db: DatabaseSync; sql: string; values: SQLInputValue[];
  constructor(db: DatabaseSync, sql: string, values: SQLInputValue[] = []) { this.db = db; this.sql = sql; this.values = values; }
  bind(...values: unknown[]) { return new SQLiteStatement(this.db, this.sql, values as SQLInputValue[]); }
  async first<T>() { return (this.db.prepare(this.sql).get(...this.values) as T) ?? null; }
  async all<T>() { return { results: this.db.prepare(this.sql).all(...this.values) as T[] }; }
  async run() { const r = this.db.prepare(this.sql).run(...this.values); return { meta: { changes: Number(r.changes) } }; }
}
class SQLiteDB implements Database {
  raw = new DatabaseSync(":memory:");
  constructor() {
    this.raw.exec("PRAGMA foreign_keys = ON");
    for (const file of readdirSync(new URL("../drizzle/", import.meta.url)).filter(n => n.endsWith(".sql")).sort())
      this.raw.exec(readFileSync(new URL("../drizzle/" + file, import.meta.url), "utf8"));
  }
  prepare(sql: string) { return new SQLiteStatement(this.raw, sql); }
  async batch(statements: Statement[]) {
    this.raw.exec("BEGIN");
    try {
      const results = [];
      for (const s of statements) {
        const q = s as SQLiteStatement;
        const rows = await q.all<Record<string, unknown>>();
        const changes = this.raw.prepare("SELECT changes() AS n").get()!.n;
        results.push({ results: rows.results, meta: { changes: Number(changes) } });
      }
      this.raw.exec("COMMIT"); return results;
    } catch (e) { this.raw.exec("ROLLBACK"); throw e; }
  }
}
function request(path: string, owner = "alice", body?: unknown, overrides: Record<string, string> = {}) {
  return new Request("https://cogmetrics.test" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: { "oai-authenticated-user-id": owner, "oai-authenticated-user-email": owner + "@example.test",
      origin: "https://cogmetrics.test", "x-cogmetrics-client": "workspace", "content-type": "application/json", ...overrides },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
async function workspace(db: Database, owner = "alice"): Promise<Workspace> {
  const response = await api(request("/api/workspace", owner), db); assert.equal(response.status, 200);
  return (await response.json()).workspace;
}
async function mutation(db: Database, action: string, data: unknown, owner = "alice", revision?: number) {
  const rev = revision ?? (await workspace(db, owner)).revision;
  return api(request("/api/mutations", owner, { action, data, revision: rev }), db);
}
async function ok(response: Response) {
  const data = await response.json(); assert.equal(response.status, 200, JSON.stringify(data)); return data;
}
test("authenticated API, same-origin writes, unavailable storage and tenant isolation", async () => {
  const db = new SQLiteDB();
  assert.equal((await api(new Request("https://cogmetrics.test/api/workspace"), db)).status, 401);
  assert.equal((await api(request("/api/workspace"), undefined)).status, 503);
  const alice = await workspace(db), bob = await workspace(db, "bob");
  assert.equal(alice.patients.length, 8); assert.equal(bob.patients.length, 8);
  assert.ok(!bob.patients.some(b => alice.patients.some(a => a.id === b.id)));
  assert.equal((await mutation(db, "patient.update", { ...alice.patients[0] }, "bob")).status, 404);
  assert.equal((await api(request("/api/reports/" + alice.reports[0].id + "/export", "bob"), db)).status, 404);
  assert.equal((await api(request("/api/mutations", "alice", { revision: 1, action: "patient.create", data: {} }, { origin: "https://evil.test" }), db)).status, 403);
  assert.equal((await workspace(db)).patients.length, 8, "initialization must be idempotent");
  db.raw.close();
});
test("patient → assessment → result → report review → final version; all persist across requests", async () => {
  const db = new SQLiteDB();
  const p = await ok(await mutation(db, "patient.create", { name: "Pessoa Sintética", birthDate: "1980-06-02", education: 16,
    occupation: "Exemplo", referral: "Exemplo de demanda fictícia", history: "História sintética revisada para o teste.",
    functioning: "Funcionalidade sintética revisada no teste." }));
  let w = await workspace(db);
  assert.equal(w.patients.length, 9); assert.equal(w.patients.find(x => x.id === p.id)!.name, "Pessoa Sintética");
  const a = await ok(await mutation(db, "assessment.create", { patientId: p.id, title: "Avaliação de demonstração",
    startDate: "2026-01-01", dueDate: "2026-12-01", priority: "normal", plan: ["CM-DEMO"] }));
  w = await workspace(db);
  const assessment = w.assessments.find(x => x.id === a.id)!;
  assert.equal((await mutation(db, "assessment.stage", { id: a.id, stage: "aplicacao" })).status, 400, "unreviewed anamnesis blocks progression");
  await ok(await mutation(db, "assessment.update", { ...assessment, anamnesisReviewed: true }));
  await ok(await mutation(db, "assessment.stage", { id: a.id, stage: "aplicacao" }));
  await ok(await mutation(db, "result.save", { assessmentId: a.id, instrumentCode: "CM-DEMO", raw: { total: 50 }, excluded: false, percentile: 99 }));
  w = await workspace(db); const result = w.results.find(x => x.assessmentId === a.id)!;
  assert.equal(result.percentile, 50, "server must ignore client percentile for the simulator");
  assert.equal((await mutation(db, "result.save", { assessmentId: a.id, instrumentCode: "CM-DEMO", raw: { total: 101 }, excluded: false })).status, 400);
  await ok(await mutation(db, "assessment.stage", { id: a.id, stage: "integracao" }));
  const report = await ok(await mutation(db, "report.create", { assessmentId: a.id }));
  const content = { id: report.id, integration: "Integração sintética suficientemente detalhada para verificar o fluxo de revisão.", recommendations: "Revisar as informações sintéticas deste exemplo." };
  await ok(await mutation(db, "report.review", content));
  await ok(await mutation(db, "report.finalize", { ...content, reviewConfirmed: true }));
  w = await workspace(db); assert.equal(w.assessments.find(x => x.id === a.id)!.stage, "concluida");
  assert.equal(w.reports.find(x => x.id === report.id)!.version, 3);
  assert.equal((await mutation(db, "result.save", { assessmentId: a.id, instrumentCode: "CM-DEMO", raw: { total: 30 }, excluded: false })).status, 409);
  const savedV3 = w.reports.find(x => x.id === report.id)!.snapshot;
  await ok(await mutation(db, "report.reopen", { id: report.id }));
  await ok(await mutation(db, "result.save", { assessmentId: a.id, instrumentCode: "CM-DEMO", raw: { total: 35 }, excluded: false }));
  const history = await ok(await api(request("/api/reports/" + report.id + "/versions"), db));
  assert.deepEqual(history.versions.find((v: { version: number }) => v.version === 3).snapshot, savedV3);
  const exported = await api(request("/api/reports/" + report.id + "/export?version=3"), db);
  assert.equal(exported.status, 200); const html = await exported.text(); assert.ok(html.includes("50 pontos")); assert.ok(html.includes("Sem validade clínica"));
  assert.ok((await workspace(db)).auditTotal > 10);
  db.raw.close();
});
test("atomic stale-write guard and rollback prevent partial writes or unlogged changes", async () => {
  const db = new SQLiteDB(); const w = await workspace(db);
  const p = w.patients[0];
  await ok(await mutation(db, "patient.update", { ...p, occupation: "Mudança vencedora" }, "alice", w.revision));
  assert.equal((await mutation(db, "patient.update", { ...p, occupation: "Mudança vencida" }, "alice", w.revision)).status, 409);
  // Exercise the database guard directly, including a write after it.
  await assert.rejects(commit(db, "alice", w.revision,
    [db.prepare("UPDATE patients SET occupation = ? WHERE owner_id = ? AND id = ?").bind("NÃO SALVAR", "alice", p.id)],
    "test.stale", p.id, "Não deve existir"), AppError);
  const after = await workspace(db);
  assert.equal(after.patients.find(x => x.id === p.id)!.occupation, "Mudança vencedora");
  assert.equal(after.revision, w.revision + 1); assert.equal(after.auditTotal, w.auditTotal + 1);
  await assert.rejects(commit(db, "alice", after.revision, [db.prepare("INSERT INTO patients (id) VALUES (?)").bind("invalid")], "test.fail", "invalid", "Não deve existir"));
  assert.equal((await workspace(db)).revision, after.revision, "a failed mutation must roll back its revision");
  db.raw.close();
});
test("quality boundaries, paired discrepancy, zeros, synthetic transformation and input validation", () => {
  const make = (code: string, acertos: number, omissoes = 0, erros = 0): Result => ({ id: code, assessmentId: "one", instrumentCode: code, raw: { acertos, omissoes, erros }, percentile: null, notes: "", excluded: 0, exclusionReason: "", createdAt: "", updatedAt: "" });
  assert.equal(qualityOf(make("TDS", 50, 5, 5), []).valid, true);
  assert.equal(qualityOf(make("TDS", 50, 6), []).valid, false);
  assert.equal(qualityOf(make("TBVP", 50, 20, 5), []).valid, true);
  assert.equal(qualityOf(make("TBVN", 50, 0, 6), []).valid, false);
  const a = make("TDS", 60), b = make("TSD", 30), c = make("TSD", 29);
  assert.equal(qualityOf(a, [a, b]).valid, true);
  assert.equal(qualityOf(a, [a, c]).valid, false);
  assert.equal(qualityOf(c, [a, c]).valid, false);
  assert.equal(qualityOf(make("TDS", 0), [make("TDS", 0), b]).valid, false);
  assert.equal(qualityOf(a, [{ ...c, assessmentId: "another" }]).valid, true, "pairing must never cross assessments");
  assert.ok(Math.abs(normalCDF(0) - 0.5) < 0.000001); assert.equal(syntheticPercentile(50), 50); assert.equal(syntheticPercentile(65), 84);
  assert.throws(() => validateRaw("CM-DEMO", { total: "" })); assert.throws(() => validateRaw("CM-DEMO", { total: 1.5 }));
  assert.throws(() => validateRaw("CM-DEMO", { total: 15, unexpected: 2 }));
  assert.equal(ageAt("1991-09-22", "2026-09-08"), 34); assert.equal(ageAt("1991-09-22", "2026-09-22"), 35);
});
test("schedule collisions, invalid dates, report staleness and HTML escaping", async () => {
  const db = new SQLiteDB(); let w = await workspace(db);
  const s = w.appointments[0];
  assert.equal((await mutation(db, "appointment.create", { ...s })).status, 400);
  assert.equal((await mutation(db, "patient.create", { name: "Data impossível", birthDate: "2000-02-30", education: 10, referral: "Exemplo sintético" })).status, 400);
  const r = w.reports.find(x => x.status === "revisao")!, p = w.patients.find(x => x.id === r.snapshot.patient.id)!;
  await ok(await mutation(db, "patient.update", { ...p, name: "<script>alert(1)</script>" }));
  assert.equal((await mutation(db, "report.finalize", { id: r.id, integration: r.snapshot.integration, recommendations: r.snapshot.recommendations, reviewConfirmed: true })).status, 400);
  await ok(await mutation(db, "report.review", { id: r.id, integration: r.snapshot.integration, recommendations: r.snapshot.recommendations }));
  const html = await (await api(request("/api/reports/" + r.id + "/export"), db)).text();
  assert.ok(html.includes("&lt;script&gt;")); assert.ok(!html.includes("<script>"));
  w = await workspace(db); assert.equal(w.reports.find(x => x.id === r.id)!.status, "revisao");
  db.raw.close();
});
