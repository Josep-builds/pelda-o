import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAttestationRequestSchema } from "@/lib/attestations/schema";
import { createAttestationRequest } from "@/lib/attestations/service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createAttestationRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Escribe de qué trabajo se trata." }, { status: 400 });
  }

  const { rawToken } = await createAttestationRequest(supabase, user.id, parsed.data.context);

  return NextResponse.json({ path: `/atestiguar/${rawToken}` });
}
