export const DIMENSION_LABELS: Record<string, string> = {
  puntualidad: "Puntualidad",
  precision: "Precisión",
  ritmo: "Ritmo",
  trato: "Trato",
  instrucciones: "Seguimiento de instrucciones",
};

const BASE_VERIFICATION_LABELS: Record<string, string> = {
  ai_read_self_confirmed: "Leído por IA · confirmado por mí",
  observer_attested: "Verificado por quien lo vio",
};

export type PlatformHistoryFieldsSource = {
  source?: "gemini" | "simulado" | "manual";
};

// `verification` alone can't distinguish a real AI read from a SIMULADO
// fallback or a manual fill-in — both get saved as ai_read_self_confirmed
// (the worker did confirm the fields either way). The actual source lives
// in fields.source and is what should drive the label shown to anyone,
// including a verifier on the public share page — showing "Leído por IA"
// over invented demo data would be dishonest, not just a cosmetic bug.
export function platformHistoryTag(fields: PlatformHistoryFieldsSource): string {
  if (fields.source === "simulado") return "SIMULADO · dato de ejemplo";
  if (fields.source === "manual") return "Capturado a mano";
  return BASE_VERIFICATION_LABELS.ai_read_self_confirmed;
}

export function verificationLabel(verification: string): string {
  return BASE_VERIFICATION_LABELS[verification] ?? verification;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
