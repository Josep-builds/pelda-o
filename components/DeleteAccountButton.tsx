"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteAccountButton() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        "¿Borrar tu cuenta? Esto elimina todas tus entradas, verificaciones y enlaces compartidos. No se puede deshacer."
      )
    ) {
      return;
    }

    setDeleting(true);
    const response = await fetch("/api/account", { method: "DELETE" });
    if (!response.ok) {
      alert("No se pudo borrar la cuenta. Intenta de nuevo.");
      setDeleting(false);
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="inline-flex w-fit items-center justify-center rounded-full border border-red-600 px-6 py-3 text-base font-semibold text-red-600 disabled:opacity-60"
    >
      {deleting ? "Borrando..." : "Borrar mi cuenta"}
    </button>
  );
}
