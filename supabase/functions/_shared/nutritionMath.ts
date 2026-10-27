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

export interface AtwaterValidationResult {
  coherent: boolean;
  expectedCalories: number;
  declaredCalories: number;
  absoluteError: number;
  relativeError: number;
}

/**
 * Standard Atwater physiological fuel values: 4 kcal/g protein, 4 kcal/g carbs, 9 kcal/g fat.
 */
export function atwaterCalories(nutrients: Pick<Nutrients, "protein" | "carbs" | "fat">): number {
  const { protein, carbs, fat } = nutrients;
  if (![protein, carbs, fat].every((v) => Number.isFinite(v) && v >= 0)) {
    throw new Error("Invalid nutritional value");
  }
  return roundNutrient(4 * protein + 4 * carbs + 9 * fat, 1);
}

/**
 * Validates whether declared calories match 4*P + 4*C + 9*F within tolerance.
 * Small portions use a floor of `minAbsToleranceKcal` (default 25 kcal) to avoid false positives from fiber/rounding.
 */
export function validateAtwaterCoherence(
  nutrients: Nutrients,
  toleranceRatio = 0.15,
  minAbsToleranceKcal = 25
): AtwaterValidationResult {
  if (!Number.isFinite(nutrients.calories) || nutrients.calories < 0) {
    throw new Error("Invalid nutritional value");
  }
  const expectedCalories = atwaterCalories(nutrients);
  const declaredCalories = roundNutrient(nutrients.calories, 1);
  const absoluteError = roundNutrient(Math.abs(declaredCalories - expectedCalories), 1);
  const denominator = Math.max(expectedCalories, declaredCalories, 1);
  const relativeError = roundNutrient(absoluteError / denominator, 4);
  const allowedDelta = Math.max(minAbsToleranceKcal, expectedCalories * toleranceRatio);
  const coherent =
    (expectedCalories === 0 && declaredCalories <= minAbsToleranceKcal) ||
    absoluteError <= allowedDelta;

  return {
    coherent,
    expectedCalories,
    declaredCalories,
    absoluteError,
    relativeError,
  };
}

/**
 * Reconciles AI-estimated calories to Atwater (4P + 4C + 9F) when declared calories deviate beyond tolerance.
 */
export function reconcileAtwaterNutrients<T extends Nutrients>(
  item: T,
  toleranceRatio = 0.15,
  minAbsToleranceKcal = 25
): T & { atwaterAdjusted?: boolean } {
  const check = validateAtwaterCoherence(item, toleranceRatio, minAbsToleranceKcal);
  if (check.coherent || check.expectedCalories <= 0) {
    return { ...item };
  }
  return {
    ...item,
    calories: check.expectedCalories,
    atwaterAdjusted: true,
  };
}
