-- Add premium challenge support and banner tracking

-- Add isPremiumChallenge column to challenges table
ALTER TABLE "challenges" ADD COLUMN "is_premium_challenge" boolean DEFAULT false NOT NULL;

-- Create challenge banner dismissals table
CREATE TABLE IF NOT EXISTS "challenge_banner_dismissals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"challenge_id" integer NOT NULL,
	"dismissed_at" timestamp DEFAULT now() NOT NULL
);

-- Create user sessions table for tracking app usage
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"last_activity" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "challenge_banner_dismissals" ADD CONSTRAINT "challenge_banner_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "challenge_banner_dismissals" ADD CONSTRAINT "challenge_banner_dismissals_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_challenge_banner_dismissals_user_challenge" ON "challenge_banner_dismissals" ("user_id", "challenge_id");
CREATE INDEX IF NOT EXISTS "idx_user_sessions_user_activity" ON "user_sessions" ("user_id", "last_activity");
CREATE INDEX IF NOT EXISTS "idx_challenges_premium_public" ON "challenges" ("is_premium_challenge", "is_public", "start_date", "end_date");