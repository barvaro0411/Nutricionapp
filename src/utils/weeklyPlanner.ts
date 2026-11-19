import { MealType } from "@/types/meal";
import { DietaryRestriction } from "@/types/profile";
import { Recipe, UpsertShoppingItemInput } from "@/types/recipe";
import { isRecipeCompatible } from "@/utils/foodAlerts";
import { buildShoppingItemsFromRecipe } from "@/utils/shoppingList";

export type WeekdayId = "lun" | "mar" | "mie" | "jue" | "vie" | "sab" | "dom";

export const WEEKLY_PLANNER_DAYS: { id: WeekdayId; short: string; label: string }[] = [
  { id: "lun", short: "Lun", label: "Lunes" },
  { id: "mar", short: "Mar", label: "Martes" },
  { id: "mie", short: "Mié", label: "Miércoles" },
  { id: "jue", short: "Jue", label: "Jueves" },
  { id: "vie", short: "Vie", label: "Viernes" },
  { id: "sab", short: "Sáb", label: "Sábado" },
  { id: "dom", short: "Dom", label: "Domingo" },
];

export const WEEKLY_PLANNER_MOMENTS: { id: MealType; label: string }[] = [
  { id: "desayuno", label: "Desayuno" },
  { id: "almuerzo", label: "Almuerzo" },
  { id: "cena", label: "Once / Cena" },
  { id: "snack", label: "Colación" },
];

export interface WeeklyMealSlot {
  recipeId: string;
  title: string;
  source: "catalog" | "ai";
  servings: number;
  caloriesPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
}

export type WeeklyDaySlots = Partial<Record<MealType, WeeklyMealSlot>>;
export type WeeklyPlanGrid = Record<WeekdayId, WeeklyDaySlots>;

export function createEmptyWeeklyPlan(): WeeklyPlanGrid {
  return {
    lun: {},
    mar: {},
    mie: {},
    jue: {},
    vie: {},
    sab: {},
    dom: {},
  };
}

export function recipeToPlannerSlot(recipe: Recipe, servings = 1): WeeklyMealSlot {
  return {
    recipeId: recipe.id,
    title: recipe.title,
    source: recipe.source === "ai" ? "ai" : "catalog",
    servings: Math.max(1, Math.min(8, Math.round(servings))),
    caloriesPerServing: Math.round(recipe.caloriesPerServing),
    proteinPerServing: Math.round(recipe.proteinPerServing * 10) / 10,
    carbsPerServing: Math.round(recipe.carbsPerServing * 10) / 10,
    fatPerServing: Math.round(recipe.fatPerServing * 10) / 10,
  };
}

