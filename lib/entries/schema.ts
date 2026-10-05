import { z } from "zod";

export const MAX_EVIDENCE_FILE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_EVIDENCE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

// Free-text, not a strict date: screenshots show periods like "mar 2024" or
// "marzo de 2024", and forcing ISO parsing would reject valid reads.
const nullableShortText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .nullable();

export const platformHistoryFieldsSchema = z.object({
  platform: nullableShortText(100),
  role: nullableShortText(100),
  period_start: nullableShortText(40),
  period_end: nullableShortText(40),
  deliveries_count: z.number().int().min(0).max(1_000_000).nullable(),
  on_time_pct: z.number().min(0).max(100).nullable(),
  rating: z.number().min(0).max(5).nullable(),
  hours: z.number().min(0).max(100_000).nullable(),
});

export type PlatformHistoryFields = z.infer<typeof platformHistoryFieldsSchema>;

export const EMPTY_PLATFORM_HISTORY_FIELDS: PlatformHistoryFields = {
  platform: null,
  role: null,
  period_start: null,
  period_end: null,
  deliveries_count: null,
  on_time_pct: null,
  rating: null,
  hours: null,
};

export const extractRequestSchema = z.object({
  path: z.string().trim().min(1).max(500),
});

export const createPlatformHistoryEntrySchema = z.object({
  fields: platformHistoryFieldsSchema,
  evidencePath: z.string().trim().min(1).max(500).nullable(),
});
