import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitAttestationSchema } from "@/lib/attestations/schema";
import { submitAttestation } from "@/lib/attestations/service";

const REASON_MESSAGES: Record<string, string> = {
  not_found: "Este enlace no es válido.",
  used: "Este enlace ya se usó.",
  expired: "Este enlace venció.",
  self: "No puedes verificar tu propio trabajo.",
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = submitAttestationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Revisa que cada punto tenga una calificación y una nota." },
      { status: 400 }
    );
  }

  const result = await submitAttestation({
    rawToken: token,
    observerId: user.id,
    dimensions: parsed.data.dimensions,
    notes: parsed.data.notes,
    rehire: parsed.data.rehire,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: REASON_MESSAGES[result.reason] ?? "No se pudo registrar." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