export function summarizeDayPlan(day: WeeklyDaySlots) {
  let mealCount = 0;
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;

  for (const moment of WEEKLY_PLANNER_MOMENTS) {
    const slot = day?.[moment.id];
    if (!slot) continue;
    mealCount++;
    calories += slot.caloriesPerServing;
    protein += slot.proteinPerServing;
    carbs += slot.carbsPerServing;
    fat += slot.fatPerServing;
  }

  return {
    mealCount,
    calories: Math.round(calories),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

export function summarizeWeekPlan(plan: WeeklyPlanGrid) {
  let plannedMeals = 0;
  let totalCalories = 0;
  let totalProtein = 0;
  let daysWithMeals = 0;

  for (const day of WEEKLY_PLANNER_DAYS) {
    const summary = summarizeDayPlan(plan[day.id]);
    if (summary.mealCount > 0) {
      daysWithMeals++;
      plannedMeals += summary.mealCount;
      totalCalories += summary.calories;
      totalProtein += summary.protein;
    }
  }

  return {
    plannedMeals,
    daysWithMeals,
    avgDailyCalories: daysWithMeals > 0 ? Math.round(totalCalories / daysWithMeals) : 0,
    avgDailyProtein: daysWithMeals > 0 ? Math.round(totalProtein / daysWithMeals) : 0,
  };
}

/**
 * Genera una semana Lun-Dom equilibrada filtrando restricciones/alergias del usuario
 * y evitando repetir recetas en días consecutivos cuando hay variedad suficiente.
 */
export function autoGenerateWeeklyPlan(params: {
  recipes: Recipe[];
  restrictions?: DietaryRestriction[];
  customAllergies?: string[];
  targetCalories?: number;
  targetProtein?: number;
}): { plan: WeeklyPlanGrid; compatibleCount: number } {
  const {
    recipes,
    restrictions = [],
    customAllergies = [],
    targetCalories = 2000,
    targetProtein = 120,
  } = params;

  const hasFilters = restrictions.length > 0 || customAllergies.length > 0;
  const compatible = hasFilters
    ? recipes.filter((r) => isRecipeCompatible(r, restrictions, customAllergies).compatible)
    : recipes;

  const pool = compatible.length > 0 ? compatible : recipes;
  const plan = createEmptyWeeklyPlan();

  if (!pool.length) {
    return { plan, compatibleCount: 0 };
  }

  const byMoment = new Map<MealType, Recipe[]>([
    ["desayuno", []],
    ["almuerzo", []],
    ["cena", []],
    ["snack", []],
  ]);

  for (const recipe of pool) {
    byMoment.get(recipe.mealType)?.push(recipe);
  }

  // Priorizar recetas con buena densidad proteica si la meta diaria de proteína es exigente
  const perMealProteinHint = targetProtein / 3.5;
  const sortCandidates = (list: Recipe[], idealCal: number) =>
    [...list].sort((a, b) => {
      const favDiff = Number(Boolean(b.isFavorite)) - Number(Boolean(a.isFavorite));
      if (favDiff !== 0) return favDiff;
      const distA =
        Math.abs(a.caloriesPerServing - idealCal) -
        Math.min(120, (a.proteinPerServing - perMealProteinHint) * 3);
      const distB =
        Math.abs(b.caloriesPerServing - idealCal) -
        Math.min(120, (b.proteinPerServing - perMealProteinHint) * 3);
      return distA - distB;
    });

  const sortedByMoment: Record<MealType, Recipe[]> = {
    desayuno: sortCandidates(
      byMoment.get("desayuno")!.length ? byMoment.get("desayuno")! : pool,
      targetCalories * 0.25
    ),
    almuerzo: sortCandidates(
      byMoment.get("almuerzo")!.length ? byMoment.get("almuerzo")! : pool,
      targetCalories * 0.36
    ),
    cena: sortCandidates(
      byMoment.get("cena")!.length
        ? byMoment.get("cena")!
        : byMoment.get("almuerzo")!.length
          ? byMoment.get("almuerzo")!
          : pool,
      targetCalories * 0.27
    ),
    snack: sortCandidates(byMoment.get("snack")!, targetCalories * 0.12),
  };

  WEEKLY_PLANNER_DAYS.forEach((day, dayIndex) => {
    const moments: MealType[] = sortedByMoment.snack.length
      ? ["desayuno", "almuerzo", "cena", "snack"]
      : ["desayuno", "almuerzo", "cena"];

    for (const m of moments) {
      const candidates = sortedByMoment[m];
      if (!candidates.length) continue;
      // Offset por momento para variar entre días y no elegir siempre el índice 0
      const chosen = candidates[(dayIndex + (m === "cena" ? 1 : 0)) % candidates.length];
      plan[day.id][m] = recipeToPlannerSlot(chosen, 1);
    }
  });

  return { plan, compatibleCount: compatible.length };
}

/**
 * Consolida todos los ingredientes de todas las recetas planificadas en la semana,
 * escalando por las porciones de cada casilla y agrupando por (normalizedKey, unit).
 */
export function buildShoppingItemsFromWeeklyPlan(
  plan: WeeklyPlanGrid,
  recipesById: Map<string, Recipe>
): UpsertShoppingItemInput[] {
  const grouped = new Map<string, UpsertShoppingItemInput>();

  for (const day of WEEKLY_PLANNER_DAYS) {
    const daySlots = plan[day.id];
    if (!daySlots) continue;

    for (const moment of WEEKLY_PLANNER_MOMENTS) {
      const slot = daySlots[moment.id];
      if (!slot) continue;

      const recipe = recipesById.get(slot.recipeId);
      if (!recipe) continue;

      const items = buildShoppingItemsFromRecipe(recipe, slot.servings);
      for (const item of items) {
        const mapKey = `${item.normalizedKey}::${item.unit}`;
        const prev = grouped.get(mapKey);
        if (prev) {
          prev.quantity = Math.round((prev.quantity + item.quantity) * 100) / 100;
        } else {
          grouped.set(mapKey, {
            ...item,
            sourceRecipe: "Plan semanal",
          });
        }
      }
    }
  }

  return Array.from(grouped.values());
}
