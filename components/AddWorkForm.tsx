"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  MAX_EVIDENCE_FILE_BYTES,
} from "@/lib/entries/schema";

type FieldStrings = {
  platform: string;
  role: string;
  period_start: string;
  period_end: string;
  deliveries_count: string;
  on_time_pct: string;
  rating: string;
  hours: string;
};

const EMPTY_FIELD_STRINGS: FieldStrings = {
  platform: "",
  role: "",
  period_start: "",
  period_end: "",
  deliveries_count: "",
  on_time_pct: "",
  rating: "",
  hours: "",
};

type ExtractResponse = {
  fields: Record<string, string | number | null>;
  source: "gemini" | "simulado";
  extractionFailed: boolean;
  evidencePath: string;
};

function fieldsToStrings(fields: ExtractResponse["fields"]): FieldStrings {
  const toStr = (v: string | number | null) => (v === null || v === undefined ? "" : String(v));
  return {
    platform: toStr(fields.platform),
    role: toStr(fields.role),
    period_start: toStr(fields.period_start),
    period_end: toStr(fields.period_end),
    deliveries_count: toStr(fields.deliveries_count),
    on_time_pct: toStr(fields.on_time_pct),
    rating: toStr(fields.rating),
    hours: toStr(fields.hours),
  };
}

function parseNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function AddWorkForm({
  ownerId,
  replacesId = null,
}: {
  ownerId: string;
  replacesId?: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "review">("upload");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fields, setFields] = useState<FieldStrings>(EMPTY_FIELD_STRINGS);
  const [source, setSource] = useState<"gemini" | "simulado" | null>(null);
  const [extractionFailed, setExtractionFailed] = useState(false);
  const [evidencePath, setEvidencePath] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange() {
    const file = fileInputRef.current?.files?.[0] ?? null;
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!ALLOWED_EVIDENCE_MIME_TYPES.includes(file.type as never)) {
      setError("Solo se permiten imágenes JPG, PNG o WEBP.");
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (file.size > MAX_EVIDENCE_FILE_BYTES) {
      setError("El archivo es muy grande. El máximo es 5 MB.");
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleUpload() {
    const file = selectedFile;
    if (!file) {
      setError("Elige una foto primero.");
      return;
    }
    if (!ALLOWED_EVIDENCE_MIME_TYPES.includes(file.type as never)) {
      setError("Solo se permiten imágenes JPG, PNG o WEBP.");
      return;
    }
    if (file.size > MAX_EVIDENCE_FILE_BYTES) {
      setError("El archivo es muy grande. El máximo es 5 MB.");
      return;
    }

    setUploading(true);
    setError(null);

    const extension = file.name.split(".").pop() || "jpg";
    const path = `${ownerId}/${crypto.randomUUID()}.${extension}`;

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(path, file, { contentType: file.type });

    if (uploadError) {
      setError("No se pudo subir la imagen. Verifica que sea JPG, PNG o WEBP y pese menos de 5 MB.");
      setUploading(false);
      return;
    }

    try {
      const response = await fetch("/api/entries/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo leer la imagen.");
        setUploading(false);
        return;
      }

      const result = data as ExtractResponse;
      setFields(fieldsToStrings(result.fields));
      setSource(result.source);
      setExtractionFailed(result.extractionFailed);
      setEvidencePath(result.evidencePath);
      setStep("review");
    } catch {
      setError("No se pudo leer la imagen. Intenta de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const payload = {
      fields: {
        platform: fields.platform.trim() || null,
        role: fields.role.trim() || null,
        period_start: fields.period_start.trim() || null,
        period_end: fields.period_end.trim() || null,
        deliveries_count: parseNumberOrNull(fields.deliveries_count),
        on_time_pct: parseNumberOrNull(fields.on_time_pct),
        rating: parseNumberOrNull(fields.rating),
        hours: parseNumberOrNull(fields.hours),
      },
      evidencePath,
      replacesId,
      source: extractionFailed ? ("manual" as const) : (source ?? "manual"),
    };

    try {
      const response = await fetch("/api/entries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "No se pudo guardar.");
        setSaving(false);
        return;
      }
      router.push("/historial");
      router.refresh();
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
      setSaving(false);
    }
  }

  if (step === "upload") {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border-2 border-dashed border-[#1E3A5F]/20 p-6">
        <p className="text-base text-[#44403C]">
          Sube una captura de tus ganancias o un recibo semanal. La IA leerá los datos y tú los confirmas.
        </p>

        <input
          ref={fileInputRef}
          id="evidence-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="sr-only"
        />

        <label
          htmlFor="evidence-file-input"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-[#1E3A5F] px-6 py-3 text-base font-semibold text-[#1E3A5F]"
        >
          📷 Elegir foto de tus ganancias
        </label>

        {selectedFile && (
          <div className="flex items-center gap-3 rounded-xl bg-stone-100 p-3">
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
            )}
            <p className="break-all text-sm text-[#44403C]">{selectedFile.name}</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleUpload}
          disabled={uploading || !selectedFile}
          className="inline-flex items-center justify-center rounded-full bg-[#1E3A5F] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#15293f] disabled:opacity-60"
        >
          {uploading ? "Leyendo..." : "Subir y leer con IA"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#1E3A5F]/15 p-6">
      {extractionFailed ? (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
          No pudimos leer la imagen automáticamente. Completa los campos a mano.
        </p>
      ) : (
        <span
          className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${
            source === "simulado" ? "bg-amber-100 text-amber-900" : "bg-stone-100 text-stone-700"
          }`}
        >
          {source === "simulado" ? "SIMULADO" : "Leído por IA — confírmalo"}
        </span>
      )}

      <Field label="Plataforma" value={fields.platform} onChange={(v) => setFields({ ...fields, platform: v })} />
      <Field label="Puesto" value={fields.role} onChange={(v) => setFields({ ...fields, role: v })} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Desde" value={fields.period_start} onChange={(v) => setFields({ ...fields, period_start: v })} />
        <Field label="Hasta" value={fields.period_end} onChange={(v) => setFields({ ...fields, period_end: v })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Entregas"
          value={fields.deliveries_count}
          onChange={(v) => setFields({ ...fields, deliveries_count: v })}
          type="number"
        />
        <Field
          label="% a tiempo"
          value={fields.on_time_pct}
          onChange={(v) => setFields({ ...fields, on_time_pct: v })}
          type="number"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calificación" value={fields.rating} onChange={(v) => setFields({ ...fields, rating: v })} type="number" />
        <Field label="Horas" value={fields.hours} onChange={(v) => setFields({ ...fields, hours: v })} type="number" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex items-center justify-center rounded-full bg-[#1E3A5F] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#15293f] disabled:opacity-60"
      >
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[#44403C]">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-[#1E3A5F]/20 px-3 py-2 text-base text-[#1E3A5F] focus:border-[#1E3A5F] focus:outline-none"
      />
    </label>
  );
}
