import { BarcodeProduct } from "@/services/barcodeService";
import { FoodUnit } from "@/types/meal";
import { DietaryRestriction } from "@/types/profile";
import {
  evaluateFoodAlerts,
  FoodDietaryAlert,
  FoodWarningStamp,
} from "@/utils/foodAlerts";
import { isLiquidFood } from "@/utils/liquidUnits";

export type SupermarketVerdict = "great" | "moderate" | "avoid";
export type TrafficLightLevel = "good" | "warn" | "bad";

export interface NutrientTrafficLight {
  key: "sugars" | "calories" | "fat" | "protein" | "sodium" | "fiber";
  label: string;
  valueText: string;
  statusText: string;
  level: TrafficLightLevel;
}

export interface DayBudgetImpact {
  portionCalories: number;
  portionProtein: number;
  caloriesPctOfRemaining: number | null;
  proteinPctOfRemaining: number | null;
  exceedsRemainingCalories: boolean;
  summaryText: string;
}

export interface SupermarketEvaluation {
  verdict: SupermarketVerdict;
  score: number;
  objectiveLabel: string;
  verdictTitle: string;
  summary: string;
  stamps: FoodWarningStamp[];
  alerts: FoodDietaryAlert[];
  isUltraProcessed: boolean;
  proteinPer100Kcal: number;
  trafficLights: NutrientTrafficLight[];
  pros: string[];
  cons: string[];
  smartTip: string | null;
  dayBudgetImpact: DayBudgetImpact | null;
}

const OBJECTIVE_LABELS: Record<string, string> = {
  lose_weight: "Reducir grasa corporal",
  maintain: "Mantener tu peso",
  gain_muscle: "Ganar masa muscular",
};

