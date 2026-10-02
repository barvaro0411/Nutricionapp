export interface FoodVariant {
  food: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface FoodFamily {
  category: string;
  variants: FoodVariant[];
}

export const CHILEAN_FOOD_FAMILIES: Record<string, FoodFamily> = {
  pollo: {
    category: "Pollo y Aves",
    variants: [
      { food: "Pechuga de pollo a la plancha", caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 },
      { food: "Pechuga de pollo cocida / hervida", caloriesPer100g: 150, proteinPer100g: 29, carbsPer100g: 0, fatPer100g: 3.0 },
      { food: "Trutro de pollo al horno con piel", caloriesPer100g: 215, proteinPer100g: 24, carbsPer100g: 0, fatPer100g: 13.0 },
      { food: "Trutro de pollo sin piel", caloriesPer100g: 170, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 7.0 },
      { food: "Pollo frito / apanado", caloriesPer100g: 260, proteinPer100g: 22, carbsPer100g: 12, fatPer100g: 14.5 },
    ],
  },
  vacuno: {
    category: "Carnes de Vacuno",
    variants: [
      { food: "Posta negra / rosada a la plancha", caloriesPer100g: 145, proteinPer100g: 28, carbsPer100g: 0, fatPer100g: 3.5 },
      { food: "Lomo liso a la plancha", caloriesPer100g: 210, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 11.5 },
      { food: "Lomo vetado a la parrilla", caloriesPer100g: 280, proteinPer100g: 24, carbsPer100g: 0, fatPer100g: 20.0 },
      { food: "Carne molida tártaro (magra)", caloriesPer100g: 155, proteinPer100g: 27, carbsPer100g: 0, fatPer100g: 5.0 },
      { food: "Carne molida corriente", caloriesPer100g: 240, proteinPer100g: 22, carbsPer100g: 0, fatPer100g: 17.0 },
    ],
  },
  pan: {
    category: "Pan Chileno",
    variants: [
      { food: "Marraqueta chilena", caloriesPer100g: 270, proteinPer100g: 8.5, carbsPer100g: 56, fatPer100g: 1.0 },
      { food: "Hallulla tradicional", caloriesPer100g: 310, proteinPer100g: 8.0, carbsPer100g: 54, fatPer100g: 7.0 },
      { food: "Pan amasado", caloriesPer100g: 330, proteinPer100g: 7.5, carbsPer100g: 52, fatPer100g: 10.5 },
      { food: "Pan molde blanco", caloriesPer100g: 265, proteinPer100g: 8.0, carbsPer100g: 50, fatPer100g: 3.5 },
      { food: "Pan molde integral", caloriesPer100g: 245, proteinPer100g: 9.5, carbsPer100g: 44, fatPer100g: 3.2 },
    ],
  },
  acompanamientos: {
    category: "Acompañamientos Típicos",
    variants: [
      { food: "Arroz blanco graneado", caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 },
      { food: "Arroz integral", caloriesPer100g: 112, proteinPer100g: 2.6, carbsPer100g: 23, fatPer100g: 0.9 },
      { food: "Papas cocidas", caloriesPer100g: 86, proteinPer100g: 1.7, carbsPer100g: 20, fatPer100g: 0.1 },
      { food: "Papas fritas caseras", caloriesPer100g: 312, proteinPer100g: 3.4, carbsPer100g: 41, fatPer100g: 15.0 },
      { food: "Puré de papas con leche y mantequilla", caloriesPer100g: 110, proteinPer100g: 2.0, carbsPer100g: 16, fatPer100g: 4.2 },
      { food: "Fideos / Tallarines cocidos", caloriesPer100g: 140, proteinPer100g: 5.0, carbsPer100g: 28, fatPer100g: 0.7 },
    ],
  },
  platos_chilenos: {
    category: "Platos Preparados Chilenos",
    variants: [
      { food: "Cazuela de vacuno", caloriesPer100g: 75, proteinPer100g: 6.5, carbsPer100g: 7.0, fatPer100g: 2.5 },
      { food: "Cazuela de ave", caloriesPer100g: 68, proteinPer100g: 6.0, carbsPer100g: 6.5, fatPer100g: 2.0 },
      { food: "Pastel de choclo", caloriesPer100g: 175, proteinPer100g: 8.0, carbsPer100g: 20, fatPer100g: 7.0 },
      { food: "Charquicán con huevo frito", caloriesPer100g: 135, proteinPer100g: 6.2, carbsPer100g: 15, fatPer100g: 5.5 },
      { food: "Porotos con riendas", caloriesPer100g: 140, proteinPer100g: 7.0, carbsPer100g: 22, fatPer100g: 2.5 },
      { food: "Empanada de pino al horno (1 unidad ~200g)", caloriesPer100g: 250, proteinPer100g: 9.0, carbsPer100g: 26, fatPer100g: 12.0 },
      { food: "Completo italiano (pan, vienesa, palta, tomate, mayo)", caloriesPer100g: 210, proteinPer100g: 6.5, carbsPer100g: 21, fatPer100g: 11.0 },
    ],
  },
};

/**
 * Busca si un nombre de alimento detectado corresponde a una familia de alimentos para ofrecer variantes
 */
export function findFamilyForFood(foodName: string): FoodFamily | null {
  const lower = foodName.toLowerCase();
  if (lower.includes("pollo")) return CHILEAN_FOOD_FAMILIES.pollo;
  if (lower.includes("carne") || lower.includes("vacuno") || lower.includes("lomo") || lower.includes("posta")) {
    return CHILEAN_FOOD_FAMILIES.vacuno;
  }
  if (lower.includes("marraqueta") || lower.includes("hallulla") || lower.includes("pan")) {
    return CHILEAN_FOOD_FAMILIES.pan;
  }
  if (lower.includes("arroz") || lower.includes("papa") || lower.includes("fideos")) {
    return CHILEAN_FOOD_FAMILIES.acompanamientos;
  }
  return null;
}
