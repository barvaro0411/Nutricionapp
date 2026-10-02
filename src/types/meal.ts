import { z } from "zod";

export const MealTypeSchema = z.enum(["desayuno", "almuerzo", "cena", "snack"]);
export type MealType = z.infer<typeof MealTypeSchema>;

export const DetectedFoodItemSchema = z.object({
  id: z.string().optional(),
  food: z.string().min(1, "El nombre del alimento es requerido"),
  grams: z.number().min(0, "Los gramos no pueden ser negativos"),
  calories: z.number().min(0),
  protein: z.number().min(0),
  carbs: z.number().min(0),
  fat: z.number().min(0),
  confidence: z.number().min(0).max(1).default(0.8),
  ratioCalories: z.number().optional(),
  ratioProtein: z.number().optional(),
  ratioCarbs: z.number().optional(),
  ratioFat: z.number().optional(),
});
export type DetectedFoodItem = z.infer<typeof DetectedFoodItemSchema>;

export interface MealTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface AnalyzeMealResponseData {
  meal_type_guess: MealType;
  items: DetectedFoodItem[];
  totals: MealTotals;
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

export interface MealWithItems {
  id: string;
  user_id: string;
  meal_type: MealType;
  logged_at: string;
  image_path: string | null;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  notes: string | null;
  items: {
    id: string;
    food_name: string;
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: number | null;
    ai_detected: boolean;
  }[];
}
