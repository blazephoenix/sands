CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`world_id` text NOT NULL,
	`session_id` text,
	`template_id` text,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`key_facts` text NOT NULL,
	`data_json` text NOT NULL,
	`source` text NOT NULL,
	`source_turn` integer,
	`status` text NOT NULL,
	`jev_flags` text NOT NULL,
	`seen_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`world_id`) REFERENCES `worlds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "entries_kind" CHECK("entries"."kind" in ('location', 'character', 'npc', 'faction', 'clue', 'object', 'exit_condition', 'knowledge', 'decisive_action')),
	CONSTRAINT "entries_source" CHECK("entries"."source" in ('author', 'setup', 'play')),
	CONSTRAINT "entries_status" CHECK("entries"."status" in ('locked', 'proposed', 'accepted', 'edited', 'rejected')),
	CONSTRAINT "entries_source_turn" CHECK(("entries"."source" = 'play') = ("entries"."source_turn" is not null)),
	CONSTRAINT "entries_template_in_session" CHECK("entries"."session_id" is not null or "entries"."template_id" is null)
);
--> statement-breakpoint
CREATE INDEX `entries_world_session` ON `entries` (`world_id`,`session_id`);--> statement-breakpoint
CREATE INDEX `entries_session` ON `entries` (`session_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`world_id` text NOT NULL,
	`mode` text NOT NULL,
	`seed` integer NOT NULL,
	`ending` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`world_id`) REFERENCES `worlds`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "sessions_mode" CHECK("sessions"."mode" in ('harness', 'baseline')),
	CONSTRAINT "sessions_ending" CHECK("sessions"."ending" in ('none', 'win', 'death', 'removed'))
);
--> statement-breakpoint
CREATE INDEX `sessions_world` ON `sessions` (`world_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `turns` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`idx` integer NOT NULL,
	`player_input` text,
	`passage` text NOT NULL,
	`flagged` integer NOT NULL,
	`log_json` text NOT NULL,
	`state_json` text NOT NULL,
	`background_status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "turns_idx" CHECK("turns"."idx" >= 0),
	CONSTRAINT "turns_opening_input" CHECK(("turns"."idx" = 0) = ("turns"."player_input" is null)),
	CONSTRAINT "turns_background_status" CHECK("turns"."background_status" in ('pending', 'done', 'failed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `turns_session_idx` ON `turns` (`session_id`,`idx`);--> statement-breakpoint
CREATE TABLE `worlds` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`brief_doc` text NOT NULL,
	`brief_json` text,
	`setup_status` text NOT NULL,
	`solvability_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "worlds_setup_status" CHECK("worlds"."setup_status" in ('draft', 'drafting', 'review', 'ready')),
	CONSTRAINT "worlds_brief_past_draft" CHECK("worlds"."setup_status" = 'draft' or "worlds"."brief_json" is not null)
);
