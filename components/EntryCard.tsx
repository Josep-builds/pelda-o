"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DIMENSION_LABELS, platformHistoryTag, verificationLabel } from "@/lib/entries/labels";

type PlatformHistoryFields = {
  platform?: string | null;
  role?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  deliveries_count?: number | null;
  on_time_pct?: number | null;
  rating?: number | null;
  hours?: number | null;
  source?: "gemini" | "simulado" | "manual";
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
  return fields.context ?? "Verificación sin contexto";
}

export function EntryCard({ entry }: { entry: Entry }) {
  const router = useRouter();
  const [hiding, setHiding] = useState(false);

  const isAttestation = entry.type === "observer_attestation";
  const tag = isAttestation ? verificationLabel(entry.verification) : platformHistoryTag(entry.fields);

  async function handleHide() {
    if (!confirm("¿Ocultar esta entrada? Dejará de aparecer en nuevos historiales compartidos.")) {
      return;
    }
    setHiding(true);
    await fetch(`/api/entries/${entry.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "hide" }),
    });
    router.refresh();
  }

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
          isAttestation
            ? "bg-green-100 text-green-800"
            : entry.fields.source === "simulado"
              ? "bg-amber-100 text-amber-900"
              : "bg-stone-100 text-stone-700"
        }`}
      >
        {tag}
      </span>

      <div className="mt-1 flex gap-3 text-sm">
        <button onClick={handleHide} disabled={hiding} className="text-[#1E3A5F] underline-offset-2 hover:underline">
          Ocultar
        </button>
        {!isAttestation && (
          <Link
            href={`/historial/agregar?replaces=${entry.id}`}
            className="text-[#1E3A5F] underline-offset-2 hover:underline"
          >
            Reemplazar
          </Link>
        )}
      </div>
    </div>
  );
}