export function evaluateSupermarketProduct(params: {
  product: BarcodeProduct;
  portionAmount: number;
  portionUnit?: FoodUnit;
  objective?: string | null;
  remainingCalories?: number;
  remainingProtein?: number;
  restrictions?: DietaryRestriction[];
  customAllergies?: string[];
}): SupermarketEvaluation {
  const {
    product,
    portionAmount,
    objective,
    remainingCalories,
    remainingProtein,
    restrictions = [],
    customAllergies = [],
  } = params;

  const unit: FoodUnit =
    params.portionUnit ||
    product.unit ||
    (isLiquidFood(product.productName) ? "ml" : "g");
  const isLiquid = unit === "ml";
  const basisLabel = isLiquid ? "100 ml" : "100 g";
  const safePortion =
    Number.isFinite(portionAmount) && portionAmount > 0 ? portionAmount : 100;

  const { stamps, alerts, substituteSuggestion } = evaluateFoodAlerts(
    {
      food: `${product.productName} ${product.brand || ""} ${product.ingredientsText || ""}`,
      calories: product.caloriesPer100g,
      protein: product.proteinPer100g,
      carbs: product.carbsPer100g,
      fat: product.fatPer100g,
      grams: 100,
      unit,
      sugars: product.sugarsPer100g,
      saturatedFat: product.saturatedFatPer100g,
      sodiumMg: product.sodiumMgPer100g,
    },
    restrictions,
    customAllergies
  );

  const stampSet = new Set(stamps.map((s) => s.stamp));
  const proteinPer100Kcal =
    product.caloriesPer100g > 0
      ? Math.round((product.proteinPer100g / product.caloriesPer100g) * 1000) / 10
      : 0;
  const isUltraProcessed = product.novaGroup === 4;
  const objectiveKey = objective || "maintain";
  const objectiveLabel = OBJECTIVE_LABELS[objectiveKey] || "Tu alimentación diaria";

  // 1. Semáforo rápido de nutrientes por 100g/ml
  const trafficLights: NutrientTrafficLight[] = [];

  // Azúcares
  const sugarLimit = isLiquid ? 5 : 10;
  if (typeof product.sugarsPer100g === "number") {
    const s = product.sugarsPer100g;
    const level: TrafficLightLevel =
      s >= sugarLimit ? "bad" : s >= sugarLimit * 0.5 ? "warn" : "good";
    trafficLights.push({
      key: "sugars",
      label: "Azúcar",
      valueText: `${s} g/${basisLabel}`,
      statusText: level === "bad" ? "Alto en azúcar" : level === "warn" ? "Moderado" : "Bajo en azúcar",
      level,
    });
  } else {
    const highSugar = stampSet.has("sugars");
    trafficLights.push({
      key: "sugars",
      label: "Azúcares",
      valueText: `${product.carbsPer100g} g carbos`,
      statusText: highSugar ? "Alto en azúcar" : product.carbsPer100g <= 8 ? "Bajo" : "Sin sello",
      level: highSugar ? "bad" : product.carbsPer100g <= 8 ? "good" : "warn",
    });
  }

  // Calorías
  const calLimit = isLiquid ? 70 : 275;
  const calLevel: TrafficLightLevel =
    product.caloriesPer100g >= calLimit
      ? "bad"
      : product.caloriesPer100g >= calLimit * 0.65
        ? "warn"
        : "good";
  trafficLights.push({
    key: "calories",
    label: "Calorías",
    valueText: `${Math.round(product.caloriesPer100g)} kcal`,
    statusText: calLevel === "bad" ? "Alto en kcal" : calLevel === "warn" ? "Moderado" : "Liviano",
    level: calLevel,
  });

  // Grasas / saturadas
  if (typeof product.saturatedFatPer100g === "number") {
    const sf = product.saturatedFatPer100g;
    const satLimit = isLiquid ? 3 : 4;
    const level: TrafficLightLevel =
      sf >= satLimit ? "bad" : sf >= satLimit * 0.5 ? "warn" : "good";
    trafficLights.push({
      key: "fat",
      label: "Grasa sat.",
      valueText: `${sf} g/${basisLabel}`,
      statusText: level === "bad" ? "Alta saturada" : level === "warn" ? "Moderada" : "Baja",
      level,
    });
  } else {
    const highFat = stampSet.has("fats");
    const fatLevel: TrafficLightLevel = highFat
      ? "bad"
      : product.fatPer100g <= (isLiquid ? 1.5 : 5)
        ? "good"
        : "warn";
    trafficLights.push({
      key: "fat",
      label: "Grasas",
      valueText: `${product.fatPer100g} g/${basisLabel}`,
      statusText: fatLevel === "bad" ? "Alto en grasas" : fatLevel === "good" ? "Bajo en grasas" : "Moderadas",
      level: fatLevel,
    });
  }

  // Proteína
  const protLevel: TrafficLightLevel =
    proteinPer100Kcal >= 10 || product.proteinPer100g >= (isLiquid ? 3.5 : 10)
      ? "good"
      : proteinPer100Kcal >= 5 || product.proteinPer100g >= (isLiquid ? 2 : 5)
        ? "warn"
        : "bad";
  trafficLights.push({
    key: "protein",
    label: "Proteína",
    valueText: `${product.proteinPer100g} g/${basisLabel}`,
    statusText:
      protLevel === "good"
        ? "Buena proteína"
        : protLevel === "warn"
          ? "Aporte medio"
          : "Poca proteína",
    level: protLevel,
  });

  // Sodio si viene exacto o tiene sello
  if (typeof product.sodiumMgPer100g === "number") {
    const sodLimit = isLiquid ? 100 : 400;
    const sod = product.sodiumMgPer100g;
    const level: TrafficLightLevel =
      sod >= sodLimit ? "bad" : sod >= sodLimit * 0.6 ? "warn" : "good";
    trafficLights.push({
      key: "sodium",
      label: "Sodio",
      valueText: `${sod} mg`,
      statusText: level === "bad" ? "Alto en sodio" : level === "warn" ? "Moderado" : "Bajo en sodio",
      level,
    });
  } else if (stampSet.has("sodium")) {
    trafficLights.push({
      key: "sodium",
      label: "Sodio",
      valueText: "Sello MINSAL",
      statusText: "Alto en sodio",
      level: "bad",
    });
  }

  // Fibra si es relevante
  if (typeof product.fiberPer100g === "number" && product.fiberPer100g >= 3) {
    trafficLights.push({
      key: "fiber",
      label: "Fibra",
      valueText: `${product.fiberPer100g} g`,
      statusText: product.fiberPer100g >= 6 ? "Alta fibra" : "Buena fibra",
      level: "good",
    });
  }

  // 2. Puntaje adaptado al objetivo del usuario
  let score = 88;

  for (const alert of alerts) {
    score -= alert.severity === "danger" ? 65 : 35;
  }

  if (stampSet.has("sugars")) {
    score -= objectiveKey === "lose_weight" ? 28 : 20;
  }
  if (stampSet.has("calories")) {
    score -= objectiveKey === "lose_weight" ? 24 : objectiveKey === "gain_muscle" ? 8 : 16;
  }
  if (stampSet.has("fats")) {
    score -= objectiveKey === "lose_weight" ? 22 : 16;
  }
  if (stampSet.has("sodium")) {
    score -= 16;
  }

  if (isUltraProcessed) {
    score -= 10;
  }

  if (proteinPer100Kcal >= 12) {
    score += objectiveKey === "gain_muscle" ? 14 : 10;
  } else if (proteinPer100Kcal >= 7) {
    score += 5;
  } else if (objectiveKey === "gain_muscle" && product.proteinPer100g < 4) {
    score -= 10;
  }

  if (typeof product.fiberPer100g === "number" && product.fiberPer100g >= 4) {
    score += 6;
  }

  score = Math.max(5, Math.min(100, Math.round(score)));

  const hasDangerAlert = alerts.some((a) => a.severity === "danger");
  let verdict: SupermarketVerdict = "moderate";
  if (hasDangerAlert || score < 46 || stamps.length >= 3) {
    verdict = "avoid";
  } else if (score >= 72 && alerts.length === 0 && stamps.length <= 1) {
    verdict = "great";
  }

  // 3. Pros y Contras legibles en el pasillo
  const pros: string[] = [];
  const cons: string[] = [];

  if (stamps.length === 0) {
    pros.push("Libre de sellos negros (Ley 20.606).");
  }
  if (proteinPer100Kcal >= 10) {
    pros.push(`Alta densidad proteica (${proteinPer100Kcal} g de proteína cada 100 kcal).`);
  } else if (product.proteinPer100g >= 10) {
    pros.push(`Buen aporte de proteína (${product.proteinPer100g} g por ${basisLabel}).`);
  }
  if (typeof product.sugarsPer100g === "number" && product.sugarsPer100g < sugarLimit * 0.5) {
    pros.push(`Bajo en azúcares (${product.sugarsPer100g} g por ${basisLabel}).`);
  }
  if (calLevel === "good") {
    pros.push(`Liviano en calorías (${Math.round(product.caloriesPer100g)} kcal por ${basisLabel}).`);
  }
  if (typeof product.fiberPer100g === "number" && product.fiberPer100g >= 4) {
    pros.push(`Buena fuente de fibra (${product.fiberPer100g} g) para mayor saciedad.`);
  }

  for (const alert of alerts) {
    cons.push(`${alert.label}: ${alert.message}`);
  }
  if (stampSet.has("sugars")) {
    cons.push(
      typeof product.sugarsPer100g === "number"
        ? `Alto en azúcares (${product.sugarsPer100g} g por ${basisLabel}).`
        : "Alto en azúcares simples según Ley 20.606."
    );
  }
  if (stampSet.has("calories")) {
    cons.push(
      objectiveKey === "lose_weight"
        ? `Alto en calorías (${Math.round(product.caloriesPer100g)} kcal/${basisLabel}), dificulta el déficit calórico.`
        : `Alta densidad calórica (${Math.round(product.caloriesPer100g)} kcal/${basisLabel}): cuida la porción.`
    );
  }
  if (stampSet.has("fats")) {
    cons.push(
      typeof product.saturatedFatPer100g === "number"
        ? `Alto en grasas saturadas (${product.saturatedFatPer100g} g/${basisLabel}).`
        : `Alto aporte de grasas (${product.fatPer100g} g/${basisLabel}).`
    );
  }
  if (stampSet.has("sodium")) {
    cons.push(
      typeof product.sodiumMgPer100g === "number"
        ? `Alto en sodio (${product.sodiumMgPer100g} mg/${basisLabel}).`
        : "Alto en sodio."
    );
  }
  if (isUltraProcessed) {
    cons.push("Producto ultraprocesado (NOVA 4): ideal priorizar opciones menos procesadas.");
  }

  // 4. Impacto real en el presupuesto del día del usuario
  const portionFactor = safePortion / 100;
  const portionCalories = Math.round(product.caloriesPer100g * portionFactor);
  const portionProtein = Math.round(product.proteinPer100g * portionFactor * 10) / 10;

  let dayBudgetImpact: DayBudgetImpact | null = null;
  if (typeof remainingCalories === "number" && Number.isFinite(remainingCalories)) {
    const safeRemCal = Math.max(0, remainingCalories);
    const safeRemProt =
      typeof remainingProtein === "number" && Number.isFinite(remainingProtein)
        ? Math.max(0, remainingProtein)
        : null;
    const exceeds = portionCalories > safeRemCal && safeRemCal > 0;
    const calPct = safeRemCal > 0 ? Math.round((portionCalories / safeRemCal) * 100) : null;
    const protPct =
      safeRemProt && safeRemProt > 0
        ? Math.round((portionProtein / safeRemProt) * 100)
        : null;

    let summaryText: string;
    if (safeRemCal === 0) {
      summaryText = `Ya alcanzaste tus calorías de hoy; 1 porción (${Math.round(safePortion)} ${unit}) sumaría ${portionCalories} kcal extra.`;
    } else if (exceeds) {
      summaryText = `⚠️ 1 porción (${Math.round(safePortion)} ${unit} · ${portionCalories} kcal) supera las ${Math.round(safeRemCal)} kcal que te quedan hoy.`;
    } else if (protPct !== null && portionProtein >= 5) {
      summaryText = `1 porción (${Math.round(safePortion)} ${unit}) ocupa ${calPct}% de tus kcal restantes de hoy y cubre ${Math.min(100, protPct)}% de tu proteína pendiente.`;
    } else {
      summaryText = `1 porción (${Math.round(safePortion)} ${unit}) ocupa ${calPct}% de las ${Math.round(safeRemCal)} kcal que te quedan hoy.`;
    }

    dayBudgetImpact = {
      portionCalories,
      portionProtein,
      caloriesPctOfRemaining: calPct,
      proteinPctOfRemaining: protPct,
      exceedsRemainingCalories: exceeds,
      summaryText,
    };
  }

  // 5. Título y resumen directo
  const verdictTitle =
    verdict === "great"
      ? "¡Te sirve súper bien!"
      : verdict === "moderate"
        ? "Con moderación"
        : "Mejor evitarlo para tu dieta";

  let summary: string;
  if (alerts.length > 0) {
    summary = `Choca con tus preferencias (${alerts.map((a) => a.label).join(", ")}). Revisa los ingredientes antes de llevarlo.`;
  } else if (verdict === "great") {
    summary = `Muy buena elección para ${objectiveLabel.toLowerCase()}: ${pros[0] || "perfil nutricional equilibrado."}`;
  } else if (verdict === "moderate") {
    summary = cons[0]
      ? `Puedes llevarlo cuidando la porción. ${cons[0]}`
      : "Perfil intermedio: funciona bien si controlas la porción dentro de tus calorías del día.";
  } else {
    summary = cons[0]
      ? `No es la mejor opción para ${objectiveLabel.toLowerCase()}. ${cons[0]}`
      : `Tiene ${stamps.length} sellos negros Ley 20.606; te conviene buscar una alternativa más limpia en el mismo pasillo.`;
  }

  return {
    verdict,
    score,
    objectiveLabel,
    verdictTitle,
    summary,
    stamps,
    alerts,
    isUltraProcessed,
    proteinPer100Kcal,
    trafficLights,
    pros,
    cons,
    smartTip: substituteSuggestion,
    dayBudgetImpact,
  };
}
