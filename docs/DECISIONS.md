# DECISIONS

## 2026-10-05 — F2: Add past work from a screenshot (Gemini extraction)

- Upload goes straight from the browser to Supabase Storage (`evidence/<owner_id>/<uuid>.<ext>`), not through our server — keeps large images off the Next.js/Vercel request-body path entirely. The server only ever receives the storage **path** and downloads the bytes itself (server-to-server, no body-size limit concern) before calling Gemini.
- Image type/size is enforced three times: client-side before upload (fast UX), bucket-level via `storage.buckets.file_size_limit` / `allowed_mime_types` (new migration `0002_evidence_bucket_limits.sql` — needs to be run in Supabase SQL editor), and again server-side in `/api/entries/extract` (defense in depth, since a client could call Supabase Storage directly and skip our form).
- Gemini call uses `@google/genai`'s `responseSchema` (not just a prompt instruction) to force structured JSON output; model id defaults to `gemini-2.0-flash`, overridable via `GEMINI_MODEL`.
- Three fallback layers, matching the hard rule that the LLM must never invent a value: (1) no `GEMINI_API_KEY` → `SIMULADO` tag with invented sample data; (2) Gemini call throws → same `SIMULADO` fallback; (3) Gemini responds but the JSON fails Zod validation → empty fields with an `extractionFailed` flag, UI shows "complete los campos a mano" instead of the AI-read tag.
- `period_start`/`period_end` are kept as free text (not parsed dates) — screenshots show periods like "mar 2024", and strict date parsing would reject valid reads for no benefit here.
- `/historial` now lists entries (`status = 'active'`, newest first) and the `+ Agregar trabajo` card links to the new flow.

**Needs before testing:** run `supabase/migrations/0002_evidence_bucket_limits.sql` in the Supabase SQL editor (bucket-level size/type limits weren't set in the F1 migration).

## 2026-10-05 — Deploy 1

- Live at **https://pelda-o.vercel.app**. Google login confirmed working there (Supabase Auth → URL Configuration has both the Vercel URL and `localhost:3000` redirect URIs registered).

## 2026-10-05 — F1: Scaffold + Google login + DB

- Scaffolded Next.js 16 (App Router, TypeScript, Tailwind v4) via `create-next-app` directly in the repo root.
- Next.js 16 renamed `middleware.ts` to `proxy.ts` (same mechanics, new name/export). Session-refresh logic lives in `lib/supabase/proxy.ts` (`updateSession`), wired from the required root-level `proxy.ts`. Anyone touching auth later should know to look for `proxy.ts`, not `middleware.ts`.
- `/historial` is guarded twice: the proxy redirects unauthenticated requests before the page renders, and the page itself re-checks `supabase.auth.getUser()` and redirects — per the Next 16 docs' explicit warning that a future matcher change could silently remove proxy coverage.
- Auth flow: `LoginButton` (client) calls `signInWithOAuth({ provider: "google" })` with `redirectTo` pointing at `/auth/callback?redirectTo=<original path>`; the callback route exchanges the code for a session and redirects onward.
- `profiles` row is auto-created via a Postgres trigger (`handle_new_user`) on `auth.users` insert, so there's no separate "create profile" step in the app.
- Storage bucket `evidence` uses path-based ownership (`evidence/<owner_id>/<file>`) checked via `storage.foldername(name)[1] = auth.uid()`, enforced entirely through RLS policies, not application code.
- All SQL lives in `supabase/migrations/0001_init.sql` — pasted into the Supabase SQL editor manually (no Supabase CLI link set up yet).

**Bug found and fixed:** after Google login, `/historial` loaded blank in Safari and stayed blank on refresh — worked fine in Chrome. Root cause: `/auth/callback` exchanged the code for a session (which Supabase writes as several chunked cookies, `sb-<ref>-auth-token.0`, `.1`, ...) and then issued an HTTP 307 redirect to `/historial` in the same response. Safari does not reliably commit `Set-Cookie` headers that ride along on a 3xx response carrying a `Location` header, especially when there are several of them (chunked session cookie) right after a cross-site OAuth bounce through Google — so the very next request arrived with no session, and the proxy bounced it back to `/`. Chrome commits those same headers without issue, which is why it worked there. Fix: `app/auth/callback/route.ts` now returns a 200 HTML response (`<meta http-equiv="refresh">`) instead of a 3xx redirect, so Safari gets a normal (non-redirect) response to persist every cookie chunk on before the client-side navigation to `/historial` fires as a fresh request.

**Next session's first move:** once the user confirms Google sign-in + empty `/historial` works end-to-end in Safari (and ideally on Vercel), start F2 — screenshot upload to the `evidence` bucket, Gemini extraction route, and the AI-read confirm screen.
