type PlatformHistoryFields = {
  platform?: string | null;
  role?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  deliveries_count?: number | null;
  on_time_pct?: number | null;
  rating?: number | null;
  hours?: number | null;
};

type AttestationFields = {
  context?: string | null;
  dimensions?: Record<string, number>;
  rehire?: string;
};

export type Entry = {
  id: string;
  type: string;
  fields: PlatformHistoryFields & AttestationFields;
  verification: string;
  created_at: string;
};

const VERIFICATION_LABELS: Record<string, string> = {
  ai_read_self_confirmed: "Leído por IA · confirmado por mí",
  observer_attested: "Verificado por quien lo vio",
};

const DIMENSION_LABELS: Record<string, string> = {
  puntualidad: "Puntualidad",
  precision: "Precisión",
  ritmo: "Ritmo",
  trato: "Trato",
  instrucciones: "Instrucciones",
};

function platformHistorySummary(fields: PlatformHistoryFields) {
  const parts: string[] = [];
  if (fields.role) parts.push(fields.role);
  if (fields.platform) parts.push(fields.platform);
  if (fields.period_start || fields.period_end) {
    parts.push(`${fields.period_start ?? "?"} – ${fields.period_end ?? "?"}`);
  }
  if (typeof fields.deliveries_count === "number") {
    parts.push(`${fields.deliveries_count.toLocaleString("es-MX")} entregas`);
  }
  if (typeof fields.on_time_pct === "number") {
    parts.push(`${fields.on_time_pct}% a tiempo`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Sin detalles capturados";
}

function attestationSummary(fields: AttestationFields) {
  const dims = fields.dimensions ?? {};
  const parts = Object.entries(dims).map(
    ([key, value]) => `${DIMENSION_LABELS[key] ?? key} ${value}`
  );
  return fields.context ?? (parts.length > 0 ? parts.join(" · ") : "Verificación sin detalles");
}

export function EntryCard({ entry }: { entry: Entry }) {
  const tag = VERIFICATION_LABELS[entry.verification] ?? entry.verification;
  const isAttestation = entry.type === "observer_attestation";

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#1E3A5F]/15 bg-white p-4">
      <p className="text-base font-medium text-[#1E3A5F]">
        {isAttestation ? attestationSummary(entry.fields) : platformHistorySummary(entry.fields)}
      </p>
      {isAttestation && entry.fields.dimensions && (
        <p className="text-sm text-[#78716C]">
          {Object.entries(entry.fields.dimensions)
            .map(([key, value]) => `${DIMENSION_LABELS[key] ?? key} ${value}`)
            .join(" · ")}
        </p>
      )}
      <span
        className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
          isAttestation ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-700"
        }`}
      >
        {tag}
      </span>
    </div>
  );
}
