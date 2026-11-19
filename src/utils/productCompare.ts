import { BarcodeProduct } from "@/services/barcodeService";
import { DietaryRestriction } from "@/types/profile";
import { evaluateFoodAlerts, FoodDietaryAlert, FoodWarningStamp } from "@/utils/foodAlerts";

export type CompareWinner = "A" | "B" | "tie";

export interface EvaluatedProductSummary {
  product: BarcodeProduct;
  stamps: FoodWarningStamp[];
  alerts: FoodDietaryAlert[];
  proteinPer100Kcal: number;
  score: number;
}

export interface ProductComparisonResult {
  a: EvaluatedProductSummary;
  b: EvaluatedProductSummary;
  winner: CompareWinner;
  headline: string;
  reasons: string[];
  metricWinners: {
    calories: CompareWinner;
    protein: CompareWinner;
    proteinDensity: CompareWinner;
    fat: CompareWinner;
    stamps: CompareWinner;
  };
}

function evaluateSingle(
  product: BarcodeProduct,
  restrictions: DietaryRestriction[],
  customAllergies: string[]
): EvaluatedProductSummary {
  const { stamps, alerts } = evaluateFoodAlerts(
    {
      food: `${product.productName} ${product.brand || ""}`,
      calories: product.caloriesPer100g,
      protein: product.proteinPer100g,
      carbs: product.carbsPer100g,
      fat: product.fatPer100g,
      grams: 100,
      unit: product.unit,
    },
    restrictions,
    customAllergies
  );

  const proteinPer100Kcal =
    product.caloriesPer100g > 0
      ? Math.round((product.proteinPer100g / product.caloriesPer100g) * 1000) / 10
      : 0;

  // Puntaje balanceado (por cada 100 g/ml):
  // - Prioriza compatibilidad con restricciones y menor cantidad de sellos Ley 20.606
  // - Valora densidad proteica y menor aporte calórico/graso relativo
  let score = 100;
  for (const alert of alerts) {
    score -= alert.severity === "danger" ? 60 : 25;
  }
  score -= stamps.length * 16;
  score += Math.min(25, proteinPer100Kcal * 1.5);
  score -= Math.min(20, product.caloriesPer100g / 35);
  score -= Math.min(12, product.fatPer100g * 0.45);

  return {
    product,
    stamps,
    alerts,
    proteinPer100Kcal,
    score: Math.round(score * 10) / 10,
  };
}

function lowerBetter(a: number, b: number, threshold = 0.01): CompareWinner {
  if (Math.abs(a - b) <= threshold) return "tie";
  return a < b ? "A" : "B";
}

function higherBetter(a: number, b: number, threshold = 0.01): CompareWinner {
  if (Math.abs(a - b) <= threshold) return "tie";
  return a > b ? "A" : "B";
}

export function compareBarcodeProducts(
  productA: BarcodeProduct,
  productB: BarcodeProduct,
  restrictions: DietaryRestriction[] = [],
  customAllergies: string[] = []
): ProductComparisonResult {
  const a = evaluateSingle(productA, restrictions, customAllergies);
  const b = evaluateSingle(productB, restrictions, customAllergies);

  const metricWinners = {
    calories: lowerBetter(productA.caloriesPer100g, productB.caloriesPer100g, 2),
    protein: higherBetter(productA.proteinPer100g, productB.proteinPer100g, 0.3),
    proteinDensity: higherBetter(a.proteinPer100Kcal, b.proteinPer100Kcal, 0.4),
    fat: lowerBetter(productA.fatPer100g, productB.fatPer100g, 0.3),
    stamps: lowerBetter(a.stamps.length, b.stamps.length, 0),
  };

  let winner: CompareWinner = "tie";
  if (Math.abs(a.score - b.score) >= 3) {
    winner = a.score > b.score ? "A" : "B";
  }

  const reasons: string[] = [];
  if (a.alerts.length !== b.alerts.length) {
    const safer = a.alerts.length < b.alerts.length ? productA.productName : productB.productName;
    reasons.push(`${safer} es más compatible con tus alertas y alergias.`);
  }
  if (a.stamps.length !== b.stamps.length) {
    const cleaner = a.stamps.length < b.stamps.length ? productA.productName : productB.productName;
    reasons.push(
      `${cleaner} tiene menos sellos negros (${Math.min(a.stamps.length, b.stamps.length)} vs ${Math.max(a.stamps.length, b.stamps.length)}).`
    );
  }
  if (metricWinners.proteinDensity !== "tie") {
    const higherProt =
      metricWinners.proteinDensity === "A" ? productA.productName : productB.productName;
    const bestDensity = Math.max(a.proteinPer100Kcal, b.proteinPer100Kcal);
    const otherDensity = Math.min(a.proteinPer100Kcal, b.proteinPer100Kcal);
    reasons.push(
      `${higherProt} aporta más proteína por caloría (${bestDensity} g vs ${otherDensity} g cada 100 kcal).`
    );
  }
  if (metricWinners.calories !== "tie") {
    const lighter = metricWinners.calories === "A" ? productA.productName : productB.productName;
    reasons.push(
      `${lighter} es más liviano por 100 ${productA.unit === "ml" && productB.unit === "ml" ? "ml" : "g"} (${Math.round(Math.min(productA.caloriesPer100g, productB.caloriesPer100g))} vs ${Math.round(Math.max(productA.caloriesPer100g, productB.caloriesPer100g))} kcal).`
    );
  }

  const headline =
    winner === "tie"
      ? "Empate nutricional equilibrado"
      : winner === "A"
        ? `Conviene más: ${productA.productName}`
        : `Conviene más: ${productB.productName}`;

  if (reasons.length === 0) {
    reasons.push("Ambos productos tienen densidad calórica y sellos muy similares.");
  }

  return {
    a,
    b,
    winner,
    headline,
    reasons,
    metricWinners,
  };
}
