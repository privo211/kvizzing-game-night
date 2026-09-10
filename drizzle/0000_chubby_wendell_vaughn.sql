CREATE TABLE IF NOT EXISTS `games` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mode` text NOT NULL,
	`players` text NOT NULL,
	`status` text NOT NULL,
	`current` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`source` text DEFAULT 'fresh' NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_games_user_created` ON `games` (`user_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_games_active_user` ON `games` (`user_id`) WHERE "games"."status" IN ('generating','playing');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `history` (
	`user_id` text NOT NULL,
	`answer_key` text NOT NULL,
	`question_id` text NOT NULL,
	`prompt` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `answer_key`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `questions` (
	`id` text PRIMARY KEY NOT NULL,
	`game_id` text NOT NULL,
	`position` integer NOT NULL,
	`data` text NOT NULL,
	`hints` integer DEFAULT 0 NOT NULL,
	`revealed` integer DEFAULT 0 NOT NULL,
	`guesses` text DEFAULT '{}' NOT NULL,
	`grades` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_questions_game_position` ON `questions` (`game_id`,`position`);