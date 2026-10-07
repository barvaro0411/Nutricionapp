import { FoodUnit } from "@/types/meal";

export type ParseResult =
  | { ok: true; value: number; unit: FoodUnit }
  | { ok: false; error: string };

/**
 * Normaliza un texto removiendo acentos, pasando a minúsculas y eliminando espacios extra.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Palabras clave y frases que identifican bebidas y líquidos.
 */
const LIQUID_TERMS = [
  "red bull",
  "gatorade",
  "powerade",
  "monster",
  "agua",
  "bebida",
  "jugo",
  "leche",
  "cafe",
  "te",
  "cerveza",
  "energizante",
  "nectar",
  "refresco",
  "soda",
  "gaseosa",
  "kombucha",
  "batido",
  "isotonica",
  "vino",
  "sprite",
  "coca cola",
  "coca-cola",
  "fanta",
];

/**
 * Términos que descalifican un alimento como líquido (ej: leche en polvo, café molido).
 */
const SOLID_EXCEPTIONS = [
  "en polvo",
  "molido",
  "molida",
  "hojas",
  "granulado",
  "capsula",
  "capsulas",
  "barra",
  "galleta",
];

/**
 * Determina si un alimento es una bebida o líquido basándose en su nombre.
 * - Coincidencia por palabra completa (para evitar falsos positivos como "tetera" o "tertulia").
 * - Se asume 1 ml ≈ 1 g para el cálculo de macronutrientes (error menor aceptable para bebidas y leche).
 */
