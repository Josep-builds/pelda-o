import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExportActions } from "@/components/ExportActions";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";

export default async function Exportar() {
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
    <main className="flex min-h-screen flex-1 flex-col gap-6 bg-[#FFF8F0] px-6 py-10 print:bg-white">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Mi historial (completo)</h1>
        <Link href="/historial" className="text-sm font-medium text-[#1E3A5F] underline-offset-2 hover:underline">
          Volver
        </Link>
      </div>

      <ExportActions />

      <div className="flex flex-col gap-3">
        {(entries ?? []).map((entry) => (
          <div key={entry.id} className="rounded-xl border border-[#1E3A5F]/15 bg-white p-4 print:border-black">
            <p className="text-base font-medium text-[#1E3A5F]">
              {entry.type === "observer_attestation"
                ? (entry.fields as Record<string, unknown>).context as string
                : [
                    (entry.fields as Record<string, unknown>).role,
                    (entry.fields as Record<string, unknown>).platform,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </p>
            <p className="text-sm text-[#78716C]">{entry.verification}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-[#1E3A5F]/15 pt-6 print:hidden">
        <p className="text-sm font-semibold text-[#1E3A5F]">Zona de peligro</p>
        <DeleteAccountButton />
      </div>
    </main>
  );
}
