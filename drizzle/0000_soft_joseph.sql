CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`assessment_id` text NOT NULL,
	`starts_at` text NOT NULL,
	`duration` integer NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`notes` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `workspaces`(`owner_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_appointments_owner_start` ON `appointments` (`owner_id`,`starts_at`);--> statement-breakpoint
CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`title` text NOT NULL,
	`stage` text NOT NULL,
	`priority` text NOT NULL,
	`start_date` text NOT NULL,
	`due_date` text NOT NULL,
	`plan` text NOT NULL,
	`anamnesis_reviewed` integer DEFAULT 0 NOT NULL,
	`notes` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `workspaces`(`owner_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_assessments_owner_patient` ON `assessments` (`owner_id`,`patient_id`);--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_id` text NOT NULL,
	`summary` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `workspaces`(`owner_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_owner_date` ON `audit` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `patients` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`birth_date` text NOT NULL,
	`education` integer NOT NULL,
	`occupation` text NOT NULL,
	`referral` text NOT NULL,
	`history` text NOT NULL,
	`functioning` text NOT NULL,
	`notes` text NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `workspaces`(`owner_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_patients_owner_name` ON `patients` (`owner_id`,`name`);--> statement-breakpoint
CREATE TABLE `report_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`report_id` text NOT NULL,
	`version` integer NOT NULL,
	`status` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `workspaces`(`owner_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_report_versions_owner_report_version` ON `report_versions` (`owner_id`,`report_id`,`version`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`assessment_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text NOT NULL,
	`version` integer NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `workspaces`(`owner_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reports_owner_assessment` ON `reports` (`owner_id`,`assessment_id`);--> statement-breakpoint
CREATE TABLE `results` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`assessment_id` text NOT NULL,
	`instrument_code` text NOT NULL,
	`raw` text NOT NULL,
	`percentile` integer,
	`notes` text NOT NULL,
	`excluded` integer DEFAULT 0 NOT NULL,
	`exclusion_reason` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `workspaces`(`owner_id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assessment_id`) REFERENCES `assessments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_results_owner_assessment_instrument` ON `results` (`owner_id`,`assessment_id`,`instrument_code`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL
);
