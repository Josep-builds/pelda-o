import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { createShareLinkSchema } from "@/lib/shares/schema";
import { createShareLink, listShareLinks } from "@/lib/shares/service";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createShareLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Elige al menos una entrada." }, { status: 400 });
  }

  const result = await createShareLink(supabase, user.id, parsed.data.entryIds, parsed.data.expiry);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const path = `/v/${result.rawToken}`;
  const origin = request.nextUrl.origin;
  const qrDataUrl = await QRCode.toDataURL(`${origin}${path}`);

  return NextResponse.json({ path, qrDataUrl, sharedCount: result.sharedCount });
}

export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const links = await listShareLinks(supabase, user.id);
  return NextResponse.json({ links });
}
