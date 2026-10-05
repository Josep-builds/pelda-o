import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlatformHistoryFields } from "@/lib/entries/schema";

export async function hideEntry(supabase: SupabaseClient, ownerId: string, entryId: string) {
  const { error } = await supabase
    .from("entries")
    .update({ status: "hidden" })
    .eq("id", entryId)
    .eq("owner_id", ownerId);

  if (error) throw error;
}

export async function createPlatformHistoryEntry(
  supabase: SupabaseClient,
  ownerId: string,
  fields: PlatformHistoryFields,
  evidencePath: string | null,
  replacesId: string | null
) {
  if (replacesId) {
    // Defense in depth: confirm the entry being replaced is actually the
    // caller's own before touching it (RLS would block the update anyway,
    // but failing fast here keeps the error message meaningful).
    const { data: original, error: selectError } = await supabase
      .from("entries")
      .select("id")
      .eq("id", replacesId)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (selectError) throw selectError;
    if (!original) {
      return { error: "La entrada que intentas reemplazar no existe o no te pertenece." as const };
    }
  }

  const { data: entry, error: insertError } = await supabase
    .from("entries")
    .insert({
      owner_id: ownerId,
      type: "platform_history",
      verification: "ai_read_self_confirmed",
      fields: { ...fields, evidence_path: evidencePath },
      replaces_id: replacesId,
    })
    .select("id")
    .single();

  if (insertError || !entry) {
    throw insertError ?? new Error("Failed to insert entry");
  }

  if (replacesId) {
    const { error: updateError } = await supabase
      .from("entries")
      .update({ status: "replaced" })
      .eq("id", replacesId)
      .eq("owner_id", ownerId);
    if (updateError) throw updateError;
  }

  return { id: entry.id };
}
