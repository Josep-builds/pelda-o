import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createPlatformHistoryEntrySchema } from "@/lib/entries/schema";
import { createPlatformHistoryEntry } from "@/lib/entries/service";

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

  const { fields, evidencePath, replacesId } = parsed.data;

  const result = await createPlatformHistoryEntry(
    supabase,
    user.id,
    fields,
    evidencePath,
    replacesId ?? null
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ id: result.id });
}
