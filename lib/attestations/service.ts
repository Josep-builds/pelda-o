import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { signPayload } from "@/lib/crypto/ed25519";
import {
  buildAttestationFields,
  canonicalStringify,
  type RehireAnswer,
  type RubricDimension,
} from "@/lib/attestations/payload";

const ATTESTATION_TTL_HOURS = 72;

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function createAttestationRequest(
  supabase: SupabaseClient,
  ownerId: string,
  context: string | null
) {
  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ATTESTATION_TTL_HOURS * 60 * 60 * 1000);

  const { error } = await supabase.from("attestation_requests").insert({
    token_hash: hashToken(rawToken),
    owner_id: ownerId,
    context,
    expires_at: expiresAt.toISOString(),
  });

  if (error) throw error;

  return { rawToken, expiresAt };
}

export type AttestationLookup =
  | { status: "not_found" }
  | { status: "used" }
  | { status: "expired" }
  | { status: "ok"; id: string; ownerId: string; context: string | null };

export async function lookupAttestationRequest(rawToken: string): Promise<AttestationLookup> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("attestation_requests")
    .select("id, owner_id, context, expires_at, used_at")
    .eq("token_hash", hashToken(rawToken))
    .maybeSingle();

  if (error || !data) return { status: "not_found" };
  if (data.used_at) return { status: "used" };
  if (new Date(data.expires_at) < new Date()) return { status: "expired" };

  return { status: "ok", id: data.id, ownerId: data.owner_id, context: data.context };
}

export type SubmitAttestationResult =
  | { ok: true; entryId: string }
  | { ok: false; reason: "not_found" | "used" | "expired" | "self" };

// Conditional UPDATE (used_at IS NULL) doubles as the atomic "claim" step:
// if two submissions race on the same token, only one UPDATE can match the
// still-null row, so only one of them proceeds to sign and insert.
async function claimAttestationRequest(rawToken: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("attestation_requests")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hashToken(rawToken))
    .is("used_at", null)
    .select("id, owner_id, context")
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function submitAttestation(params: {
  rawToken: string;
  observerId: string;
  dimensions: Record<RubricDimension, number>;
  notes: Record<RubricDimension, string>;
  rehire: RehireAnswer;
}): Promise<SubmitAttestationResult> {
  // Read-only check first so a self-attestation attempt or a stale link
  // doesn't burn the token — only an actual eligible submission should.
  const lookup = await lookupAttestationRequest(params.rawToken);
  if (lookup.status !== "ok") {
    return { ok: false, reason: lookup.status };
  }
  if (lookup.ownerId === params.observerId) {
    return { ok: false, reason: "self" };
  }

  const claimed = await claimAttestationRequest(params.rawToken);
  if (!claimed) {
    // Lost a race against another submission for the same token.
    return { ok: false, reason: "used" };
  }

  const fields = buildAttestationFields({
    owner_id: claimed.owner_id,
    observer_id: params.observerId,
    context: claimed.context,
    dimensions: params.dimensions,
    notes: params.notes,
    rehire: params.rehire,
    signed_at: new Date().toISOString(),
  });

  const canonicalPayload = canonicalStringify(fields);
  const signature = signPayload(canonicalPayload);
  const signedPayloadHash = createHash("sha256").update(canonicalPayload).digest("hex");

  const admin = createAdminClient();

  const { data: entry, error: insertError } = await admin
    .from("entries")
    .insert({
      owner_id: claimed.owner_id,
      type: "observer_attestation",
      verification: "observer_attested",
      observer_id: params.observerId,
      fields,
      signature,
      signed_payload_hash: signedPayloadHash,
    })
    .select("id")
    .single();

  if (insertError || !entry) {
    throw insertError ?? new Error("Failed to insert observer_attestation entry");
  }

  return { ok: true, entryId: entry.id };
}
