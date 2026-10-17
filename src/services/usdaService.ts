import { z } from "zod";
import { supabase } from "./supabase";
import { DetectedFoodItemSchema, FoodUnit, NutritionReferenceSchema } from "@/types/meal";
import { CHILEAN_FOOD_FAMILIES } from "@/constants/chileanPresets";
import { isLiquidFood } from "@/utils/liquidUnits";

const SearchFoodSchema = z.object({
  fdcId: z.number().int().positive(), description: z.string().min(1).max(500), dataType: z.string(), label: z.string().min(1).max(500),
  unit: z.enum(["g", "ml"]), nutrition_reference: NutritionReferenceSchema,
  per100: z.object({ calories: z.number().finite().min(0).max(2000), protein: z.number().finite().min(0).max(200), carbs: z.number().finite().min(0).max(200), fat: z.number().finite().min(0).max(200) }),
});
export type UsdaSearchFood = z.infer<typeof SearchFoodSchema>;
const ResponseSchema = z.object({ success: z.literal(true), data: z.object({ foods: z.array(SearchFoodSchema).max(12), message: z.string().nullable(), query: z.string() }) });

const normalizeQuery = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export function searchLocalChileanFoods(query: string, unit: FoodUnit): UsdaSearchFood[] {
  const q = normalizeQuery(query);
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const matches: UsdaSearchFood[] = [];
  let indexCounter = 900001;

  for (const family of Object.values(CHILEAN_FOOD_FAMILIES)) {
    const familyNorm = normalizeQuery(`${family.id} ${family.category}`);
    for (const variant of family.variants) {
      const fdcId = indexCounter++;
      const itemUnit: FoodUnit =
        variant.portions?.[0]?.unit === "ml" || isLiquidFood(variant.food) ? "ml" : "g";
      if (itemUnit !== unit) continue;

      const textNorm = `${familyNorm} ${normalizeQuery(variant.food)} ${normalizeQuery(variant.cookingMethod || "")}`;
      const matched = tokens.every((tok) => textNorm.includes(tok));
      if (!matched) continue;

      const description = `${family.category}${variant.cookingMethod ? ` · ${variant.cookingMethod}` : ""} (Catálogo Chileno Instantáneo)`;
      matches.push({
        fdcId,
        label: variant.food,
        description,
        dataType: "ChileanLocal",
        unit: itemUnit,
        per100: {
          calories: variant.caloriesPer100g,
          protein: variant.proteinPer100g,
          carbs: variant.carbsPer100g,
          fat: variant.fatPer100g,
        },
        nutrition_reference: {
          source: "USDA FoodData Central",
          fdc_id: fdcId,
          description: variant.food,
          data_type: "Foundation",
          basis: itemUnit === "ml" ? "100ml" : "100g",
        },
      });
      if (matches.length >= 8) return matches;
    }
  }

  return matches;
}

export async function searchUsdaFoods(query: string, unit: FoodUnit) {
  const { data, error } = await supabase.functions.invoke("search-foods", { body: { query, unit } });
  if (error) {
    let message = "No se pudo consultar USDA. Inténtalo de nuevo.";
    if (error.context instanceof Response) {
      try { const body = await error.context.json(); if (typeof body.error?.message === "string") message = body.error.message; } catch { /* Keep the usable fallback. */ }
    }
    throw new Error(message);
  }
  const parsed = ResponseSchema.safeParse(data);
  if (!parsed.success) throw new Error("USDA devolvió datos incompletos. Inténtalo nuevamente.");
  return parsed.data.data;
}
export function usdaFoodToItem(food: UsdaSearchFood, amount: number) {
  const scale = (value: number) => Math.round(value * amount / 100 * 10) / 10;
  return DetectedFoodItemSchema.parse({ food: food.label, grams: amount, unit: food.unit, confidence: 1,
    calories: scale(food.per100.calories), protein: scale(food.per100.protein), carbs: scale(food.per100.carbs), fat: scale(food.per100.fat), nutrition_reference: food.nutrition_reference });
}
