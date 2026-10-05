import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractPlatformHistoryFromImage } from "@/lib/gemini";
import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  MAX_EVIDENCE_FILE_BYTES,
  extractRequestSchema,
} from "@/lib/entries/schema";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsedBody = extractRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const { path } = parsedBody.data;
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from("evidence")
    .download(path);

  if (downloadError || !blob) {
    return NextResponse.json(
      { error: "No encontramos la imagen. Intenta subirla de nuevo." },
      { status: 404 }
    );
  }

  const mimeType = blob.type || "application/octet-stream";
  if (!ALLOWED_EVIDENCE_MIME_TYPES.includes(mimeType as never)) {
    await supabase.storage.from("evidence").remove([path]);
    return NextResponse.json(
      { error: "Solo se permiten imágenes JPG, PNG o WEBP." },
      { status: 400 }
    );
  }
  if (blob.size > MAX_EVIDENCE_FILE_BYTES) {
    await supabase.storage.from("evidence").remove([path]);
    return NextResponse.json(
      { error: "El archivo es muy grande. El máximo es 5 MB." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await blob.arrayBuffer());
  const result = await extractPlatformHistoryFromImage(buffer, mimeType);

  return NextResponse.json({ ...result, evidencePath: path });
}
