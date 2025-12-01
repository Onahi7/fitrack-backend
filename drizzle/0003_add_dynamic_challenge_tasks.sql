-- Add dynamic challenge tasks and subscription requirements

-- Add new columns to challenges table
ALTER TABLE "challenges" ADD COLUMN "requires_subscription" boolean DEFAULT false NOT NULL;
ALTER TABLE "challenges" ADD COLUMN "subscription_tier" text;
ALTER TABLE "challenges" ADD COLUMN "gift_30_days" boolean DEFAULT false NOT NULL;
ALTER TABLE "challenges" ADD COLUMN "has_dynamic_tasks" boolean DEFAULT false NOT NULL;

-- Create challenge daily tasks table
CREATE TABLE IF NOT EXISTS "challenge_daily_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"challenge_id" integer NOT NULL,
	"task_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_value" integer,
	"target_unit" text,
	"exercise_type" text,
	"meal_type" text,
	"fasting_type" text,
	"is_required" boolean DEFAULT true NOT NULL,
	"points" integer DEFAULT 1 NOT NULL,
	"day_of_challenge" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create challenge task completions table
CREATE TABLE IF NOT EXISTS "challenge_task_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"challenge_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"task_id" integer NOT NULL,
	"completed_date" timestamp NOT NULL,
	"actual_value" integer,
	"notes" text,
	"points" integer DEFAULT 0 NOT NULL,
	"is_completed" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "challenge_daily_tasks" ADD CONSTRAINT "challenge_daily_tasks_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "challenge_task_completions" ADD CONSTRAINT "challenge_task_completions_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "challenge_task_completions" ADD CONSTRAINT "challenge_task_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "challenge_task_completions" ADD CONSTRAINT "challenge_task_completions_task_id_challenge_daily_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "challenge_daily_tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_challenge_daily_tasks_challenge_day" ON "challenge_daily_tasks" ("challenge_id", "day_of_challenge", "is_active");
CREATE INDEX IF NOT EXISTS "idx_challenge_task_completions_user_date" ON "challenge_task_completions" ("challenge_id", "user_id", "completed_date");
CREATE INDEX IF NOT EXISTS "idx_challenges_subscription" ON "challenges" ("requires_subscription", "subscription_tier");

-- Add subscription expiry to users table if not exists
DO $$ BEGIN
    ALTER TABLE "users" ADD COLUMN "subscription_expires_at" timestamp;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;