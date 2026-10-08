// Reviewed SR Legacy references. Never pick the first search result automatically.
// All nutrient values from these records are expressed per 100 g of edible food.
export const USDA_REFERENCES = [
  { fdcId: 168878, description: "Rice, white, long-grain, regular, enriched, cooked", aliases: /^(arroz blanco (cocido|hervido)|arroz (cocido|hervido))$/ },
  { fdcId: 168877, description: "Rice, white, long-grain, regular, raw, enriched", aliases: /^arroz blanco (crudo|seco)$/ },
  { fdcId: 173424, description: "Egg, whole, cooked, hard-boiled", aliases: /^huevos? (duros?|cocidos?|hervidos?)$/ },
  { fdcId: 171705, description: "Avocados, raw, all commercial varieties", aliases: /^(palta|aguacate)( crudo| cruda| fresca| fresco)?$/ },
  { fdcId: 173944, description: "Bananas, raw", aliases: /^(platano|banana)( crudo| cruda| fresco| fresca)?$/ },
  { fdcId: 170393, description: "Carrots, raw", aliases: /^zanahorias?( cruda| crudas| fresca| frescas)?$/ },
  { fdcId: 170457, description: "Tomatoes, red, ripe, raw, year round average", aliases: /^tomates?( crudo| crudos| fresco| frescos)?$/ },
  { fdcId: 170440, description: "Potatoes, boiled, cooked without skin, flesh, without salt", aliases: /^papas? (cocida|cocidas|hervida|hervidas) sin (piel|cascara)$/ },
  { fdcId: 172421, description: "Lentils, mature seeds, cooked, boiled, without salt", aliases: /^lentejas (cocidas|hervidas)( sin sal)?$/ },
  { fdcId: 171477, description: "Chicken, broilers or fryers, breast, meat only, cooked, roasted", aliases: /^pechuga de pollo (al horno|asada) sin piel$/ },
  { fdcId: 171077, description: "Chicken, broiler or fryers, breast, skinless, boneless, meat only, raw", aliases: /^pechuga de pollo cruda sin piel$/ },
] as const;

export function findUsdaReference(food: string) {
  const normalized = food.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/\s+/g, " ");
  return USDA_REFERENCES.find(reference => reference.aliases.test(normalized));
}
