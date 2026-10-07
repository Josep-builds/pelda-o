# DECISIONS

## 2026-10-07 — Decision: demo recorded with SIMULADO, Gemini access is account-blocked

Confirmed root cause of bug #1 (Gemini always falling back to SIMULADO): the Google account **josep.builds** is blocked at the account level for Gemini API generation calls, not at the project level. Tested two separate Google Cloud projects' API keys (the original one, and a fresh key created in a brand-new project, "peldano-ia") — both return the identical error on every current model:

```json
{
  "error": {
    "code": 403,
    "message": "Your project has been denied access. Please contact support.",
    "status": "PERMISSION_DENIED"
  }
}
```

Both keys' `GET /v1beta/models` (list models) call succeeds with 200 — only `generateContent` (the actual inference call) is denied. Since a brand-new project under the same account hit the exact same block, this rules out a one-off project-level flag and points at the account itself. Not fixable from this repo; needs either Google support (the error message says so directly) or a Gemini API key from a different Google account.

**Decision:** record the demo using the SIMULADO fallback path rather than block on Google resolving this. The app already does this correctly and visibly — every SIMULADO-sourced field is labeled, never silently presented as a real AI read (see the 2026-10-06 entry below, bug #2's fix: `lib/entries/labels.ts#platformHistoryTag()` shows "SIMULADO · dato de ejemplo" on the saved entry, in `/historial`, `/historial/exportar`, and the public `/v/[token]` page). This is the intended degraded-mode behavior per PACKET's hard rule ("If Gemini fails or there is no key, return a simulated result labeled SIMULADO"), not a workaround — the demo will show the fallback working as designed, not a broken feature.

## 2026-10-06 — Bugs found in manual testing on production (iPad, full flow)

User ran the complete flow end to end on `https://pelda-o.vercel.app` from an iPad. Found 8 issues. All fixed except #1, which isn't a code problem.

1. **Gemini still shows SIMULADO in production.** Re-ran `scripts/test-gemini.mjs` against the real key — same result as the earlier diagnosis: 403 `PERMISSION_DENIED` ("Your project has been denied access. Please contact support.") on every current model (`gemini-flash-latest`, `gemini-3.8-flash`, etc.), while listing models still returns 200. Confirmed unchanged since the last check — this remains a Google Cloud account-level block, not something fixable in this repo. No code change made for this one; see the earlier entry below for the full diagnosis.
2. **A SIMULADO or manually-filled entry was tagged "Leído por IA · confirmado por mí" once saved.** `verification` only ever stores `ai_read_self_confirmed` for these entries regardless of how the data actually got there (the worker did confirm the fields either way, so the DB-level distinction between "real AI read," "SIMULADO," and "typed by hand" was never captured anywhere past the upload screen). Fixed by threading a `source: "gemini" | "simulado" | "manual"` value through from extraction into the saved `fields` jsonb, and adding `lib/entries/labels.ts#platformHistoryTag()` as the single place that decides what tag to show based on it — `SIMULADO · dato de ejemplo` or `Capturado a mano` instead of implying a real AI read happened. This matters most on `/v/[token]`: showing a verifier "AI-read, confirmed" over invented demo data would be actively dishonest, not just a cosmetic label bug.
3. **`/historial/exportar` showed raw DB codes** (`observer_attested`, `ai_read_self_confirmed`) instead of Spanish labels. Now uses the same `lib/entries/labels.ts` helpers as everywhere else.
4. **Dimension labels on the public `/v/[token]` page were raw object keys** (`precision`, lowercase, no accent) instead of the Spanish labels used on `/historial`. `DIMENSION_LABELS` was previously only defined inside `EntryCard.tsx`; moved to `lib/entries/labels.ts` so both places read from the same source instead of two copies silently drifting apart (which is exactly what had already happened here).
5. **Dates showed in UTC** — a verification signed the night of Oct 5 displayed as Oct 6. `/v/[token]`'s `formatDate` called `toLocaleDateString` with no `timeZone`, so it used the server's (Vercel's, i.e. UTC) local time instead of the reader's. Fixed by passing `timeZone: "America/Mexico_City"` explicitly rather than relying on the runtime's default — the right fix regardless of which region Vercel happens to run the function in.
6. **"1 entradas"** on the share-links list in `/historial/compartir` — always plural regardless of count. Added a small `pluralize()` helper in `lib/entries/labels.ts` and used it there.
7. **The observer rubric started with every dimension preselected at 3/5.** A rushed supervisor could submit without actually rating anything, which defeats the entire point of the rubric (and of Condition 4 — the record would say "evaluated" when nothing was actually judged). Changed `AttestationForm` so every score starts unselected (`null`) and the submit handler now explicitly checks every dimension has a chosen score before allowing submission, with a specific Spanish error naming which dimension is missing. Applied the same fix to "¿Lo volverías a contratar?", which had the same defect (defaulted to "sí") for the same reason, even though it wasn't explicitly called out.

**Also noted (config, not code):** observer login was redirecting to `localhost` instead of the production domain — caused by Supabase Auth's Redirect URLs / Site URL config, not anything in this repo. Fixed by the user directly in the Supabase dashboard: added `https://pelda-o.vercel.app/**` (wildcard) to Redirect URLs and updated Site URL. Worth remembering if a custom domain is added later — both would need updating again.

## 2026-10-06 — Bug: Gemini extraction fell back to SIMULADO in production

Production (`https://pelda-o.vercel.app`) showed "SIMULADO" on every screenshot upload even though `GEMINI_API_KEY` was set in Vercel. Diagnosed with a new script, `scripts/test-gemini.mjs`, which calls the Gemini REST endpoint directly (bypassing the SDK) so the real error is visible — it prints only the key's length and first 3 characters, never the key itself. Run with `node --env-file=.env.local scripts/test-gemini.mjs` (optionally `GEMINI_MODEL=<id>` to try a specific model).

Two separate things were wrong:

1. **Real code bug, fixed:** `lib/gemini.ts` hardcoded `DEFAULT_MODEL = "gemini-2.0-flash"`. Google has retired that model — every call 404'd with `"This model models/gemini-2.0-flash is no longer available"`, which `extractPlatformHistoryFromImage`'s catch block correctly treated as a failure and fell back to SIMULADO (the fallback itself worked exactly as designed). Fixed by switching the default to the `gemini-flash-latest` alias instead of a pinned version id, so Google retiring a specific version again doesn't silently break extraction the same way. `GEMINI_MODEL` env var still overrides it if needed.
2. **Not a code problem — needs the user's action with Google:** even after pointing at a current, listed model, the exact same API key gets `403 PERMISSION_DENIED — "Your project has been denied access. Please contact support."` from Google on **every** current flash model (`gemini-2.5-flash`, `gemini-3.5-flash`, `gemini-3.1-flash-lite`, `gemini-flash-latest`, `gemini-3.8-flash`, all tried directly against the REST API with this exact key). Listing models (`GET /v1beta/models`) works fine and returns 200 with 61 models — only the actual `generateContent` (inference) call is blocked. This points to the underlying Google Cloud project behind this AI Studio key being denied access at the account level (billing/review/policy), not anything in our code or the key's format — the key's unusual `AQ.` prefix (vs. the more familiar `AIzaSy...`) turned out to be a red herring; auth itself was never rejected, only the inference call was. **The app will keep showing SIMULADO in production until this is resolved on Google's side** (AI Studio / Cloud Console → billing or support) — that part isn't fixable from this repo. The SIMULADO fallback working correctly in the meantime is correct, intended behavior per PACKET's hard rule, not a bug to route around.

## 2026-10-05 — F3, F4, F5: observer attestation, sharing, export/hardening

Built F3 through F5 back to back without waiting for in-between confirmation (explicit user request, to move faster). No browser available in this environment, so verification was: `tsc --noEmit`, `next lint`, `next build` after every feature, plus two standalone terminal scripts that exercise the real production code paths without needing a browser session. Full two-Google-account testing (observer attestation, share verification) still needs the user, listed in the final checklist.

**F3 — observer attestation + Ed25519 signing**
- New `lib/crypto/ed25519.ts`: signs/verifies over a canonical JSON payload using Node's built-in `crypto` (no extra dependency). Keys are generated once via `scripts/generate-keys.mjs` and stored as base64-encoded PEM in env vars (`ED25519_PRIVATE_KEY_B64`, `ED25519_PUBLIC_KEY_B64`) — base64 keeps a multi-line PEM on one line, which both `.env.local` and Vercel's env var UI need.
- `lib/attestations/payload.ts`'s `canonicalStringify` recursively sorts object keys before signing, so the exact same logical content always produces the exact same bytes regardless of key insertion order — required for a signature written today to still verify after a read next year.
- Verified the whole crypto path with `scripts/test-ed25519.mjs` (throwaway keypair, no env needed): sign→verify round-trip, determinism across differently-ordered-but-equal objects, a tampered payload failing verification, and a correct payload failing against the wrong public key. All four passed — this is the exact logic F4's "change one byte → firma inválida" acceptance test depends on.
- The attestation request token is only ever stored hashed (`sha256`, matching the pattern already used for the F1 schema's `token_hash` columns); the raw token lives only in the URL.
- Reused-token races are closed with an atomic claim: `UPDATE attestation_requests SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL`, so if two submissions for the same token land concurrently, only one UPDATE can match the still-null row. The self-attestation check runs on a cheap read *before* that claim, so a worker who accidentally opens their own link doesn't burn the token.
- The actual DB write (insert into `entries`, mark the token used) runs through the **service-role** client (`lib/supabase/admin.ts`), because the observer is never the row's owner — RLS would otherwise block it by design. The observer's identity still comes from their own cookie session, read before reaching for the admin client.

**F4 — share links, QR verifier, revoke, hide/replace**
- `/v/[token]` (public, no login) re-verifies every observer-attested entry's signature *on every view* — it doesn't trust the `verification` column, it recomputes `canonicalStringify(fields)` and checks it against the stored signature with the public key. `platform_history` entries were never signed, so they show no firma badge, only their AI-read tag.
- Entries are re-filtered by `status = 'active'` at share-view time (not just at share-creation time), so hiding an entry after sharing it correctly drops it from a link that already includes its id.
- "Replace" reuses the existing agregar-work flow via `?replaces=<id>`: the new entry is inserted with `replaces_id` set, then the old entry's status flips to `replaced` — two sequential owner-scoped writes, not one transaction. Acceptable for this scope; a crash between the two would leave both entries active rather than corrupting anything.
- Revoking requires no service-role access (the owner updates their own `share_links` row under normal RLS); reading someone else's share for verification does.

**F5 — signed export, account deletion, hardening**
- **Bug found and fixed during this pass:** `entries.observer_id` had no `ON DELETE` behavior (Postgres default `NO ACTION`). Deleting an `auth.users` row for anyone who had ever attested someone *else's* work would fail with a foreign-key violation — i.e. "Borrar mi cuenta" was silently broken for every observer, not just for workers. Fixed in `supabase/migrations/0003_fix_observer_fk_on_delete.sql`: `ON DELETE SET NULL`. The signed entry's own `fields.observer_id` (inside the hashed, signed payload) still preserves who attested it even after this column goes null.
- Account deletion removes the user's `evidence/<uid>/*` storage objects first (storage isn't foreign-keyed to `auth.users`, so it wouldn't cascade), then calls `admin.auth.admin.deleteUser(uid)` — every other table (`profiles`, `entries`, `attestation_requests`, `share_links`) cascades automatically via the FKs already in `0001_init.sql`.
- Export returns every entry regardless of `status` (including hidden/replaced) — it's the worker's own backup of everything, not a public share, so nothing is held back from him.
- Zod coverage check: every route that accepts a body (`/api/entries`, `/api/entries/extract`, `/api/entries/[id]`, `/api/attestations`, `/api/attestations/[token]`, `/api/shares`) validates it with a Zod schema before touching the database.
- `scripts/test-rls.mjs` creates two throwaway Supabase accounts (service-role `admin.createUser`, then signs each in for a real anon-key session) and proves, through the actual anon-key client — not a privileged one — that account B's `SELECT`/`UPDATE`/forged-`INSERT` against account A's row all return zero rows, then deletes both accounts. This needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` to run, which isn't set yet in this environment — written and ready, not yet executed. Run with `node --env-file=.env.local scripts/test-rls.mjs`.
- `git log -p | grep -iE "key|secret"` and a second pass for actual key-material patterns (`AIza...`, `sk-ant-...`, JWT headers, `BEGIN ... PRIVATE KEY`) both came back clean — every hit was a variable/prop named `key`, never a value. `.env.local` was also confirmed never committed (`git log --all --full-history -- .env.local` returns nothing).

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

**Next session's first move:** F1-F5 are all built, committed, and pushed. Waiting on the user's manual setup steps (new env vars, SQL migrations, Vercel redeploy) and browser testing — see the checklist at the end of the F3/F4/F5 session entry above. Once that's confirmed working, F6 is the persona test (PACKET §11) — run it, find the worst hesitation, fix it, redeploy.
