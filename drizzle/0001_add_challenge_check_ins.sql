-- Add challenge_check_ins table for daily progress tracking
CREATE TABLE IF NOT EXISTS "challenge_check_ins" (
	"id" serial PRIMARY KEY NOT NULL,
	"challenge_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"date" timestamp NOT NULL,
	"goal_met" boolean NOT NULL,
	"value" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "challenge_check_ins" ADD CONSTRAINT "challenge_check_ins_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "challenge_check_ins" ADD CONSTRAINT "challenge_check_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS "challenge_check_ins_challenge_user_idx" ON "challenge_check_ins" ("challenge_id", "user_id");
CREATE INDEX IF NOT EXISTS "challenge_check_ins_date_idx" ON "challenge_check_ins" ("date");
