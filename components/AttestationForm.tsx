"use client";

import { useState } from "react";

const DIMENSIONS: Array<{ key: string; label: string }> = [
  { key: "puntualidad", label: "Puntualidad" },
  { key: "precision", label: "Precisión" },
  { key: "ritmo", label: "Ritmo" },
  { key: "trato", label: "Trato" },
  { key: "instrucciones", label: "Seguimiento de instrucciones" },
];

type Scores = Record<string, number | null>;
type Notes = Record<string, string>;

const EMPTY_SCORES: Scores = Object.fromEntries(DIMENSIONS.map((d) => [d.key, null]));
const EMPTY_NOTES: Notes = Object.fromEntries(DIMENSIONS.map((d) => [d.key, ""]));

export function AttestationForm({ token, context }: { token: string; context: string | null }) {
  const [scores, setScores] = useState<Scores>(EMPTY_SCORES);
  const [notes, setNotes] = useState<Notes>(EMPTY_NOTES);
  const [rehire, setRehire] = useState<"si" | "no" | "depende" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    for (const d of DIMENSIONS) {
      if (scores[d.key] == null) {
        setError(`Elige una calificación para "${d.label}".`);
        setSubmitting(false);
        return;
      }
      if (!notes[d.key]?.trim()) {
        setError(`Agrega una nota corta para "${d.label}".`);
        setSubmitting(false);
        return;
      }
    }
    if (!rehire) {
      setError('Responde "¿Lo volverías a contratar?".');
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/attestations/${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dimensions: scores, notes, rehire }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo registrar.");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("No se pudo registrar. Intenta de nuevo.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <p className="max-w-sm text-base text-[#1E3A5F]">
        ¡Gracias! Tu verificación quedó registrada y firmada.
      </p>
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-[#1E3A5F]/15 bg-white p-6 text-left">
      {context && <p className="text-sm text-[#78716C]">Sobre: {context}</p>}

      {DIMENSIONS.map((d) => (
        <div key={d.key} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-[#1E3A5F]">{d.label}</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScores({ ...scores, [d.key]: n })}
                className={`h-9 w-9 rounded-full text-sm font-semibold ${
                  scores[d.key] === n
                    ? "bg-[#1E3A5F] text-white"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <input
            type="text"
            maxLength={140}
            placeholder="Nota corta (obligatoria)"
            value={notes[d.key]}
            onChange={(e) => setNotes({ ...notes, [d.key]: e.target.value })}
            className="rounded-lg border border-[#1E3A5F]/20 px-3 py-2 text-sm text-[#1E3A5F] focus:border-[#1E3A5F] focus:outline-none"
          />
        </div>
      ))}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-[#1E3A5F]">¿Lo volverías a contratar?</label>
        <div className="flex gap-2">
          {(["si", "no", "depende"] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setRehire(opt)}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                rehire === opt ? "bg-[#1E3A5F] text-white" : "bg-stone-100 text-stone-600"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="inline-flex items-center justify-center rounded-full bg-[#1E3A5F] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#15293f] disabled:opacity-60"
      >
        {submitting ? "Enviando..." : "Enviar verificación"}
      </button>
    </div>
  );
}
