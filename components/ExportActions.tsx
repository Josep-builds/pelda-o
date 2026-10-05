"use client";

export function ExportActions() {
  async function handleDownload() {
    const response = await fetch("/api/export");
    if (!response.ok) return;
    const data = await response.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `peldano-historial-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex gap-3 print:hidden">
      <button
        onClick={handleDownload}
        className="inline-flex items-center justify-center rounded-full bg-[#1E3A5F] px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-[#15293f]"
      >
        Descargar JSON firmado
      </button>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center justify-center rounded-full border border-[#1E3A5F] px-6 py-3 text-base font-semibold text-[#1E3A5F]"
      >
        Imprimir / Guardar como PDF
      </button>
    </div>
  );
}
