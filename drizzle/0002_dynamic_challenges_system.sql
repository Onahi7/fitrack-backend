CREATE TABLE IF NOT EXISTS "challenge_daily_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"challengeId" integer NOT NULL,
	"taskType" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"targetValue" integer,
	"targetUnit" varchar(50),
	"exerciseType" varchar(100),
	"mealType" varchar(100),
	"fastingType" varchar(100),
	"isRequired" boolean DEFAULT false NOT NULL,
	"points" integer DEFAULT 10 NOT NULL,
	"dayOfChallenge" integer,
	"taskDate" date,
	"isActive" boolean DEFAULT true NOT NULL,
	"totalParticipants" integer DEFAULT 0 NOT NULL,
	"completedCount" integer DEFAULT 0 NOT NULL,
	"engagementRate" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "challenge_task_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"challengeId" integer NOT NULL,
	"taskId" integer NOT NULL,
	"actualValue" integer,
	"notes" text,
	"points" integer DEFAULT 0 NOT NULL,
	"isCompleted" boolean DEFAULT false NOT NULL,
	"completedDate" timestamp DEFAULT now() NOT NULL,
	"completionTime" timestamp,
	"timeSpent" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "challenge_banner_dismissals" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"challengeId" integer NOT NULL,
	"dismissedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"sessionStart" timestamp DEFAULT now() NOT NULL,
	"lastActivity" timestamp DEFAULT now() NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "isPremiumChallenge" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "requiresSubscription" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "subscriptionTier" varchar(50);--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "gift30Days" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "hasDynamicTasks" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "challenge_daily_tasks" ADD CONSTRAINT "challenge_daily_tasks_challengeId_challenges_id_fk" FOREIGN KEY ("challengeId") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "challenge_task_completions" ADD CONSTRAINT "challenge_task_completions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "challenge_task_completions" ADD CONSTRAINT "challenge_task_completions_challengeId_challenges_id_fk" FOREIGN KEY ("challengeId") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "challenge_task_completions" ADD CONSTRAINT "challenge_task_completions_taskId_challenge_daily_tasks_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."challenge_daily_tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "challenge_banner_dismissals" ADD CONSTRAINT "challenge_banner_dismissals_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "challenge_banner_dismissals" ADD CONSTRAINT "challenge_banner_dismissals_challengeId_challenges_id_fk" FOREIGN KEY ("challengeId") REFERENCES "public"."challenges"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_challenge_task_completion" ON "challenge_task_completions" USING btree ("userId","challengeId","taskId");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "unique_user_challenge_dismissal" ON "challenge_banner_dismissals" USING btree ("userId","challengeId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_idx" ON "user_sessions" USING btree ("userId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_is_active_idx" ON "user_sessions" USING btree ("isActive");