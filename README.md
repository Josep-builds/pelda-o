# Peldaño

Tu trabajo ya cuenta. Un historial de trabajo informal, verificado por quienes vieron el trabajo, que el trabajador guarda y comparte por su cuenta.

See `docs/PACKET.md` for the product spec and `docs/IMPLEMENTATION_PROMPT.md` for the build plan.

## Desarrollo local

```bash
npm install
npm run dev
```

Requires `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
```

## Base de datos

Run `supabase/migrations/0001_init.sql` in the Supabase SQL editor to create the schema, RLS policies, and the private `evidence` storage bucket.
