export interface Nutrients { calories: number; protein: number; carbs: number; fat: number }
const nutrientKeys = ["calories", "protein", "carbs", "fat"] as const;
export const roundNutrient = (value: number, decimals = 1) => {
  if (!Number.isFinite(value)) throw new Error("Invalid nutritional value");
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

/** Add the recorded nutrients, never infer energy from rounded protein/carbs/fat. */
export function sumNutrition(items: Nutrients[]): Nutrients {
  const total: Nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const correction: Nutrients = { ...total };
  for (const item of items) for (const key of nutrientKeys) {
    const value = item[key];
    if (!Number.isFinite(value) || value < 0) throw new Error("Invalid nutritional value");
    const adjusted = value - correction[key];
    const sum = total[key] + adjusted;
    correction[key] = (sum - total[key]) - adjusted;
    total[key] = sum;
  }
  for (const key of nutrientKeys) total[key] = roundNutrient(total[key], 6);
  return total;
}

export function scaleNutrition(per100: Nutrients, amount: number): Nutrients {
  if (!Number.isFinite(amount) || amount < 0) throw new Error("Invalid portion");
  const scaled = {} as Nutrients;
  for (const key of nutrientKeys) {
    if (!Number.isFinite(per100[key]) || per100[key] < 0) throw new Error("Invalid nutritional value");
    scaled[key] = roundNutrient(per100[key] * amount / 100);
  }
  return scaled;
}

/** Keep a negative balance visible when a target has already been exceeded. */
export function remainingNutrition(target: Nutrients, consumed: Nutrients, activeCalories = 0): Nutrients {
  const remaining = {} as Nutrients;
  if (!Number.isFinite(activeCalories) || activeCalories < 0) throw new Error("Invalid activity");
  for (const key of nutrientKeys) remaining[key] = roundNutrient(target[key] + (key === "calories" ? activeCalories : 0) - consumed[key], 6);
  return remaining;
}
