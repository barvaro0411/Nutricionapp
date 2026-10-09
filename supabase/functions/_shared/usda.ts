import type { MealItem } from "../analyze-meal/types.ts";
import { findUsdaReference, USDA_REFERENCES } from "./usdaCatalog.ts";
import { scaleNutrition } from "./nutritionMath.ts";

export interface Macros { calories: number; protein: number; carbs: number; fat: number }
export interface UsdaNutritionReference {
  source: "USDA FoodData Central";
  fdc_id: number;
  description: string;
  data_type?: string;
  basis?: "100g" | "100ml";
}
export type EnrichedMealItem = MealItem & { nutrition_reference?: UsdaNutritionReference };
interface ReferenceData { macros: Macros; reference: UsdaNutritionReference }
export interface UsdaFood {
  fdcId?: number;
  description?: string;
  dataType?: string;
  foodNutrients?: { amount?: number; nutrient?: { id?: number; unitName?: string } }[];
  foodPortions?: { amount?: number; gramWeight?: number; modifier?: string; portionDescription?: string; measureUnit?: { name?: string } }[];
}

// Nutrient IDs, not array positions or translated names. Missing values are not zero.
export function readUsdaMacros(food: UsdaFood): Macros | null {
  if (!Array.isArray(food.foodNutrients)) return null;
  const read = (id: number, unit: string, max: number) => {
    const entry = food.foodNutrients?.find(n => n.nutrient?.id === id);
    const value = entry?.amount;
    return entry?.nutrient?.unitName?.toLowerCase() === unit && typeof value === "number"
      && Number.isFinite(value) && value >= 0 && value <= max ? value : null;
  };
  const calories = read(1008, "kcal", 1000) ?? read(2048, "kcal", 1000) ?? read(2047, "kcal", 1000);
  const protein = read(1003, "g", 100);
  const carbs = read(1005, "g", 100);
  const fat = read(1004, "g", 100);
  if (calories === null || protein === null || carbs === null || fat === null) return null;
  return { calories, protein, carbs, fat };
}

export function createUsdaEnricher(options: {
  apiKey: () => string | undefined;
  fetcher?: typeof fetch;
  now?: () => number;
}) {
  const fetcher = options.fetcher || fetch;
  const now = options.now || Date.now;
  const cache = new Map<number, { data: ReferenceData | null; expires: number }>();
  const pending = new Map<number, Promise<ReferenceData | null>>();
  let unavailableUntil = 0;

  async function requestBatch(ids: number[], key: string): Promise<Map<number, ReferenceData>> {
    const values = new Map<number, ReferenceData>();
    try {
      const url = new URL("https://api.nal.usda.gov/fdc/v1/foods");
      url.searchParams.set("api_key", key);
      const response = await fetcher(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fdcIds: ids, format: "full" }),
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) {
        unavailableUntil = now() + (response.status === 429 ? 3600000 : 60000);
        return values;
      }
      const foods: unknown = await response.json();
      if (!Array.isArray(foods)) return values;
      for (const food of foods as UsdaFood[]) {
        if (!food || typeof food !== "object") continue;
        const expected = USDA_REFERENCES.find(reference => reference.fdcId === food.fdcId);
        if (!expected || !ids.includes(expected.fdcId) || food.dataType !== "SR Legacy"
          || food.description !== expected.description) continue;
        const macros = readUsdaMacros(food);
        if (macros) values.set(expected.fdcId, { macros, reference: {
          source: "USDA FoodData Central", fdc_id: expected.fdcId, description: expected.description,
        } });
      }
    } catch {
      // Fail open to the existing AI estimate. Do not log upstream URLs, keys or bodies.
      unavailableUntil = now() + 60000;
    }
    return values;
  }

  return async (items: MealItem[]): Promise<EnrichedMealItem[]> => {
    const key = options.apiKey()?.trim();
    if (!key) return items;
    const references = items.map(item => item.unit === "g" && item.grams > 0 && item.confidence >= 0.8
      ? findUsdaReference(item.food) : undefined);
    const ids = [...new Set(references.flatMap(reference => reference ? [reference.fdcId] : []))];
    const missing = ids.filter(id => (cache.get(id)?.expires || 0) <= now() && !pending.has(id));
    if (missing.length && now() >= unavailableUntil) {
      const batch = requestBatch(missing, key);
      for (const id of missing) {
        const result = batch.then(values => {
          const data = values.get(id) || null;
          cache.set(id, { data, expires: now() + (data ? 86400000 : 60000) });
          pending.delete(id);
          return data;
        });
        pending.set(id, result);
      }
    }
    await Promise.all(ids.map(id => pending.get(id)));
    return items.map((item, index) => {
      const id = references[index]?.fdcId;
      const cached = id ? cache.get(id) : undefined;
      const data = cached && cached.expires > now() ? cached.data : null;
      if (!data) return item;
      const macros = scaleNutrition(data.macros, item.grams);
      // Keep the response within the same limits as the meal contracts.
      if (macros.calories > 50000 || [macros.protein, macros.carbs, macros.fat].some(value => value > 10000)) return item;
      return { ...item, ...macros, nutrition_reference: data.reference };
    });
  };
}

// One bounded cache per Edge Function isolate, shared by its requests.
export const enrichReviewedWithUsda = createUsdaEnricher({ apiKey: () => Deno.env.get("USDA_API_KEY"), fetcher: (...args) => fetch(...args) });
