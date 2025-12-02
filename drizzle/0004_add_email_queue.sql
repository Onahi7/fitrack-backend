CREATE TABLE IF NOT EXISTS "email_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient" text NOT NULL,
	"recipient_name" text,
	"recipient_user_id" text,
	"subject" text NOT NULL,
	"email_type" text NOT NULL,
	"template_data" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 5,
	"scheduled_for" timestamp,
	"sent_at" timestamp,
	"failed_at" timestamp,
	"error" text,
	"retry_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "email_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"queue_id" integer,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"email_type" text NOT NULL,
	"status" text NOT NULL,
	"provider" text DEFAULT 'resend',
	"provider_id" text,
	"metadata" jsonb,
	"sent_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_queue_id_email_queue_id_fk" FOREIGN KEY ("queue_id") REFERENCES "email_queue"("id") ON DELETE no action ON UPDATE no action;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_email_queue_status" ON "email_queue" ("status");
CREATE INDEX IF NOT EXISTS "idx_email_queue_scheduled" ON "email_queue" ("scheduled_for");
CREATE INDEX IF NOT EXISTS "idx_email_queue_recipient" ON "email_queue" ("recipient");
CREATE INDEX IF NOT EXISTS "idx_email_logs_email_type" ON "email_logs" ("email_type");
CREATE INDEX IF NOT EXISTS "idx_email_logs_sent_at" ON "email_logs" ("sent_at");
