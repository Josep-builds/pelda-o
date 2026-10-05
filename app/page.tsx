import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginButton } from "@/components/LoginButton";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; error?: string }>;
}) {
  const { redirectTo, error } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    redirect(redirectTo ?? "/historial");
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-8 bg-[#FFF8F0] px-6 text-center">
      <div className="flex flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-wide text-[#D9622B]">
          Peldaño
        </span>
        <h1 className="text-3xl font-bold text-[#1E3A5F]">
          Tu trabajo ya cuenta
        </h1>
        <p className="max-w-sm text-base text-[#44403C]">
          Guarda un historial de tu trabajo que es tuyo, verificado por
          quienes te vieron trabajar, y compártelo solo con quien tú
          decidas.
        </p>
      </div>

      {error && (
        <p className="max-w-sm text-sm text-red-600">
          No se pudo iniciar sesión. Intenta de nuevo.
        </p>
      )}

      <LoginButton redirectTo={redirectTo} />
    </main>
  );
}
