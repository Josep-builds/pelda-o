import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Storage objects aren't foreign-keyed to auth.users, so they survive a
  // cascading delete unless removed explicitly, first.
  const { data: files } = await admin.storage.from("evidence").list(user.id);
  if (files && files.length > 0) {
    await admin.storage
      .from("evidence")
      .remove(files.map((f) => `${user.id}/${f.name}`));
  }

  // profiles/entries/attestation_requests/share_links all reference
  // auth.users(id) on delete cascade, so deleting the auth user removes
  // every row this account owns in one step.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: "No se pudo borrar la cuenta." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
