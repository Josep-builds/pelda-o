import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { EntryCard, type Entry } from "@/components/EntryCard";

export default async function Historial() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/");
  }

  const { data: entries } = await supabase
    .from("entries")
    .select("id, type, fields, verification, created_at")
    .eq("owner_id", data.user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (
    <main className="flex min-h-screen flex-1 flex-col gap-6 bg-[#FFF8F0] px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Mi historial</h1>
        <SignOutButton />
      </header>

      <div className="flex flex-col gap-4">
        {(entries as Entry[] | null)?.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}

        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/historial/agregar"
            className="flex items-center justify-center rounded-2xl border-2 border-dashed border-[#1E3A5F]/20 py-10 text-center text-base font-medium text-[#1E3A5F]"
          >
            + Agregar trabajo
          </Link>
          <Link
            href="/historial/pedir-verificacion"
            className="flex items-center justify-center rounded-2xl border-2 border-dashed border-[#1E3A5F]/20 py-10 text-center text-base font-medium text-[#1E3A5F]"
          >
            Pedir verificación
          </Link>
        </div>
      </div>
    </main>
  );
}
