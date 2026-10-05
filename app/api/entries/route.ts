import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPlatformHistoryEntrySchema } from "@/lib/entries/schema";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createPlatformHistoryEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Revisa los campos, alguno no es válido." },
      { status: 400 }
    );
  }

  const { fields, evidencePath } = parsed.data;

  const { data: entry, error } = await supabase
    .from("entries")
    .insert({
      owner_id: user.id,
      type: "platform_history",
      verification: "ai_read_self_confirmed",
      fields: { ...fields, evidence_path: evidencePath },
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to insert entry:", error);
    return NextResponse.json(
      { error: "No se pudo guardar. Intenta de nuevo." },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: entry.id });
}
