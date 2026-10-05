// Deterministic JSON stringify: recursively sorts object keys so the same
// logical content always produces the exact same bytes, regardless of key
// insertion order. This is what gets signed and later re-verified, so it
// must be stable across a write and a much-later read.
export function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

export const RUBRIC_DIMENSIONS = [
  "puntualidad",
  "precision",
  "ritmo",
  "trato",
  "instrucciones",
] as const;

export type RubricDimension = (typeof RUBRIC_DIMENSIONS)[number];

export type RehireAnswer = "si" | "no" | "depende";

export type AttestationFields = {
  owner_id: string;
  observer_id: string;
  context: string | null;
  dimensions: Record<RubricDimension, number>;
  notes: Record<RubricDimension, string>;
  rehire: RehireAnswer;
  signed_at: string;
};

export function buildAttestationFields(input: AttestationFields): AttestationFields {
  // Field order here is just for readability when inspecting raw rows;
  // canonicalStringify sorts keys anyway before signing/verifying.
  return { ...input };
}
