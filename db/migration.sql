CREATE TABLE IF NOT EXISTS "games" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"mode" text NOT NULL,
	"players" text NOT NULL,
	"status" text NOT NULL,
	"current" integer DEFAULT 0 NOT NULL,
	"created_at" bigint NOT NULL,
	"source" text DEFAULT 'fresh' NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_games_user_created" ON "games" ("user_id","created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_games_active_user" ON "games" ("user_id") WHERE "games"."status" IN ('generating','playing');
CREATE TABLE IF NOT EXISTS "history" (
	"user_id" text NOT NULL,
	"answer_key" text NOT NULL,
	"question_id" text NOT NULL,
	"prompt" text NOT NULL,
	"created_at" bigint NOT NULL,
	PRIMARY KEY("user_id", "answer_key")
);

CREATE TABLE IF NOT EXISTS "questions" (
	"id" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"position" integer NOT NULL,
	"data" text NOT NULL,
	"hints" integer DEFAULT 0 NOT NULL,
	"revealed" integer DEFAULT 0 NOT NULL,
	"guesses" text DEFAULT '{}' NOT NULL,
	"grades" text DEFAULT '{}' NOT NULL,
	FOREIGN KEY ("game_id") REFERENCES "games"("id") ON UPDATE no action ON DELETE no action
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_questions_game_position" ON "questions" ("game_id","position");
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE,password_hash TEXT NOT NULL,created_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),expires_at BIGINT NOT NULL);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS auth_limits (key TEXT PRIMARY KEY,attempts BIGINT NOT NULL,"window" BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS ai_budget (day TEXT PRIMARY KEY,reserved BIGINT NOT NULL DEFAULT 0);
