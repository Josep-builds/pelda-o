import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ShareForm } from "@/components/ShareForm";

export default async function Compartir() {
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Compartir con un empleador</h1>
        <Link href="/historial" className="text-sm font-medium text-[#1E3A5F] underline-offset-2 hover:underline">
          Volver
        </Link>
      </div>

      <ShareForm entries={entries ?? []} />
    </main>
  );
}
