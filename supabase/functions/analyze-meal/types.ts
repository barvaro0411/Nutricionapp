import { z } from "zod";

export const MealTypeEnum = z.enum(["desayuno", "almuerzo", "cena", "snack"]);
export type MealType = z.infer<typeof MealTypeEnum>;

// Esquema de entrada para analyze-meal
export const AnalyzeMealRequestSchema = z.object({
  image_path: z.string().min(1, "image_path es obligatorio").max(300),
  client_time_iso: z.string().datetime().optional(),
  user_note: z.string().max(200).optional(),
  provider: z.enum(["gemini", "openai"]).optional().default("gemini"),
  mode: z.enum(["meal", "nutrition_label"]).default("meal"),
});
export type AnalyzeMealRequest = z.infer<typeof AnalyzeMealRequestSchema>;

// Esquema del ítem individual de alimento detectado por la IA
export const MealItemSchema = z.object({
  food: z.string().min(1, "El nombre del alimento no puede estar vacío"),
  // Cantidad base: gramos si unit = "g", mililitros si unit = "ml".
  grams: z.number().finite().nonnegative("Los gramos deben ser un número positivo").max(20000),
  unit: z.enum(["g", "ml"]).default("g"),
  calories: z.number().finite().nonnegative("Las calorías deben ser positivas").max(50000),
  protein: z.number().finite().nonnegative("La proteína debe ser positiva").max(10000),
  carbs: z.number().finite().nonnegative("Los carbohidratos deben ser positivos").max(10000),
  fat: z.number().finite().nonnegative("Las grasas deben ser positivas").max(10000),
  confidence: z.number().min(0).max(1).default(0.8),
  usda_lookup: z.object({
    query: z.string().min(1).max(160),
    alternative_query: z.string().min(1).max(160).optional(),
    state: z.enum(["raw", "cooked", "ready_to_eat", "unknown"]),
  }).optional(),
});
export type MealItem = z.infer<typeof MealItemSchema>;

// Esquema de salida estructurada que la IA DEBE entregar
export const AIStructuredOutputSchema = z.object({
  meal_type_guess: MealTypeEnum,
  items: z.array(MealItemSchema).max(100),
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
