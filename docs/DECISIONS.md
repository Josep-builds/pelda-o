# DECISIONS

## 2026-10-05 — F1: Scaffold + Google login + DB

- Scaffolded Next.js 16 (App Router, TypeScript, Tailwind v4) via `create-next-app` directly in the repo root.
- Next.js 16 renamed `middleware.ts` to `proxy.ts` (same mechanics, new name/export). Session-refresh logic lives in `lib/supabase/proxy.ts` (`updateSession`), wired from the required root-level `proxy.ts`. Anyone touching auth later should know to look for `proxy.ts`, not `middleware.ts`.
- `/historial` is guarded twice: the proxy redirects unauthenticated requests before the page renders, and the page itself re-checks `supabase.auth.getUser()` and redirects — per the Next 16 docs' explicit warning that a future matcher change could silently remove proxy coverage.
- Auth flow: `LoginButton` (client) calls `signInWithOAuth({ provider: "google" })` with `redirectTo` pointing at `/auth/callback?redirectTo=<original path>`; the callback route exchanges the code for a session and redirects onward.
- `profiles` row is auto-created via a Postgres trigger (`handle_new_user`) on `auth.users` insert, so there's no separate "create profile" step in the app.
- Storage bucket `evidence` uses path-based ownership (`evidence/<owner_id>/<file>`) checked via `storage.foldername(name)[1] = auth.uid()`, enforced entirely through RLS policies, not application code.
- All SQL lives in `supabase/migrations/0001_init.sql` — pasted into the Supabase SQL editor manually (no Supabase CLI link set up yet).

**Bugs found:** none yet — mechanical test pass for F1 is just sign-in/sign-out/redirect behavior, deferred to the user testing in a real browser against the real Supabase project (OAuth can't be exercised from this environment).

**Next session's first move:** once the user confirms Google sign-in + empty `/historial` works end-to-end on Vercel, start F2 — screenshot upload to the `evidence` bucket, Gemini extraction route, and the AI-read confirm screen.
