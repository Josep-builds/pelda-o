"use client";

import { useEffect, useState } from "react";

type Entry = {
  id: string;
  type: string;
  fields: Record<string, unknown>;
  verification: string;
  created_at: string;
};

type ShareLink = {
  id: string;
  entry_ids: string[];
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

function entryLabel(entry: Entry): string {
  const f = entry.fields;
  if (entry.type === "observer_attestation") {
    return (f.context as string) || "Verificación";
  }
  return (f.role as string) || (f.platform as string) || "Trabajo";
}

const EXPIRY_OPTIONS: Array<{ value: "24h" | "7d" | "30d"; label: string }> = [
  { value: "24h", label: "24 horas" },
  { value: "7d", label: "7 días" },
  { value: "30d", label: "30 días" },
];

export function ShareForm({ entries }: { entries: Entry[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expiry, setExpiry] = useState<"24h" | "7d" | "30d">("7d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; qrDataUrl: string } | null>(null);
  const [links, setLinks] = useState<ShareLink[]>([]);

  async function refreshLinks() {
    const response = await fetch("/api/shares");
    if (response.ok) {
      const data = await response.json();
      setLinks(data.links ?? []);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount; setLinks only runs after the awaited response
    refreshLinks();
  }, []);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function handleCreate() {
    if (selected.size === 0) {
      setError("Elige al menos una entrada.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entryIds: Array.from(selected), expiry }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo crear el enlace.");
        setLoading(false);
        return;
      }
      setResult({
        url: new URL(data.path, window.location.origin).toString(),
        qrDataUrl: data.qrDataUrl,
      });
      refreshLinks();
    } catch {
      setError("No se pudo crear el enlace. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    await fetch(`/api/shares/${id}`, { method: "DELETE" });
    refreshLinks();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-[#1E3A5F]/15 bg-white p-4">
        <p className="text-sm font-semibold text-[#1E3A5F]">Elige qué mostrar</p>
        {entries.length === 0 && (
          <p className="text-sm text-[#78716C]">Todavía no tienes entradas.</p>
        )}
        {entries.map((entry) => (
          <label key={entry.id} className="flex items-center gap-3 text-sm text-[#44403C]">
            <input
              type="checkbox"
              checked={selected.has(entry.id)}
              onChange={() => toggle(entry.id)}
            />
            {entryLabel(entry)}
          </label>
        ))}

        <div className="flex flex-col gap-1 pt-2">
          <span className="text-sm font-semibold text-[#1E3A5F]">Expira en</span>
          <div className="flex gap-2">
            {EXPIRY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setExpiry(opt.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  expiry === opt.value ? "bg-[#1E3A5F] text-white" : "bg-stone-100 text-stone-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={loading}
          className="mt-2 inline-flex items-center justify-center rounded-full bg-[#1E3A5F] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#15293f] disabled:opacity-60"
        >
          {loading ? "Creando..." : "Generar enlace y QR"}
        </button>
      </div>

      {result && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#1E3A5F]/15 bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.qrDataUrl} alt="Código QR para compartir" className="h-48 w-48" />
          <p className="break-all text-sm text-[#78716C]">{result.url}</p>
        </div>
      )}

      {links.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-[#1E3A5F]/15 bg-white p-4">
          <p className="text-sm font-semibold text-[#1E3A5F]">Enlaces creados</p>
          {links.map((link) => {
            const expired = new Date(link.expires_at) < new Date();
            const statusLabel = link.revoked_at
              ? "Revocado"
              : expired
                ? "Vencido"
                : `${link.entry_ids.length} entradas · activo`;
            return (
              <div key={link.id} className="flex items-center justify-between text-sm">
                <span className="text-[#44403C]">{statusLabel}</span>
                {!link.revoked_at && !expired && (
                  <button
                    onClick={() => handleRevoke(link.id)}
                    className="text-[#D9622B] underline-offset-2 hover:underline"
                  >
                    Revocar
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
