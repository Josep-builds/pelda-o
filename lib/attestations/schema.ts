import { z } from "zod";
import { RUBRIC_DIMENSIONS } from "@/lib/attestations/payload";

export const createAttestationRequestSchema = z.object({
  context: z.string().trim().min(1).max(140).nullable(),
});

const dimensionScore = z.number().int().min(1).max(5);
const dimensionNote = z.string().trim().min(1).max(140);

const dimensionsShape = Object.fromEntries(
  RUBRIC_DIMENSIONS.map((d) => [d, dimensionScore])
) as Record<(typeof RUBRIC_DIMENSIONS)[number], typeof dimensionScore>;

const notesShape = Object.fromEntries(
  RUBRIC_DIMENSIONS.map((d) => [d, dimensionNote])
) as Record<(typeof RUBRIC_DIMENSIONS)[number], typeof dimensionNote>;

export const submitAttestationSchema = z.object({
  dimensions: z.object(dimensionsShape),
  notes: z.object(notesShape),
  rehire: z.enum(["si", "no", "depende"]),
});
