ALTER TABLE "turns" ADD COLUMN "known" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "turns" ADD COLUMN "glossary" jsonb DEFAULT '[]'::jsonb NOT NULL;