import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPublicKeyPemBase64 } from "@/lib/crypto/ed25519";

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: entries, error } = await supabase
    .from("entries")
    .select("id, type, fields, verification, status, signature, signed_payload_hash, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "No se pudo generar el export." }, { status: 500 });
  }

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    owner: { id: user.id, displayName: profile?.display_name ?? null },
    publicKeyPemBase64: getPublicKeyPemBase64(),
    entries: entries ?? [],
  });
}
