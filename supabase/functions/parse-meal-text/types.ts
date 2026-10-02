import { z } from "zod";
import {
  AIStructuredOutputSchema,
  MealItemSchema,
  MealTypeEnum,
} from "../analyze-meal/types";

export const ParseMealTextRequestSchema = z
  .object({
    text: z.string().optional(),
    audio_base64: z.string().optional(),
    audio_mime_type: z.string().default("audio/m4a"),
    client_time_iso: z.string().datetime().optional(),
  })
  .refine((data) => data.text || data.audio_base64, {
    message: "Debes proporcionar texto o audio para procesar la comida.",
  });

export type ParseMealTextRequest = z.infer<typeof ParseMealTextRequestSchema>;

export { AIStructuredOutputSchema, MealItemSchema, MealTypeEnum };
