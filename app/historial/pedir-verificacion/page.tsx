import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RequestAttestationForm } from "@/components/RequestAttestationForm";

export default async function PedirVerificacion() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col gap-6 bg-[#FFF8F0] px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Pedir verificación</h1>
        <Link href="/historial" className="text-sm font-medium text-[#1E3A5F] underline-offset-2 hover:underline">
          Volver
        </Link>
      </div>

      <RequestAttestationForm />
    </main>
  );
}