export function isLiquidFood(foodName: string): boolean {
  if (!foodName || typeof foodName !== "string") return false;
  const normalized = normalizeText(foodName);
  if (!normalized) return false;

  // Si contiene alguna excepción sólida forzosa, no es líquido
  for (const exc of SOLID_EXCEPTIONS) {
    const excRegex = new RegExp(`(^|\\s|\\W)${exc}($|\\s|\\W)`, "i");
    if (excRegex.test(normalized)) {
      return false;
    }
  }

  // Verificar coincidencias de términos líquidos por palabra completa
  for (const term of LIQUID_TERMS) {
    // Escapar caracteres regex y verificar límites de palabra
    const safeTerm = term.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`(^|\\s|\\W)${safeTerm}($|\\s|\\W)`, "i");
    if (regex.test(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Parsea una entrada de cantidad (peso o volumen) en formato chileno.
 * Acepta sufijos como: 1L, 1.5L, 1,5 l, 250ml, 250cc, 33cl, 500g, 1kg, 1.000.
 */
export function parseQuantityInput(input: string, currentUnit: FoodUnit): ParseResult {
  if (!input || typeof input !== "string") {
    return { ok: false, error: "Ingresa una cantidad válida" };
  }

  const raw = input.trim().toLowerCase();
  if (!raw) {
    return { ok: false, error: "Ingresa una cantidad válida" };
  }

  let cleanStr = raw;
  let detectedUnit: FoodUnit = currentUnit;
  let multiplier = 1;

  // 1. Detección de sufijos (orden estricto para evitar que 'l' consuma el final de 'ml' o 'cl')
  if (/(ml|cc)$/i.test(cleanStr)) {
    cleanStr = cleanStr.replace(/(ml|cc)$/i, "").trim();
    detectedUnit = "ml";
    multiplier = 1;
  } else if (/cl$/i.test(cleanStr)) {
    cleanStr = cleanStr.replace(/cl$/i, "").trim();
    detectedUnit = "ml";
    multiplier = 10;
  } else if (/(litros?|lts?|lt|l)$/i.test(cleanStr)) {
    cleanStr = cleanStr.replace(/(litros?|lts?|lt|l)$/i, "").trim();
    detectedUnit = "ml";
    multiplier = 1000;
  } else if (/kg$/i.test(cleanStr)) {
    cleanStr = cleanStr.replace(/kg$/i, "").trim();
    detectedUnit = "g";
    multiplier = 1000;
  } else if (/(gr|g)$/i.test(cleanStr)) {
    cleanStr = cleanStr.replace(/(gr|g)$/i, "").trim();
    detectedUnit = "g";
    multiplier = 1;
  }

  if (!cleanStr) {
    return { ok: false, error: "Ingresa una cantidad válida" };
  }

  // 2. Interpretación numérica
  let numericValue: number;

  if (multiplier === 1000 && detectedUnit === "ml") {
    // Con sufijo de litros (1L, 1.5L, 1,5 l), . y , son SIEMPRE separador decimal
    const normalizedDecimal = cleanStr.replace(/,/g, ".");
    if (!/^\d+(\.\d+)?$/.test(normalizedDecimal)) {
      return { ok: false, error: "Ingresa una cantidad válida" };
    }
    numericValue = parseFloat(normalizedDecimal) * 1000;
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleanStr)) {
    // Formato de miles chileno con punto (ej: 1.000 o 2.500 sin sufijo)
    const withoutThousands = cleanStr.replace(/\./g, "");
    numericValue = parseFloat(withoutThousands) * multiplier;
  } else {
    // Decimal estándar: reemplazar coma por punto
    const normalizedDecimal = cleanStr.replace(/,/g, ".");
    if (!/^\d+(\.\d+)?$/.test(normalizedDecimal)) {
      return { ok: false, error: "Ingresa una cantidad válida" };
    }
    numericValue = parseFloat(normalizedDecimal) * multiplier;
  }

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return { ok: false, error: "Ingresa una cantidad válida" };
  }

  // Redondear a entero para ml; permitir 1 decimal para g
  const finalValue =
    detectedUnit === "ml"
      ? Math.round(numericValue)
      : Math.round(numericValue * 10) / 10;

  // Límites seguros: 1 a 5.000
  if (detectedUnit === "ml") {
    if (finalValue < 1 || finalValue > 5000) {
      return { ok: false, error: "Ingresa entre 1 y 5.000 ml" };
    }
  } else {
    if (finalValue < 1 || finalValue > 5000) {
      return { ok: false, error: "Ingresa entre 1 y 5.000 g" };
    }
  }

  return {
    ok: true,
    value: finalValue,
    unit: detectedUnit,
  };
}

/**
 * Formatea una cantidad para mostrarla de forma clara en la UI (formato chileno).
 * Ej: 250 ml, 1 L, 1,5 L, 150 g, 1.000 g.
 */
export function formatQuantityDisplay(amount: number, unit: FoodUnit): string {
  if (unit === "ml") {
    if (amount >= 1000) {
      const liters = amount / 1000;
      if (liters % 1 === 0) {
        return `${liters} L`;
      }
      return `${liters.toString().replace(".", ",")} L`;
    }
    return `${Math.round(amount)} ml`;
  }

  // Para gramos, usar formateador de miles chileno
  const formatter = new Intl.NumberFormat("es-CL", {
    maximumFractionDigits: 1,
  });
  return `${formatter.format(amount)} g`;
}

/**
 * Porciones estándar recomendadas para botones de acceso rápido.
 */
export function getStandardPortions(unit: FoodUnit): { label: string; value: number }[] {
  if (unit === "ml") {
    return [
      { label: "200 ml (Vaso)", value: 200 },
      { label: "250 ml (Lata chica)", value: 250 },
      { label: "350 ml (Lata)", value: 350 },
      { label: "500 ml (Botella)", value: 500 },
      { label: "1 L (Botella grande)", value: 1000 },
    ];
  }

  return [
    { label: "100 g", value: 100 },
    { label: "150 g", value: 150 },
    { label: "200 g", value: 200 },
    { label: "250 g", value: 250 },
    { label: "300 g", value: 300 },
  ];
}

/**
 * Resuelve la unidad efectiva de un ítem para visualización.
 * Retrocompatible: si un ítem histórico tiene unit = 'g' pero su nombre es claramente líquido, devuelve 'ml'.
 */
export function resolveItemUnit(item: {
  food?: string;
  food_name?: string;
  unit?: FoodUnit;
}): FoodUnit {
  if (item.unit === "ml") return "ml";
  const name = item.food || item.food_name || "";
  if (isLiquidFood(name)) return "ml";
  return "g";
}

/**
 * Parsea el texto libre de cantidad que devuelve Open Food Facts (ej: "250 ml", "1 L", "33 cl", "6 x 330 ml").
 */
export function parseProductQuantity(text: string): { value: number; unit: FoodUnit } | null {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Manejo de multipacks como "6 x 330 ml" -> tomar el volumen unitario "330 ml"
  const multiPackMatch = trimmed.match(/\d+\s*[xX]\s*(\d+(?:[.,]\d+)?\s*(?:ml|cc|cl|l|lt|g|kg))/i);
  const targetText = multiPackMatch ? multiPackMatch[1] : trimmed;

  const result = parseQuantityInput(targetText, "g");
  if (result.ok) {
    return { value: result.value, unit: result.unit };
  }
  return null;
}
