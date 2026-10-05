import { GoogleGenAI, Type } from "@google/genai";
import {
  EMPTY_PLATFORM_HISTORY_FIELDS,
  platformHistoryFieldsSchema,
  type PlatformHistoryFields,
} from "@/lib/entries/schema";

const DEFAULT_MODEL = "gemini-2.0-flash";

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    platform: { type: Type.STRING, nullable: true, description: "Nombre de la plataforma o negocio, ej. DiDi Food" },
    role: { type: Type.STRING, nullable: true, description: "Rol o puesto, ej. Repartidor" },
    period_start: { type: Type.STRING, nullable: true, description: "Inicio del periodo tal como aparece, ej. mar 2024" },
    period_end: { type: Type.STRING, nullable: true, description: "Fin del periodo tal como aparece, ej. feb 2026" },
    deliveries_count: { type: Type.INTEGER, nullable: true, description: "Número de entregas o pedidos" },
    on_time_pct: { type: Type.NUMBER, nullable: true, description: "Porcentaje a tiempo, 0 a 100" },
    rating: { type: Type.NUMBER, nullable: true, description: "Calificación, 0 a 5" },
    hours: { type: Type.NUMBER, nullable: true, description: "Horas trabajadas" },
  },
};

const EXTRACTION_PROMPT = `Eres un lector de documentos, no un redactor. A continuación hay una captura de pantalla de ganancias o un recibo semanal de un trabajador de plataformas (reparto, entregas, etc.).

Lee ÚNICAMENTE lo que está escrito literalmente en la imagen y devuélvelo en los campos del esquema JSON. Nunca inventes, adivines ni completes un valor que no esté visible en la imagen: si un campo no aparece, usa null. No agregues texto, opiniones ni calificaciones de tu parte.`;

export type ExtractionResult = {
  fields: PlatformHistoryFields;
  source: "gemini" | "simulado";
  extractionFailed: boolean;
};

function simulatedResult(): ExtractionResult {
  return {
    fields: {
      ...EMPTY_PLATFORM_HISTORY_FIELDS,
      platform: "DiDi Food (DATOS DE EJEMPLO)",
      role: "Repartidor",
      period_start: "mar 2024",
      period_end: "feb 2026",
      deliveries_count: 2480,
      on_time_pct: 96,
      rating: 4.8,
      hours: null,
    },
    source: "simulado",
    extractionFailed: false,
  };
}

export async function extractPlatformHistoryFromImage(
  imageBytes: Buffer,
  mimeType: string
): Promise<ExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return simulatedResult();
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const ai = new GoogleGenAI({ apiKey });

  let responseText: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: EXTRACTION_PROMPT },
            { inlineData: { data: imageBytes.toString("base64"), mimeType } },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });
    responseText = response.text;
  } catch (error) {
    console.error("Gemini extraction request failed, falling back to SIMULADO:", error);
    return simulatedResult();
  }

  if (!responseText) {
    console.warn("Gemini returned no text, falling back to SIMULADO.");
    return simulatedResult();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText);
  } catch (error) {
    console.warn("Gemini returned malformed JSON, falling back to manual entry:", error);
    return {
      fields: EMPTY_PLATFORM_HISTORY_FIELDS,
      source: "gemini",
      extractionFailed: true,
    };
  }

  const result = platformHistoryFieldsSchema.safeParse(parsed);
  if (!result.success) {
    console.warn("Gemini JSON failed schema validation, falling back to manual entry:", result.error.message);
    return {
      fields: EMPTY_PLATFORM_HISTORY_FIELDS,
      source: "gemini",
      extractionFailed: true,
    };
  }

  return { fields: result.data, source: "gemini", extractionFailed: false };
}
