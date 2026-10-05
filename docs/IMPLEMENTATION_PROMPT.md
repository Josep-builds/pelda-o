# IMPLEMENTATION PROMPT — Peldaño (Week 9)

You are my coding agent. Read `docs/PACKET.md` first; it is the source of truth. Build it feature by feature, in order. **One feature = one commit.** After each feature: run it locally, check every acceptance criterion, tell me what to test in the browser, then commit and push. Don't start the next feature until I confirm.

## Hard rules

- **Stack (free only):** Next.js (App Router, TypeScript) + Tailwind, Supabase (`@supabase/ssr`, Auth with Google, Postgres with RLS, private Storage), Gemini via `@google/genai` (model name read from env `GEMINI_MODEL`, default to the current free-tier Flash model), Zod, `qrcode`, Node `crypto` Ed25519. Deploy on Vercel.
- **Secrets:** only in `.env.local` locally and in Vercel env vars. Never hardcode, print or commit them. `.gitignore` already covers `.env*`. Server-only keys never get the `NEXT_PUBLIC_` prefix.
  - Already in `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.
  - When you need `SUPABASE_SERVICE_ROLE_KEY` or the signing keys, tell me exactly what to add. Generate the Ed25519 keypair with a local script and show me where to paste it, **but do not commit it**.
- **Security floor:** auth on every page with personal data. RLS on every table. Zod on every input (lengths, types, 1–5 integers, images only, ≤ 5 MB). LLM output is schema-validated before saving. User text is passed to the LLM only as quoted data.
- **UI in Spanish (Mexico)**, mobile-first, large readable type, plain words for a 22-year-old delivery rider.
- **Labels:** every AI-read field shows *"Leído por IA — confírmalo"*. If Gemini fails or there is no key, return a simulated result labeled *"SIMULADO"*.
- **Demo data:** invented only, shown as *"DATOS DE EJEMPLO"*. No real people.
- **Forbidden zone:** no CV builder and no job board. The LLM never writes prose about the worker, never improves claims, and never infers skills. It only extracts fields from a document he uploaded, or drafts a rubric the observer confirms.
- **Shadow clause:** no aggregate score anywhere (UI, API or DB). Per-dimension values only, never averaged.
- **Session close:** at the end of each session, update `docs/DECISIONS.md` (decisions + tomorrow's first move), then commit and push.

## Features

### F1 — Scaffold + Google login + DB → DEPLOY 1

- Next.js app in the repo root. Supabase client helpers for server and browser, plus middleware for session refresh.
- `/` landing with "Entrar con Google". `/auth/callback` route. `/historial` is protected and redirects to `/` when logged out.
- SQL migration in `supabase/migrations/` creating `profiles`, `entries`, `attestation_requests` and `share_links` exactly as in PACKET §9, with RLS policies (owner-only). Give me the SQL to paste into the Supabase SQL editor.
- Private storage bucket `evidence` with owner-only policies.
- **Acceptance:** I log in with Google and see my empty `/historial`. Logged out, `/historial` redirects. Vercel deploy works with env vars set (walk me through Vercel import + env + adding the Vercel URL to Supabase Auth → URL Configuration).
- Commit: `feat: scaffold, google auth, schema with RLS`

### F2 — Add past work from a screenshot (LLM extraction)

- `/historial/agregar`: upload an image (jpg/png/webp, ≤ 5 MB) to the `evidence` bucket.
- A server route sends it to Gemini with a strict JSON schema: `platform`, `role`, `period_start`, `period_end`, `deliveries_count`, `on_time_pct`, `rating`, `hours`. All nullable. Never invent values.
- A review screen shows the fields as editable inputs, each tagged *"Leído por IA — confírmalo"*. On save: entry `type=platform_history`, `verification=ai_read_self_confirmed`.
- **Acceptance:** an invented sample screenshot gives sensible fields. A 10 MB file or a PDF is rejected with a Spanish message. Malformed LLM JSON falls back to manual entry. The SIMULADO path works without a key.
- Commit: `feat: screenshot upload with AI field extraction`

### F3 — Observer attestation + Ed25519 signing

- The worker creates an attestation request with a context line (e.g., "Conteo de inventario, 3 sep"). The server stores the **hash** of a random token, expiring in 72 h. The UI gives a `wa.me` share link with a prefilled Spanish message and the URL `/atestiguar/[token]`.
- The observer opens the link and signs in with Google. Block it if the observer is the same user as the worker.
- 5-dimension rubric: Puntualidad, Precisión, Ritmo, Trato, Seguimiento de instrucciones. Each is 1–5 with a required note of ≤ 140 characters, plus "¿Lo volverías a contratar? Sí / No / Depende".
- The server validates the token (unused, unexpired), builds a canonical JSON payload, signs it with Ed25519, and stores the entry (`type=observer_attestation`, `verification=observer_attested`, `observer_id`, `signature`, `signed_payload_hash`). It marks the token used, using the service role **on the server only**.
- **Acceptance:** the full flow works with two Google accounts. A reused, expired or self-attestation token is rejected. The entry shows a green *"Verificado por quien lo vio"* tag.
- Commit: `feat: observer attestation with signed entries`

### F4 — Share, verify, revoke, hide/replace

- The worker picks entries, sets an expiry (24 h / 7 d / 30 d), and gets a link and QR (`/v/[token]`, token stored hashed).
- The public `/v/[token]` page (no login) reads through a server route. It shows only the chosen, active entries, each with its verification tag and **"Firma válida ✓"** or **"Firma inválida ✗"** (re-verified on every view), plus who attested and when.
- States: revoked → *"Enlace revocado"*. Expired → *"Enlace vencido"*.
- The worker can revoke any link. He can hide an entry, or replace it with a retake (`replaces_id`; the old one becomes `replaced` and drops out of new shares).
- **Acceptance:** sharing 1 of 3 entries shows exactly 1. Editing one byte of the payload in the DB shows "Firma inválida". Revoke and expiry work. Hidden entries don't show.
- Commit: `feat: expiring share links, QR verifier, revoke and replace`

### F5 — Export + hardening → DEPLOY 2

- "Descargar mi historial": a signed JSON (entries + signatures + public key) and a simple printable page/PDF. The record survives without the platform.
- "Borrar mi cuenta" route (deletes his rows and files).
- Review the Zod coverage. Test RLS: account B cannot read account A's rows (show me how to test).
- Run `git log -p | grep -iE "key|secret"` and confirm it's clean.
- **Acceptance:** all the mechanical tests in PACKET §11 pass. Log at least one bug found and fixed in DECISIONS.md.
- Commit: `feat: signed export, account deletion, hardening`, then redeploy.

### F6 — Persona-test fix → DEPLOY 3

- I'll run the persona test (PACKET §11) and give you the worst confusion. Fix it.
- Commit: `fix: persona test — <issue>`, then redeploy.

Start with F1. First, tell me in 5 lines what you'll create, then do it.
