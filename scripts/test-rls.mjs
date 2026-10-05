// Creates two throwaway accounts, proves account B cannot read or modify
// account A's rows through the anon-key client (RLS), then deletes both
// accounts. Needs .env.local with NEXT_PUBLIC_SUPABASE_URL,
// NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.
//
// Run with: node --env-file=.env.local scripts/test-rls.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceRoleKey) {
  console.error(
    "Missing env vars. Run as: node --env-file=.env.local scripts/test-rls.mjs"
  );
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function randomEmail(label) {
  return `peldano-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

let failures = 0;
function check(label, condition) {
  if (condition) {
    console.log(`PASS: ${label}`);
  } else {
    console.error(`FAIL: ${label}`);
    failures += 1;
  }
}

async function createTestUser(label) {
  const email = randomEmail(label);
  const password = "test-password-" + Math.random().toString(36).slice(2);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;

  const client = createClient(url, anonKey);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { id: data.user.id, client };
}

async function main() {
  const a = await createTestUser("a");
  const b = await createTestUser("b");

  try {
    const { data: inserted, error: insertError } = await a.client
      .from("entries")
      .insert({
        owner_id: a.id,
        type: "platform_history",
        verification: "ai_read_self_confirmed",
        fields: { platform: "Test" },
      })
      .select("id")
      .single();

    check("account A can insert its own entry", !insertError && !!inserted);

    const { data: bSelect, error: bSelectError } = await b.client
      .from("entries")
      .select("id")
      .eq("id", inserted.id);

    check(
      "account B's SELECT for account A's entry returns no rows (RLS)",
      !bSelectError && (bSelect?.length ?? 0) === 0
    );

    const { data: bUpdate, error: bUpdateError } = await b.client
      .from("entries")
      .update({ status: "hidden" })
      .eq("id", inserted.id)
      .select("id");

    check(
      "account B's UPDATE on account A's entry affects zero rows (RLS)",
      !bUpdateError && (bUpdate?.length ?? 0) === 0
    );

    const { data: aSelect, error: aSelectError } = await a.client
      .from("entries")
      .select("id, status")
      .eq("id", inserted.id)
      .single();

    check(
      "account A's own entry is unaffected and still active",
      !aSelectError && aSelect?.status === "active"
    );

    const { data: bAttestationInsert, error: bAttestationError } = await b.client
      .from("entries")
      .insert({
        owner_id: a.id,
        type: "observer_attestation",
        verification: "observer_attested",
        observer_id: b.id,
        fields: {},
      })
      .select("id");

    check(
      "account B cannot insert an entry with owner_id = account A (RLS)",
      !!bAttestationError && (bAttestationInsert?.length ?? 0) === 0
    );
  } finally {
    await admin.auth.admin.deleteUser(a.id);
    await admin.auth.admin.deleteUser(b.id);
  }

  console.log(failures === 0 ? "\nALL RLS TESTS PASSED" : `\n${failures} RLS TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("Script error:", error);
  process.exit(1);
});
