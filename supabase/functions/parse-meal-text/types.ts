import { z } from "zod";
import {
  AIStructuredOutputSchema,
  MealItemSchema,
  MealTypeEnum,
} from "../analyze-meal/types.ts";

export const ParseMealTextRequestSchema = z
  .object({
    text: z.string().trim().min(1).max(2000).optional(),
    audio_base64: z.string().min(1).max(6000000).regex(/^[A-Za-z0-9+/]+={0,2}$/).optional(),
    audio_mime_type: z.enum(["audio/mp4", "audio/m4a", "audio/mpeg", "audio/wav", "audio/webm", "audio/ogg"]).default("audio/mp4"),
    client_time_iso: z.string().datetime().optional(),
  })
  .refine((data) => data.text || data.audio_base64, {
    message: "Debes proporcionar texto o audio para procesar la comida.",
  });

export type ParseMealTextRequest = z.infer<typeof ParseMealTextRequestSchema>;

export { AIStructuredOutputSchema, MealItemSchema, MealTypeEnum };
