"use client";

import { useState } from "react";

export function RequestAttestationForm() {
  const [context, setContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  async function handleCreate() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/attestations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context: context.trim() || null }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo crear el enlace.");
        setLoading(false);
        return;
      }
      setUrl(new URL(data.path, window.location.origin).toString());
    } catch {
      setError("No se pudo crear el enlace. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (url) {
    const message = encodeURIComponent(
      `Hola, ¿me ayudas a verificar un trabajo que hice? Abre este enlace y completa un formulario rápido (menos de 1 minuto): ${url}`
    );
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-[#1E3A5F]/15 bg-white p-6">
        <p className="text-base text-[#44403C]">Enlace listo. Expira en 72 horas.</p>
        <a
          href={`https://wa.me/?text=${message}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full bg-[#25D366] px-6 py-3 text-base font-semibold text-white"
        >
          Enviar por WhatsApp
        </a>
        <p className="break-all text-sm text-[#78716C]">{url}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-[#1E3A5F]/20 p-6">
      <label className="flex flex-col gap-1 text-sm text-[#44403C]">
        ¿De qué trabajo se trata?
        <input
          type="text"
          maxLength={140}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder="Ej. Conteo de inventario, 3 sep"
          className="rounded-lg border border-[#1E3A5F]/20 px-3 py-2 text-base text-[#1E3A5F] focus:border-[#1E3A5F] focus:outline-none"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={handleCreate}
        disabled={loading || context.trim().length === 0}
        className="inline-flex items-center justify-center rounded-full bg-[#1E3A5F] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#15293f] disabled:opacity-60"
      >
        {loading ? "Creando..." : "Crear enlace"}
      </button>
    </div>
  );
}
