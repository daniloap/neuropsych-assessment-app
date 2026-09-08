import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

// Migrations own the schema. Runtime initialization only inserts synthetic examples.
export const workspaces = sqliteTable("workspaces", {
  ownerId: text("owner_id").primaryKey(), revision: integer("revision").notNull().default(1), createdAt: text("created_at").notNull(),
});
export const patients = sqliteTable("patients", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull().references(() => workspaces.ownerId),
  name: text("name").notNull(), birthDate: text("birth_date").notNull(), education: integer("education").notNull(),
  occupation: text("occupation").notNull(), referral: text("referral").notNull(),
  history: text("history").notNull(), functioning: text("functioning").notNull(), notes: text("notes").notNull(),
  archived: integer("archived").notNull().default(0), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (t) => [index("idx_patients_owner_name").on(t.ownerId, t.name)]);
export const assessments = sqliteTable("assessments", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull().references(() => workspaces.ownerId),
  patientId: text("patient_id").notNull().references(() => patients.id), title: text("title").notNull(),
  stage: text("stage").notNull(), priority: text("priority").notNull(), startDate: text("start_date").notNull(),
  dueDate: text("due_date").notNull(), plan: text("plan").notNull(), anamnesisReviewed: integer("anamnesis_reviewed").notNull().default(0),
  notes: text("notes").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (t) => [index("idx_assessments_owner_patient").on(t.ownerId, t.patientId)]);
export const results = sqliteTable("results", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull().references(() => workspaces.ownerId),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id), instrumentCode: text("instrument_code").notNull(),
  raw: text("raw").notNull(), percentile: integer("percentile"), notes: text("notes").notNull(),
  excluded: integer("excluded").notNull().default(0), exclusionReason: text("exclusion_reason").notNull(),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (t) => [uniqueIndex("idx_results_owner_assessment_instrument").on(t.ownerId, t.assessmentId, t.instrumentCode)]);
export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull().references(() => workspaces.ownerId),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id), title: text("title").notNull(),
  status: text("status").notNull(), version: integer("version").notNull(), snapshot: text("snapshot").notNull(),
  createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (t) => [uniqueIndex("idx_reports_owner_assessment").on(t.ownerId, t.assessmentId)]);
export const reportVersions = sqliteTable("report_versions", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull().references(() => workspaces.ownerId),
  reportId: text("report_id").notNull().references(() => reports.id), version: integer("version").notNull(),
  status: text("status").notNull(), snapshot: text("snapshot").notNull(), createdAt: text("created_at").notNull(),
}, (t) => [uniqueIndex("idx_report_versions_owner_report_version").on(t.ownerId, t.reportId, t.version)]);
export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull().references(() => workspaces.ownerId),
  assessmentId: text("assessment_id").notNull().references(() => assessments.id), startsAt: text("starts_at").notNull(),
  duration: integer("duration").notNull(), kind: text("kind").notNull(), status: text("status").notNull(),
  notes: text("notes").notNull(), createdAt: text("created_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (t) => [index("idx_appointments_owner_start").on(t.ownerId, t.startsAt)]);
export const audit = sqliteTable("audit", {
  id: text("id").primaryKey(), ownerId: text("owner_id").notNull().references(() => workspaces.ownerId),
  action: text("action").notNull(), entityId: text("entity_id").notNull(), summary: text("summary").notNull(), createdAt: text("created_at").notNull(),
}, (t) => [index("idx_audit_owner_date").on(t.ownerId, t.createdAt)]);
