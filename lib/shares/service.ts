import { createHash, randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyPayload } from "@/lib/crypto/ed25519";
import { canonicalStringify } from "@/lib/attestations/payload";
import { SHARE_EXPIRY_HOURS } from "@/lib/shares/schema";

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function createShareLink(
  supabase: SupabaseClient,
  ownerId: string,
  entryIds: string[],
  expiry: keyof typeof SHARE_EXPIRY_HOURS
) {
  // Only the owner's own active entries can be shared — silently drops any
  // id that doesn't match instead of trusting the client's list wholesale.
  const { data: ownedEntries, error: selectError } = await supabase
    .from("entries")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("status", "active")
    .in("id", entryIds);

  if (selectError) throw selectError;

  const validIds = (ownedEntries ?? []).map((e) => e.id);
  if (validIds.length === 0) {
    return { error: "Ninguna de las entradas elegidas existe o te pertenece." as const };
  }

  const rawToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SHARE_EXPIRY_HOURS[expiry] * 60 * 60 * 1000);

  const { error: insertError } = await supabase.from("share_links").insert({
    token_hash: hashToken(rawToken),
    owner_id: ownerId,
    entry_ids: validIds,
    expires_at: expiresAt.toISOString(),
  });

  if (insertError) throw insertError;

  return { rawToken, expiresAt, sharedCount: validIds.length };
}

export async function listShareLinks(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await supabase
    .from("share_links")
    .select("id, entry_ids, expires_at, revoked_at, created_at")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function revokeShareLink(supabase: SupabaseClient, ownerId: string, id: string) {
  const { error } = await supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", ownerId);

  if (error) throw error;
}

type ShareEntry = {
  id: string;
  type: string;
  fields: Record<string, unknown>;
  verification: string;
  createdAt: string;
  observerName: string | null;
  signatureValid: boolean | null;
};

export type ShareView =
  | { status: "not_found" | "revoked" | "expired" }
  | { status: "ok"; ownerName: string | null; entries: ShareEntry[] };

export async function getShareView(rawToken: string): Promise<ShareView> {
  const admin = createAdminClient();

  const { data: share, error } = await admin
    .from("share_links")
    .select("owner_id, entry_ids, expires_at, revoked_at")
    .eq("token_hash", hashToken(rawToken))
    .maybeSingle();

  if (error || !share) return { status: "not_found" };
  if (share.revoked_at) return { status: "revoked" };
  if (new Date(share.expires_at) < new Date()) return { status: "expired" };

  const { data: entries, error: entriesError } = await admin
    .from("entries")
    .select("id, type, fields, verification, observer_id, signature, created_at")
    .in("id", share.entry_ids)
    .eq("owner_id", share.owner_id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (entriesError) throw entriesError;

  const { data: ownerProfile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", share.owner_id)
    .maybeSingle();

  const observerIds = [...new Set((entries ?? []).map((e) => e.observer_id).filter(Boolean))];
  const observerNames = new Map<string, string | null>();
  if (observerIds.length > 0) {
    const { data: observerProfiles } = await admin
      .from("profiles")
      .select("id, display_name")
      .in("id", observerIds);
    for (const p of observerProfiles ?? []) observerNames.set(p.id, p.display_name);
  }

  const resultEntries: ShareEntry[] = (entries ?? []).map((entry) => {
    let signatureValid: boolean | null = null;
    if (entry.type === "observer_attestation" && entry.signature) {
      const canonicalPayload = canonicalStringify(entry.fields);
      signatureValid = verifyPayload(canonicalPayload, entry.signature);
    }
    return {
      id: entry.id,
      type: entry.type,
      fields: entry.fields,
      verification: entry.verification,
      createdAt: entry.created_at,
      observerName: entry.observer_id ? observerNames.get(entry.observer_id) ?? null : null,
      signatureValid,
    };
  });

  return { status: "ok", ownerName: ownerProfile?.display_name ?? null, entries: resultEntries };
}
