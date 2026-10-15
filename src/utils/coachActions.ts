import { MealType } from "@/types/meal";

/**
 * Acciones que el Coach puede ejecutar directamente a partir de un comando del usuario.
 * La detección es local (sin IA) para no gastar cuota en enrutar la intención; solo las
 * comidas requieren una llamada a `parse-meal-text` para estimar nutrientes.
 */
export type CoachAction =
  | { type: "water"; amountMl: number; source: string }
  | { type: "meal"; description: string; mealType: MealType; source: string };

export type CoachActionStatus = "pending" | "executing" | "confirmed" | "undone" | "error";

export interface CoachWaterActionData {
  id: string;
  type: "water";
  amountMl: number;
  status: CoachActionStatus;
  logId?: string;
  error?: string;
}

export interface CoachMealItemData {
  food: string;
  grams: number;
  unit: "g" | "ml";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface CoachMealActionData {
  id: string;
  type: "meal";
  description: string;
  mealType: MealType;
  status: CoachActionStatus;
  items: CoachMealItemData[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  mealId?: string;
  error?: string;
}

export type CoachActionData = CoachWaterActionData | CoachMealActionData;

const ACTION_TAG_REGEX = /<!--coach-action:([\s\S]*?)-->/;

/** Embebe datos de acción estructurados en el contenido del mensaje */
export function embedCoachAction(text: string, action: CoachActionData): string {
  return `${text.trim()}\n\n<!--coach-action:${JSON.stringify(action)}-->`;
}

/**
 * Detecta si un mensaje del Coach describe una comida o receta estructurada con viñetas y macros,
 * generando una acción pendiente para que el usuario pueda registrarla directamente en 1 clic.
 */
export function detectMealSuggestionFromText(text: string): CoachMealActionData | null {
  if (!text || text.length < 35) return null;

  // Extraer calorías totales del mensaje (ej: "🔥 340 kcal", "340 kcal", "340 calorías")
  const calMatch = text.match(/(?:🔥\s*)?(\d{2,4})\s*(?:kcal|calorías|cal)/i);
  if (!calMatch) return null;

  const totalCalories = parseInt(calMatch[1], 10);
  if (totalCalories < 50 || totalCalories > 2500) return null;

  const protMatch = text.match(/(?:🥩\s*)?(\d{1,3})\s*(?:g\s*P|g\s*(?:de\s*)?proteína)/i);
  const carbsMatch = text.match(/(?:🍞\s*)?(\d{1,3})\s*(?:g\s*C|g\s*(?:de\s*)?carbos)/i);
  const fatMatch = text.match(/(?:🥑\s*)?(\d{1,3})\s*(?:g\s*G|g\s*(?:de\s*)?grasas)/i);

  const totalProtein = protMatch ? parseInt(protMatch[1], 10) : 0;
  const totalCarbs = carbsMatch ? parseInt(carbsMatch[1], 10) : 0;
  const totalFat = fatMatch ? parseInt(fatMatch[1], 10) : 0;

  // Extraer líneas con viñetas que representan ingredientes
  const lines = text.split("\n");
  const items: CoachMealItemData[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^(?:[•\-*]|\d+\.)\s+(.+)$/);
    if (!bulletMatch) continue;

    const itemText = bulletMatch[1].trim();
    if (/^(🔥|🥩|🍞|🥑|total|aporte|nota)/i.test(itemText)) continue;

    let grams = 50;
    let unit: "g" | "ml" = "g";
    let food = itemText;

    const parenMatch = itemText.match(/\((\d+)\s*(g|ml)\)/i);
    if (parenMatch) {
      grams = parseInt(parenMatch[1], 10);
      unit = parenMatch[2].toLowerCase() as "g" | "ml";
      food = itemText.replace(/\s*\(\d+\s*(?:g|ml)\)/i, "").trim();
    } else {
      const directMatch = itemText.match(/^(\d+(?:[.,]\d+)?)\s*(g|ml)\s+(?:de\s+)?(.+)$/i);
      if (directMatch) {
        grams = Math.round(parseFloat(directMatch[1].replace(",", ".")));
        unit = directMatch[2].toLowerCase() as "g" | "ml";
        food = directMatch[3].trim();
      }
    }

    food = food.replace(/[:\-–—].*$/, "").trim();
    if (food.length >= 2 && food.length <= 60) {
      items.push({
        food,
        grams,
        unit,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    }
  }

  if (items.length < 2) return null;

  // Distribuir calorías y macros equitativamente entre los ingredientes detectados
  const perItemCal = Math.round(totalCalories / items.length);
  const perItemProt = Math.round(totalProtein / items.length);
  const perItemCarbs = Math.round(totalCarbs / items.length);
  const perItemFat = Math.round(totalFat / items.length);

  items.forEach((it) => {
    it.calories = perItemCal;
    it.protein = perItemProt;
    it.carbs = perItemCarbs;
    it.fat = perItemFat;
  });

  const lower = text.toLowerCase();
  let mealType: MealType = "desayuno";
  if (lower.includes("almuerzo")) mealType = "almuerzo";
  else if (lower.includes("cena") || lower.includes("once")) mealType = "cena";
  else if (lower.includes("colacion") || lower.includes("colación") || lower.includes("snack")) mealType = "snack";
  else if (lower.includes("desayuno")) mealType = "desayuno";
  else mealType = mealTypeForTime(new Date());

  const titleMatch = text.match(/\*\*(.+?)\*\*/);
  const description =
    titleMatch && titleMatch[1].length < 45 && !titleMatch[1].includes(":")
      ? titleMatch[1].trim()
      : `Opción de ${mealType}`;

  const idHash = items
    .map((i) => i.food)
    .join("-")
    .toLowerCase()
    .slice(0, 32);

  return {
    id: `auto-meal-${idHash}`,
    type: "meal",
    description,
    mealType,
    status: "pending",
    items,
    totals: {
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
    },
  };
}

/** Extrae la acción estructurada y limpia el contenido visible del mensaje */
export function extractCoachAction(content: string): {
  cleanContent: string;
  action: CoachActionData | null;
} {
  const match = content.match(ACTION_TAG_REGEX);
  if (match) {
    try {
      const action = JSON.parse(match[1]) as CoachActionData;
      const cleanContent = content.replace(ACTION_TAG_REGEX, "").trim();
      return { cleanContent, action };
    } catch {
      // Continuar con detección heurística
    }
  }

  const detected = detectMealSuggestionFromText(content);
  if (detected) {
    return { cleanContent: content, action: detected };
  }

  return { cleanContent: content, action: null };
}

const GLASS_ML = 250;
const MAX_WATER_ML = 5000;

const normalize = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

/** Elimina saludos y vocativos iniciales como "Coach," u "oye coach". */
const stripVocative = (text: string) =>
  text.replace(/^(oye |hola |ya |ok |okay )?(coach|coachcito|asistente)[,:!\s]+/, "").replace(/^por favor[,\s]+/, "");

const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
};

function parseQuantity(token: string): number | null {
  const cleaned = token.replace(",", ".");
  const numeric = Number(cleaned);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return NUMBER_WORDS[token] ?? null;
}

const LOG_VERBS = "(anota|anotame|registra|registrame|agrega|agregame|suma|sumame|pon|ponme|guarda|guardame)";
const DRINK_VERBS = "(tome|me tome|bebi|me bebi|tomamos)";

/** Detecta registros de agua: "anota 500 ml de agua", "me tomé 2 vasos de agua", "registra medio litro de agua". */
export function detectWaterAction(raw: string): CoachAction | null {
  const text = stripVocative(normalize(raw));
  if (!/\bagua\b/.test(text)) return null;
  if (!new RegExp(`^(que )?${LOG_VERBS}\\b|\\b${DRINK_VERBS}\\b`).test(text)) return null;
  // Preguntas ("¿cuánta agua tomé?") no son comandos.
  if (/^(cuanta|cuanto|cuantos|como|que tal)\b/.test(text) || raw.trim().endsWith("?")) return null;

  let amountMl: number | null = null;
  if (/\bmedio litro\b/.test(text)) amountMl = 500;
  else if (/\b(un|1) litro y medio\b/.test(text)) amountMl = 1500;
  else {
    const match = text.match(/(\d+(?:[.,]\d+)?|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s*(ml|mililitros?|cc|l|lt|lts|litros?|vasos?|botellas?|tazas?)\b/);
    if (match) {
      const quantity = parseQuantity(match[1]);
      const unit = match[2];
      if (quantity !== null) {
        if (/^(ml|mililitro|mililitros|cc)$/.test(unit)) amountMl = quantity;
        else if (/^(l|lt|lts|litro|litros)$/.test(unit)) amountMl = quantity * 1000;
        else if (/^vasos?$/.test(unit) || /^tazas?$/.test(unit)) amountMl = quantity * GLASS_ML;
        else if (/^botellas?$/.test(unit)) amountMl = quantity * 500;
      }
    } else if (/\bun vaso\b/.test(text)) amountMl = GLASS_ML;
  }
  if (amountMl === null) return null;
  amountMl = Math.round(amountMl);
  if (amountMl <= 0 || amountMl > MAX_WATER_ML) return null;
  return { type: "water", amountMl, source: raw.trim() };
}

const MEAL_VERB_TYPES: [RegExp, MealType | null][] = [
  [/\bdesayune\b/, "desayuno"],
  [/\balmorce\b/, "almuerzo"],
  [/\b(cene|comi de cena)\b/, "cena"],
  [/\b(once|tome once)\b/, "snack"],
  [/\b(me comi|comi|me servi|picotee)\b/, null],
];

/** Tipo de comida por hora local de Chile si el verbo no lo indica. */
export function mealTypeForTime(date: Date = new Date()): MealType {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Santiago" }).format(date)) % 24;
  if (hour >= 5 && hour < 11) return "desayuno";
  if (hour >= 11 && hour < 16) return "almuerzo";
  if (hour >= 19 && hour < 24) return "cena";
  return "snack";
}

/** Detecta registros de comida: "comí 2 huevos duros y una marraqueta", "Coach, anota que almorcé cazuela". */
export function detectMealAction(raw: string, now: Date = new Date()): CoachAction | null {
  const text = stripVocative(normalize(raw));
  if (raw.trim().endsWith("?")) return null;
  if (/^(que|cuanto|cuanta|cuantas|cuantos|como|puedo|deberia|me recomiendas|recomiendame|si)\b/.test(text)) return null;
  const commandPrefix = new RegExp(`^(${LOG_VERBS} (que )?)?(hoy |recien |ayer )?`);
  const body = text.replace(commandPrefix, "");
  for (const [pattern, mealType] of MEAL_VERB_TYPES) {
    const match = body.match(pattern);
    if (!match || match.index !== 0) continue;
    const description = body.slice(match[0].length).replace(/^(de |al |en el |en la |:)\s*/, "").trim();
    // Requiere al menos un alimento concreto, evita "comí mal hoy" o "comí poco".
    if (description.length < 3 || /^(mal|bien|poco|mucho|nada|demasiado|harto)\b/.test(description)) return null;
    return { type: "meal", description, mealType: mealType ?? mealTypeForTime(now), source: raw.trim() };
  }
  return null;
}

/** Punto de entrada: devuelve la acción a ejecutar o null para conversar normalmente con el Coach. */
export function detectCoachAction(raw: string, now: Date = new Date()): CoachAction | null {
  if (!raw.trim() || raw.length > 500) return null;
  return detectWaterAction(raw) ?? detectMealAction(raw, now);
}
