import { z } from "zod";
import { MealType, MealTypeSchema } from "@/types/meal";

export const ShoppingUnitSchema = z.enum(["g", "ml", "unidad"]);
export type ShoppingUnit = z.infer<typeof ShoppingUnitSchema>;

export const ShoppingCategorySchema = z.enum([
  "verduras_frutas",
  "proteinas",
  "lacteos_huevos",
  "despensa_granos",
  "condimentos_aceites",
  "otros",
]);
export type ShoppingCategory = z.infer<typeof ShoppingCategorySchema>;

export const SHOPPING_CATEGORY_ORDER: ShoppingCategory[] = [
  "verduras_frutas",
  "proteinas",
  "lacteos_huevos",
  "despensa_granos",
  "condimentos_aceites",
  "otros",
];

export const SHOPPING_CATEGORY_LABELS: Record<
  ShoppingCategory,
  { label: string; icon: string }
> = {
  verduras_frutas: { label: "Verduras y frutas", icon: "🥬" },
  proteinas: { label: "Carnes, aves y pescados", icon: "🥩" },
  lacteos_huevos: { label: "Lácteos y huevos", icon: "🥚" },
  despensa_granos: { label: "Abarrotes y granos", icon: "🌾" },
  condimentos_aceites: { label: "Aceites y condimentos", icon: "🧂" },
  otros: { label: "Otros", icon: "🛒" },
};

export type RecipeSource = "catalog" | "ai";

export interface RecipeIngredient {
  id: string;
  foodName: string;
  grams: number;
  unit?: ShoppingUnit;
  quantity?: number;
  category?: ShoppingCategory;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  id: string;
  title: string;
  description: string | null;
  mealType: MealType;
  prepTimeMinutes: number;
  servings: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  instructions: string[];
  imageUrl: string | null;
  ingredients: RecipeIngredient[];
  source?: RecipeSource;
  isFavorite?: boolean;
  createdAt?: string;
}

export interface ShoppingListItem {
  id: string;
  userId: string;
  name: string;
  normalizedKey: string;
  quantity: number;
  unit: ShoppingUnit;
  category: ShoppingCategory;
  checked: boolean;
  sourceRecipes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpsertShoppingItemInput {
  name: string;
  normalizedKey: string;
  quantity: number;
  unit: ShoppingUnit;
  category: ShoppingCategory;
  sourceRecipe?: string;
}

export const GenerateRecipeRequestSchema = z.object({
  mealType: MealTypeSchema.optional(),
  maxPrepMinutes: z.number().int().min(10).max(120).optional(),
  servings: z.number().int().min(1).max(6).default(1),
  availableIngredients: z
    .array(z.string().trim().min(1).max(40))
    .max(12)
    .optional(),
  cravingNote: z.string().trim().max(140).optional(),
  targetMacros: z
    .object({
      calories: z.number().finite().min(100).max(2500).optional(),
      protein: z.number().finite().min(0).max(250).optional(),
      carbs: z.number().finite().min(0).max(350).optional(),
      fat: z.number().finite().min(0).max(150).optional(),
    })
    .optional(),
});
export type GenerateRecipeRequest = z.input<typeof GenerateRecipeRequestSchema>;
