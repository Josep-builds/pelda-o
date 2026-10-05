import { getShareView } from "@/lib/shares/service";

const STATUS_MESSAGES: Record<string, string> = {
  not_found: "Enlace no válido.",
  revoked: "Enlace revocado.",
  expired: "Enlace vencido.",
};

const VERIFICATION_LABELS: Record<string, string> = {
  ai_read_self_confirmed: "Leído por IA · confirmado por el trabajador",
  observer_attested: "Verificado por quien lo vio",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

export default async function VerEnlace({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const view = await getShareView(token);

  if (view.status !== "ok") {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center bg-[#FFF8F0] px-6 text-center">
        <p className="text-base text-[#44403C]">{STATUS_MESSAGES[view.status]}</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col gap-6 bg-[#FFF8F0] px-6 py-10">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold uppercase tracking-wide text-[#D9622B]">
          Peldaño
        </span>
        <h1 className="text-2xl font-bold text-[#1E3A5F]">
          Historial de {view.ownerName ?? "este trabajador"}
        </h1>
      </div>

      <div className="flex flex-col gap-4">
        {view.entries.map((entry) => (
          <div key={entry.id} className="flex flex-col gap-2 rounded-2xl border border-[#1E3A5F]/15 bg-white p-4">
            {entry.type === "observer_attestation" ? (
              <>
                <p className="text-base font-medium text-[#1E3A5F]">
                  {(entry.fields.context as string) || "Verificación de trabajo"}
                </p>
                {entry.fields.dimensions && (
                  <p className="text-sm text-[#78716C]">
                    {Object.entries(entry.fields.dimensions as Record<string, number>)
                      .map(([k, v]) => `${k} ${v}`)
                      .join(" · ")}
                  </p>
                )}
                <p className="text-xs text-[#78716C]">
                  Verificado por {entry.observerName ?? "un observador"} el {formatDate(entry.createdAt)}
                </p>
              </>
            ) : (
              <p className="text-base font-medium text-[#1E3A5F]">
                {[entry.fields.role, entry.fields.platform].filter(Boolean).join(" · ") || "Trabajo"}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex w-fit items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                {VERIFICATION_LABELS[entry.verification] ?? entry.verification}
              </span>
              {entry.signatureValid !== null && (
                <span
                  className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
                    entry.signatureValid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {entry.signatureValid ? "Firma válida ✓" : "Firma inválida ✗"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
