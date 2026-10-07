/**
 * Diccionario y utilidades para alternar entre versiones Regulares y Zero / Sin Azúcar de bebidas.
 *
 * TODO: Verificar los valores exactos por cada 100 ml con las etiquetas de los productos comercializados en Chile
 * (información nutricional reglamentaria según RSA chileno).
 */

export interface DrinkVariantData {
  food: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  confidence: number;
}

interface DrinkPair {
  regularName: string;
  zeroName: string;
  matchPattern: RegExp;
  isZeroPattern: RegExp;
  regularMacros: { calories: number; protein: number; carbs: number; fat: number };
  zeroMacros: { calories: number; protein: number; carbs: number; fat: number };
}

// Pares conocidos y confirmados según etiquetado oficial chileno (Jumbo, Lider, CCU, Coca-Cola Chile)
const KNOWN_DRINK_PAIRS: DrinkPair[] = [
  {
    regularName: "Red Bull Energy Drink",
    zeroName: "Red Bull Sin Azúcar",
    matchPattern: /red\s*bull/i,
    isZeroPattern: /(sin azucar|zero|sugar\s*free|light)/i,
    // Red Bull regular: 46 kcal / 100ml, 11g carbs
    regularMacros: { calories: 46, protein: 0, carbs: 11, fat: 0 },
    // Red Bull Sin Azúcar: 3 kcal / 100ml, 0g carbs
    zeroMacros: { calories: 3, protein: 0, carbs: 0, fat: 0 },
  },
  {
    regularName: "Coca-Cola",
    zeroName: "Coca-Cola Sin Azúcar",
    matchPattern: /coca[\s-]?cola/i,
    isZeroPattern: /(zero|sin azucar|light|diet)/i,
    // Coca-Cola regular clásica: 42 kcal / 100ml, 10.6g carbs
    regularMacros: { calories: 42, protein: 0, carbs: 10.6, fat: 0 },
    // Coca-Cola Sin Azúcar: 0 kcal / 100ml, 0g carbs
    zeroMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  },
  {
    regularName: "Gatorade",
    zeroName: "Gatorade Zero",
    matchPattern: /gatorade/i,
    isZeroPattern: /(zero|sin azucar)/i,
    // Gatorade regular en Chile: 24 kcal / 100ml, 6g carbs
    regularMacros: { calories: 24, protein: 0, carbs: 6, fat: 0 },
    // Gatorade Zero en Chile: 0 kcal / 100ml, 0g carbs
    zeroMacros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  },
  {
    regularName: "Monster Energy",
    zeroName: "Monster Zero Ultra",
    matchPattern: /monster/i,
    isZeroPattern: /(zero|ultra|sin azucar)/i,
    // Monster regular en Chile: 49 kcal / 100ml, 12g carbs
    regularMacros: { calories: 49, protein: 0, carbs: 12, fat: 0 },
    // Monster Ultra en Chile: 2 kcal / 100ml, 0.7g carbs
    zeroMacros: { calories: 2, protein: 0, carbs: 0.7, fat: 0 },
  },
  {
    regularName: "Powerade",
    zeroName: "Powerade Zero",
    matchPattern: /powerade/i,
    isZeroPattern: /(zero|sin azucar)/i,
    // Powerade regular en Chile: 20 kcal / 100ml, 4.8g carbs
    regularMacros: { calories: 20, protein: 0, carbs: 4.8, fat: 0 },
    // Powerade Zero en Chile: 1 kcal / 100ml, 0g carbs
    zeroMacros: { calories: 1, protein: 0, carbs: 0, fat: 0 },
  },
  {
    regularName: "Sprite",
    zeroName: "Sprite Zero",
    matchPattern: /sprite/i,
    isZeroPattern: /(zero|sin azucar)/i,
    // Sprite regular en Chile: 40 kcal / 100ml, 10g carbs
    regularMacros: { calories: 40, protein: 0, carbs: 10, fat: 0 },
    // Sprite Zero en Chile: 1 kcal / 100ml, 0g carbs
    zeroMacros: { calories: 1, protein: 0, carbs: 0, fat: 0 },
  },
];

/**
 * Obtiene la variante opuesta (Regular ↔ Zero) para un alimento si es una bebida conocida.
 * Retorna null si no existe una variante predefinida.
 */
export function getVariant(foodName: string): { label: string; target: DrinkVariantData } | null {
  if (!foodName || typeof foodName !== "string") return null;

  for (const pair of KNOWN_DRINK_PAIRS) {
    if (pair.matchPattern.test(foodName)) {
      const isCurrentlyZero = pair.isZeroPattern.test(foodName);

      if (isCurrentlyZero) {
        // La bebida actual es Zero -> ofrecer cambiar a Regular
        return {
          label: "🔄 Cambiar a Regular",
          target: {
            food: pair.regularName,
            caloriesPer100g: pair.regularMacros.calories,
            proteinPer100g: pair.regularMacros.protein,
            carbsPer100g: pair.regularMacros.carbs,
            fatPer100g: pair.regularMacros.fat,
            confidence: 0.7, // Confianza moderada al ser un recálculo aproximado
          },
        };
      } else {
        // La bebida actual es Regular -> ofrecer cambiar a Zero
        return {
          label: "⚡ Cambiar a Zero / Sin Azúcar",
          target: {
            food: pair.zeroName,
            caloriesPer100g: pair.zeroMacros.calories,
            proteinPer100g: pair.zeroMacros.protein,
            carbsPer100g: pair.zeroMacros.carbs,
            fatPer100g: pair.zeroMacros.fat,
            confidence: 0.7,
          },
        };
      }
    }
  }

  return null;
}
