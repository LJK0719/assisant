CREATE TABLE IF NOT EXISTS "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" text NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"scheduled_time" timestamp,
	"is_fixed_time" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_adjusted_at" timestamp DEFAULT now() NOT NULL,
	"deadline" timestamp,
	"estimated_duration" integer,
	"is_required" boolean DEFAULT true NOT NULL
);
