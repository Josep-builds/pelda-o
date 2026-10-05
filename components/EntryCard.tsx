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

export type Entry = {
  id: string;
  type: string;
  fields: PlatformHistoryFields;
  verification: string;
  created_at: string;
};

const VERIFICATION_LABELS: Record<string, string> = {
  ai_read_self_confirmed: "Leído por IA · confirmado por mí",
  observer_attested: "Verificado por quien lo vio",
};

function summaryLine(fields: PlatformHistoryFields) {
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

export function EntryCard({ entry }: { entry: Entry }) {
  const tag = VERIFICATION_LABELS[entry.verification] ?? entry.verification;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[#1E3A5F]/15 bg-white p-4">
      <p className="text-base font-medium text-[#1E3A5F]">{summaryLine(entry.fields)}</p>
      <span className="inline-flex w-fit items-center rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
        {tag}
      </span>
    </div>
  );
}
