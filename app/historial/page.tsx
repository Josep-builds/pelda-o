import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";

export default async function Historial() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col gap-6 bg-[#FFF8F0] px-6 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Mi historial</h1>
        <SignOutButton />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#1E3A5F]/20 py-16 text-center">
        <p className="text-base text-[#44403C]">
          Todavía no tienes trabajos agregados.
        </p>
        <p className="text-sm text-[#78716C]">
          Pronto podrás agregar tu primer trabajo aquí.
        </p>
      </div>
    </main>
  );
}
