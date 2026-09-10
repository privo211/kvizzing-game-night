# KVizzing — Game Night

A fan-made, deduction-first general quiz: original questions, progressively stronger hints, explanations that connect the dots, and shared-screen friends or teams. Inspired by Kumar Varun's KVizzing, without affiliation or copied show questions.

## What works

- Username/password signup with scrypt password hashes, hashed session tokens, HttpOnly cookies, and login throttling.
- Eight open-ended questions per game, solo or 2–12 players/teams around one screen.
- Two hints reduce the question value from 10 to 7 to 4. Reveal, compare reasoning, and self-score full/half/zero points.
- Saved games, scorecards, and server-side per-account question history. All eight questions are reserved atomically before a pack is shown; quitting does not recycle unused questions.
- Answer/alias uniqueness plus prompt similarity checks. Future answers stay server-side. Group history belongs to the host account, not every guest.
- Sixteen individually sourced original starter questions (two full games per account). The UI labels starter packs. Exhaustion returns a clear message rather than repeating questions.
- Optional fresh generation through Vercel AI Gateway using a zero-price model. It checks the live model price before every request and refuses paid models. Wikipedia evidence is retrieved before drafting; a second editorial pass checks factual support and deduction quality. This path needs live verification after Gateway authentication is connected; AI review is not a guarantee of factual accuracy.

## Vercel setup

1. Import this GitHub repo as a Next.js project on Vercel Hobby.
2. Add **Neon, Free plan** from Vercel Marketplace and connect it to the project. Keep billing upgrades disabled. Vercel injects `DATABASE_URL`.
3. Run `vercel env pull .env.local`, then `npm run db:migrate` to create the schema. Migrations are additive and do not erase data.
4. AI Gateway uses the deployment's Vercel OIDC identity. No OpenAI API key, paid credits, auto top-up, or Cloudflare services are used. The selected model is `inclusionai/ling-3.0-flash-sante-free`; if it disappears, changes price, or hits a free quota, starter questions are used only while unseen questions remain.
5. Redeploy, then verify signup, game creation, resume, and a second non-overlapping game against production.

Vercel is the application host. Neon is the Vercel Marketplace database provider. The app never persists production accounts to an ephemeral Vercel filesystem.

## Local development

Node 22.13 or newer. `npm ci`, then `npm run dev` opens port 5173. Without `DATABASE_URL`, development uses SQLite at `.local/quiz.sqlite` and the sourced starter bank. Production requires Neon. Environment variables are described in `.env.example`; actual credentials and local data are ignored by Git.

`npm run build` · `npm run typecheck` · `npm run lint`

## MVP limits

Shared-screen play, not online multiplayer rooms. No email or password recovery yet: keep your password safe. There is a finite initial source-topic catalog; source and starter exhaustion stops rather than repeats. Free AI availability and quotas are outside the app's control. A fully unlimited, always-fresh quiz is not promised. Do not enable a paid plan as a workaround.

## Content and privacy

Original starter question wording, with direct source links shown after reveal. Generated questions cite the retrieved Wikipedia articles and should be reviewed before use in a competitive event. Account credentials, usernames, player names, and guesses are not sent to the model; only public source extracts and prior answer entities are used. Source material is treated as untrusted data. A feature-detected WebMCP interface exposes current visible quiz state and starting the configured quiz in supporting browsers.
