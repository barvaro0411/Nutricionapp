import { DietaryRestriction, DIETARY_RESTRICTION_LABELS } from "@/types/profile";
import { isLiquidFood } from "@/utils/liquidUnits";

export type ChileanStampType = "calories" | "sugars" | "fats" | "sodium";

export interface FoodWarningStamp {
  stamp: ChileanStampType;
  label: string;
  description: string;
}

export interface FoodDietaryAlert {
  type: DietaryRestriction;
  severity: "warning" | "danger";
  label: string;
  message: string;
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * Detecta sellos nutricionales según los umbrales de la Ley de Etiquetado de Chile (Ley 20.606).
 * Se calcula a partir de los nutrientes estandarizados por 100g o 100ml.
 */
export function detectFoodWarningLabels(item: {
  food: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  grams: number;
  unit?: string;
}): FoodWarningStamp[] {
  const stamps: FoodWarningStamp[] = [];
  const grams = Number(item.grams) || 100;
  if (grams <= 0) return stamps;

  const isLiquid = item.unit === "ml" || isLiquidFood(item.food);
  const factor = 100 / grams;
  const cal100 = (Number(item.calories) || 0) * factor;
  const carbs100 = (Number(item.carbs) || 0) * factor;
  const fat100 = (Number(item.fat) || 0) * factor;

  const normalizedFood = normalize(item.food);

  // Umbrales Ley 20.606
  // Sólidos: >= 275 kcal/100g. Líquidos: >= 70 kcal/100ml.
  const calThreshold = isLiquid ? 70 : 275;
  if (cal100 >= calThreshold) {
    stamps.push({
      stamp: "calories",
      label: "ALTO EN CALORÍAS",
      description: `Contiene ${Math.round(cal100)} kcal por cada 100 ${isLiquid ? "ml" : "g"} (límite: ${calThreshold}).`,
    });
  }

  // Azúcares: Sólidos >= 10g/100g. Líquidos >= 5g/100ml.
  // Se evalúa cuando el producto contiene carbohidratos simples o es un snack/dulce/bebida azucarada.
  const sugarThreshold = isLiquid ? 5 : 10;
  const isSavoryLiquid = /\b(sopa|caldo|consome|aceite|vinagre|salsa de soya)\b/i.test(
    normalizedFood
  );
  const isSweetFood =
    /\b(azucar|miel|manjar|chocolate|galleta|dulce|torta|helado|mermelada|gaseosa|bebida|nestea|jugo|fruta|caramelo|coca|cola|pepsi|fanta|sprite|bilz|pap|kem|crush|limon soda|canada dry|7up|seven up|red bull|monster|score|gatorade|powerade|aquarius|watts|nectar|refresco|soda|energizante|isotonica|kombucha|batido|yogur|yogurt|milo|nesquik|cereal|barra|queque|pastel|kuchen|alfajor|dona|berlin|flan|postre|gomita|jarabe|syrup)\b/i.test(
      normalizedFood
    );
  if (carbs100 >= sugarThreshold && (isSweetFood || (isLiquid && !isSavoryLiquid))) {
    stamps.push({
      stamp: "sugars",
      label: "ALTO EN AZÚCARES",
      description: `Contiene ${Math.round(carbs100)} g de carbohidratos/azúcares por 100 ${isLiquid ? "ml" : "g"}.`,
    });
  }

  // Grasas saturadas / totales: Sólidos >= 4g saturadas (o >= 14g totales). Líquidos >= 3g.
  const fatThreshold = isLiquid ? 3 : 14;
  const isHighFatFood =
    /\b(mantequilla|queso|fritura|frito|empanada|mayonesa|crema|snack|tocino|salchicha|papas fritas)\b/i.test(
      normalizedFood
    );
  if (fat100 >= fatThreshold && (isHighFatFood || fat100 >= (isLiquid ? 6 : 20))) {
    stamps.push({
      stamp: "fats",
      label: "ALTO EN GRASAS",
      description: `Contiene ${Math.round(fat100)} g de grasas por cada 100 ${isLiquid ? "ml" : "g"}.`,
    });
  }

  // Sodio: productos conocidos por alta salinidad (> 400 mg/100g o 100mg/100ml)
  const isHighSodiumFood =
    /\b(sopa sobre|caldo|ramitas|doritos|papas fritas|embutido|salchicha|vienesas|chorizo|salsa de soya|mostaza|snack salado)\b/i.test(
      normalizedFood
    );
  if (isHighSodiumFood) {
    stamps.push({
      stamp: "sodium",
      label: "ALTO EN SODIO",
      description: "Alimento procesado con alto aporte de sodio por porción.",
    });
  }

  return stamps;
}

/**
 * Detecta si un alimento entra en conflicto con las restricciones del usuario.
 */
export function detectDietaryAlerts(
  foodName: string,
  nutrients: { calories: number; carbs: number; fat: number; grams: number; unit?: string },
  userRestrictions: DietaryRestriction[] = []
): FoodDietaryAlert[] {
  if (!userRestrictions || userRestrictions.length === 0) return [];

  const alerts: FoodDietaryAlert[] = [];
  const text = normalize(foodName);

  for (const restriction of userRestrictions) {
    switch (restriction) {
      case "lactose_intolerance": {
        const isExempt =
          /\b(sin lactosa|deslactosad\w*|leche de (?:almendra|soya|soja|coco|avena|arroz|castana)s?|bebida (?:vegetal|de \w+)|vegetal|vegano)\b/i.test(
            text
          );
        if (
          !isExempt &&
          /\b(leche|queso|yogur|yogurt|crema|manjar|mantequilla|ricotta|suero de leche|parmesano|mozzarella|lactea|lacteo|lactosa)\b/i.test(
            text
          )
        ) {

          alerts.push({
            type: "lactose_intolerance",
            severity: "warning",
            label: "Contiene Lácteos",
            message: "Alimento no recomendado para personas con intolerancia a la lactosa.",
          });
        }
        break;
      }

      case "celiac_gluten": {
        const isExempt =
          /\b(sin gluten|gluten free|harina de arroz|harina de almendra|maicena|fideos de arroz)\b/i.test(
            text
          );
        if (
          !isExempt &&
          /\b(trigo|cebada|centeno|avena|pan|pasta|fideos|harina|galleta|galletas|pizza|empanada|queque|torta|cerveza)\b/i.test(
            text
          )
        ) {
          alerts.push({
            type: "celiac_gluten",
            severity: "danger",
            label: "Contiene Gluten",
            message: "Puede contener trigo, cebada, centeno o avena no certificada.",
          });
        }
        break;
      }

      case "vegan": {
        if (
          /\b(carne|pollo|vacuno|cerdo|pescado|atun|salmon|jamon|huevo|huevos|tocino|salchicha|marisco|camaron|leche|queso|yogur|mantequilla|miel|chorizo|reineta|merluza)\b/i.test(
            text
          )
        ) {
          alerts.push({
            type: "vegan",
            severity: "warning",
            label: "Origen Animal",
            message: "Contiene ingredientes cárnicos, lácteos, huevos o de origen animal.",
          });
        }
        break;
      }

      case "vegetarian": {
        if (
          /\b(carne|pollo|vacuno|cerdo|pescado|atun|salmon|jamon|tocino|salchicha|marisco|camaron|chorizo|longaniza|reineta|merluza|pavo)\b/i.test(
            text
          )
        ) {
          alerts.push({
            type: "vegetarian",
            severity: "warning",
            label: "Contiene Carne / Pescado",
            message: "Contiene carne de ave, vacuno, cerdo o pescado.",
          });
        }
        break;
      }

      case "low_sugar": {
        const stamps = detectFoodWarningLabels({
          food: foodName,
          ...nutrients,
          protein: 0,
        });
        const hasSugarStamp = stamps.some((s) => s.stamp === "sugars");
        if (
          hasSugarStamp ||
          /\b(azucar|manjar|dulce|chocolate|caramelo|torta|galleta dulce|helado|mermelada|gaseosa|bebida comun)\b/i.test(
            text
          )
        ) {
          alerts.push({
            type: "low_sugar",
            severity: "warning",
            label: "Alto en Azúcar",
            message: "Producto alto en azúcares simples, incompatible con tu meta baja en azúcar.",
          });
        }
        break;
      }

      case "low_sodium": {
        const stamps = detectFoodWarningLabels({
          food: foodName,
          ...nutrients,
          protein: 0,
        });
        const hasSodiumStamp = stamps.some((s) => s.stamp === "sodium");
        if (
          hasSodiumStamp ||
          /\b(sal|embutido|salchicha|vienesas|papas fritas|snack salado|salsa de soya|caldo maggi|ramitas|doritos)\b/i.test(
            text
          )
        ) {
          alerts.push({
            type: "low_sodium",
            severity: "warning",
            label: "Alto en Sodio",
            message: "Producto alto en sodio, no recomendado para dietas bajas en sal.",
          });
        }
        break;
      }

      case "nut_allergy": {
        if (
          /\b(mani|nuez|nueces|almendra|almendras|castaña|castañas|avellana|avellanas|pistacho|pistachos|praline|nutella)\b/i.test(
            text
          )
        ) {
          alerts.push({
            type: "nut_allergy",
            severity: "danger",
            label: "Alérgeno: Frutos Secos",
            message: "Contiene maní, nueces o frutos secos de árbol.",
          });
        }
        break;
      }

      case "seafood_allergy": {
        if (
          /\b(marisco|mariscos|camaron|camarones|jaiba|centolla|chorito|choritos|almeja|almejas|macha|machas|ostion|ostiones|pescado|salmon|merluza|reineta|atun|congrio)\b/i.test(
            text
          )
        ) {
          alerts.push({
            type: "seafood_allergy",
            severity: "danger",
            label: "Alérgeno: Mariscos / Pescados",
            message: "Contiene mariscos, crustáceos o pescados.",
          });
        }
        break;
      }
    }
  }

  return alerts;
}

/**
 * Sugiere un sustituto saludable sin sellos cuando un producto presenta sellos Ley 20.606.
 */
export function getHealthySubstituteSuggestion(
  foodName: string,
  stamps: FoodWarningStamp[]
): string | null {
  if (!stamps || stamps.length === 0) return null;
  const text = normalize(foodName);
  const hasSugars = stamps.some((s) => s.stamp === "sugars");
  const hasSodium = stamps.some((s) => s.stamp === "sodium");
  const hasFats = stamps.some((s) => s.stamp === "fats");

  if (
    hasSugars &&
    /\b(coca|cola|pepsi|fanta|sprite|bilz|pap|kem|crush|limon soda|canada dry|7up|seven up|red bull|monster|score|gatorade|powerade|aquarius|watts|nectar|refresco|soda|gaseosa|bebida|jugo|energizante|isotonica)\b/i.test(
      text
    )
  ) {
    return "💡 Alternativa sin sellos: Cambia por versión Zero / Sin Azúcar o agua con gas y limón.";
  }

  if (hasSodium) {
    if (/\b(atun|jurel|sardina|conserva)\b/i.test(text)) {
      return "💡 Alternativa sin sellos: Prefiere atún o pescado al agua bajo en sodio.";
    }
    if (/\b(embutido|salchicha|vienesas|chorizo|jamon)\b/i.test(text)) {
      return "💡 Alternativa sin sellos: Prefiere pechuga de pollo, pavo natural cocido o huevo duro.";
    }
    return "💡 Alternativa sin sellos: Prefiere frutos secos sin sal o cabritas caseras sin sodio añadido.";
  }

  if (hasFats) {
    if (/\b(queso|mantequilla|crema)\b/i.test(text)) {
      return "💡 Alternativa sin sellos: Prefiere quesillo, ricotta fresca o palta natural.";
    }
    if (/\b(fritura|frito|papas fritas|empanada)\b/i.test(text)) {
      return "💡 Alternativa sin sellos: Prefiere versión al horno, en freidora de aire o a la plancha.";
    }
    return "💡 Alternativa sin sellos: Opta por preparaciones a la plancha o al horno con aceite de oliva moderado.";
  }

  if (hasSugars) {
    return "💡 Alternativa sin sellos: Prefiere versión sin azúcar añadida, fruta fresca o endulzado con stevia.";
  }

  return "💡 Alternativa sin sellos: Modera la porción o acompaña con verduras frescas y proteína magra.";
}

/**
 * Evalúa conjuntamente sellos oficiales de advertencia, alertas dietéticas y sugerencias saludables.
 */
export function evaluateFoodAlerts(
  item: {
    food: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    grams: number;
    unit?: string;
  },
  userRestrictions: DietaryRestriction[] = []
): {
  stamps: FoodWarningStamp[];
  alerts: FoodDietaryAlert[];
  substituteSuggestion: string | null;
} {
  const stamps = detectFoodWarningLabels(item);
  const alerts = detectDietaryAlerts(item.food, item, userRestrictions);
  const substituteSuggestion = getHealthySubstituteSuggestion(item.food, stamps);
  return { stamps, alerts, substituteSuggestion };
}

/**
 * Determina si una receta es compatible con las restricciones del usuario.
 */
export function isRecipeCompatible(
  recipe: {
    title: string;
    description?: string | null;
    ingredients: Array<{ foodName: string }>;
  },
  userRestrictions: DietaryRestriction[] = []
): { compatible: boolean; alerts: FoodDietaryAlert[] } {
  if (!userRestrictions || userRestrictions.length === 0) {
    return { compatible: true, alerts: [] };
  }

  const allAlerts: FoodDietaryAlert[] = [];
  const seenTypes = new Set<string>();

  // Evaluar título de la receta
  const titleAlerts = detectDietaryAlerts(
    recipe.title,
    { calories: 0, carbs: 0, fat: 0, grams: 100 },
    userRestrictions
  );
  for (const alert of titleAlerts) {
    if (!seenTypes.has(alert.type)) {
      seenTypes.add(alert.type);
      allAlerts.push(alert);
    }
  }

  // Evaluar cada ingrediente
  for (const ing of recipe.ingredients) {
    const ingAlerts = detectDietaryAlerts(
      ing.foodName,
      { calories: 0, carbs: 0, fat: 0, grams: 100 },
      userRestrictions
    );
    for (const alert of ingAlerts) {
      if (!seenTypes.has(alert.type)) {
        seenTypes.add(alert.type);
        allAlerts.push({
          ...alert,
          message: `${DIETARY_RESTRICTION_LABELS[alert.type].label}: Contiene ${ing.foodName}.`,
        });
      }
    }
  }

  return {
    compatible: allAlerts.length === 0,
    alerts: allAlerts,
  };
}
