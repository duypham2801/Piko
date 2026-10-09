CREATE TYPE "public"."decision_session_source" AS ENUM('decision', 'preset', 'draft');--> statement-breakpoint
CREATE TABLE "decision_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" "decision_session_source" NOT NULL,
	"decision_id" uuid,
	"preset_slug" text,
	"title" text NOT NULL,
	"options" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "decision_sessions" ADD CONSTRAINT "decision_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_sessions" ADD CONSTRAINT "decision_sessions_decision_id_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."decisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "decision_sessions_user_id_created_at_idx" ON "decision_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "decision_sessions_decision_id_idx" ON "decision_sessions" USING btree ("decision_id");