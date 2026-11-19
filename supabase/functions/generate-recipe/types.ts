import { z } from "zod";

export const RecipeMealTypeSchema = z.enum(["desayuno", "almuerzo", "cena", "snack"]);

export const RecipeShoppingCategorySchema = z.enum([
  "verduras_frutas",
  "proteinas",
  "lacteos_huevos",
  "despensa_granos",
  "condimentos_aceites",
  "otros",
]);

export const RecipeShoppingUnitSchema = z.enum(["g", "ml", "unidad"]);

export const GenerateRecipeRequestSchema = z.object({
  mealType: RecipeMealTypeSchema.optional(),
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

export const AIRecipeIngredientSchema = z.object({
  foodName: z.string().trim().min(1).max(100),
  grams: z.number().finite().positive().max(10000),
  unit: RecipeShoppingUnitSchema.default("g"),
  quantity: z.number().finite().positive().max(500).optional(),
  category: RecipeShoppingCategorySchema.default("otros"),
  calories: z.number().finite().min(0).max(15000),
  protein: z.number().finite().min(0).max(2000),
  carbs: z.number().finite().min(0).max(2000),
  fat: z.number().finite().min(0).max(2000),
});

export const AIRecipeOutputSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(280).optional().default(""),
  mealType: RecipeMealTypeSchema,
  prepTimeMinutes: z.number().finite().min(1).max(300),
  servings: z.number().int().min(1).max(6),
  ingredients: z.array(AIRecipeIngredientSchema).min(2).max(20),
  instructions: z.array(z.string().trim().min(2).max(400)).min(2).max(15),
});

export type AIRecipeOutput = z.infer<typeof AIRecipeOutputSchema>;
export type GenerateRecipeRequest = z.infer<typeof GenerateRecipeRequestSchema>;
