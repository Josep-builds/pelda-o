import { createClient } from "@/lib/supabase/server";
import { lookupAttestationRequest } from "@/lib/attestations/service";
import { LoginButton } from "@/components/LoginButton";
import { AttestationForm } from "@/components/AttestationForm";

const STATUS_MESSAGES: Record<string, string> = {
  not_found: "Este enlace no es válido.",
  used: "Este enlace ya se usó.",
  expired: "Este enlace venció.",
};

export default async function Atestiguar({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  const lookup = await lookupAttestationRequest(token);

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 bg-[#FFF8F0] px-6 py-10 text-center">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold uppercase tracking-wide text-[#D9622B]">
          Peldaño
        </span>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">Verificar un trabajo</h1>
      </div>

      {lookup.status !== "ok" ? (
        <p className="max-w-sm text-base text-[#44403C]">{STATUS_MESSAGES[lookup.status]}</p>
      ) : !user ? (
        <>
          <p className="max-w-sm text-base text-[#44403C]">
            Entra con Google para completar una evaluación rápida (menos de 1 minuto).
          </p>
          <LoginButton redirectTo={`/atestiguar/${token}`} />
        </>
      ) : lookup.ownerId === user.id ? (
        <p className="max-w-sm text-base text-[#44403C]">
          No puedes verificar tu propio trabajo.
        </p>
      ) : (
        <AttestationForm token={token} context={lookup.context} />
      )}
    </main>
  );
}
