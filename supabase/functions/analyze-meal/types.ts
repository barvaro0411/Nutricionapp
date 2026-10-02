import { z } from "zod";

export const MealTypeEnum = z.enum(["desayuno", "almuerzo", "cena", "snack"]);
export type MealType = z.infer<typeof MealTypeEnum>;

// Esquema de entrada para analyze-meal
export const AnalyzeMealRequestSchema = z.object({
  image_path: z.string().min(1, "image_path es obligatorio"),
  client_time_iso: z.string().datetime().optional(),
  user_note: z.string().max(200).optional(),
  provider: z.enum(["gemini", "openai"]).optional().default("gemini"),
});
export type AnalyzeMealRequest = z.infer<typeof AnalyzeMealRequestSchema>;

// Esquema del ítem individual de alimento detectado por la IA
export const MealItemSchema = z.object({
  food: z.string().min(1, "El nombre del alimento no puede estar vacío"),
  grams: z.number().nonnegative("Los gramos deben ser un número positivo"),
  calories: z.number().nonnegative("Las calorías deben ser positivas"),
  protein: z.number().nonnegative("La proteína debe ser positiva"),
  carbs: z.number().nonnegative("Los carbohidratos deben ser positivos"),
  fat: z.number().nonnegative("Las grasas deben ser positivas"),
  confidence: z.number().min(0).max(1).default(0.8),
});
export type MealItem = z.infer<typeof MealItemSchema>;

// Esquema de salida estructurada que la IA DEBE entregar
export const AIStructuredOutputSchema = z.object({
  meal_type_guess: MealTypeEnum,
  items: z.array(MealItemSchema),
});
export type AIStructuredOutput = z.infer<typeof AIStructuredOutputSchema>;

// Totales calculados para la respuesta al cliente
export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AnalyzeMealResponseData {
  meal_type_guess: MealType;
  items: MealItem[];
  totals: NutritionTotals;
}

export interface AnalyzeMealResponse {
  success: boolean;
  data?: AnalyzeMealResponseData;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    provider_used: string;
    tokens_prompt?: number;
    tokens_completion?: number;
    latency_ms: number;
  };
}
