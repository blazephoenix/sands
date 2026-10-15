CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"world_id" text NOT NULL,
	"skeleton" jsonb NOT NULL,
	"ending" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "turns" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"idx" integer NOT NULL,
	"player_input" text,
	"passage" text NOT NULL,
	"choices" jsonb NOT NULL,
	"ending" jsonb,
	"log" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "turns_idx" CHECK ("turns"."idx" >= 0),
	CONSTRAINT "turns_opening_input" CHECK (("turns"."idx" = 0) = ("turns"."player_input" is null))
);
--> statement-breakpoint
CREATE TABLE "worlds" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"skeleton_doc" jsonb NOT NULL,
	"skeleton" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_world_id_worlds_id_fk" FOREIGN KEY ("world_id") REFERENCES "public"."worlds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turns" ADD CONSTRAINT "turns_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_world" ON "sessions" USING btree ("world_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "turns_session_idx" ON "turns" USING btree ("session_id","idx");