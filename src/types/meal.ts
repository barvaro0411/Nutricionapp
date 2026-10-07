import { z } from "zod";

export const MealTypeSchema = z.enum(["desayuno", "almuerzo", "cena", "snack"]);
export type MealType = z.infer<typeof MealTypeSchema>;

export type FoodUnit = "g" | "ml";

export const DetectedFoodItemSchema = z.object({
  id: z.string().optional(),
  food: z.string().min(1, "El nombre del alimento es requerido"),
  // Cantidad base: gramos si unit = "g", mililitros si unit = "ml".
  grams: z.number().finite().min(0, "Los gramos no pueden ser negativos").max(20000),
  unit: z.enum(["g", "ml"]).default("g"),
  calories: z.number().finite().min(0).max(50000),
  protein: z.number().finite().min(0).max(10000),
  carbs: z.number().finite().min(0).max(10000),
  fat: z.number().finite().min(0).max(10000),
  confidence: z.number().min(0).max(1).default(0.8),
  ratioCalories: z.number().optional(),
  ratioProtein: z.number().optional(),
  ratioCarbs: z.number().optional(),
  ratioFat: z.number().optional(),
});
export type DetectedFoodItem = z.output<typeof DetectedFoodItemSchema>;
export type DetectedFoodItemInput = z.input<typeof DetectedFoodItemSchema>;

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
    unit?: FoodUnit;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: number | null;
    ai_detected: boolean;
  }[];
}
