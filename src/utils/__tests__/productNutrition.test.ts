import { nutritionPer100 } from "../productNutrition";

const drink = { food: "Red Bull", unit: "ml" as const, grams: 250, calories: 110, protein: 0, carbs: 27.5, fat: 0 };
test("normalizes a whole drink so selecting its original portion keeps its calories", () => {
  const nutrients = nutritionPer100(drink);
  expect(nutrients.caloriesPer100g).toBe(44);
  expect(nutrients.carbsPer100g).toBe(11);
  expect(nutrients.caloriesPer100g * drink.grams / 100).toBe(110);
});
test("normalizes nutrients from a label that only gives values per serving", () => {
  expect(nutritionPer100({ ...drink, grams: 30, unit: "g", calories: 120, protein: 3, carbs: 20, fat: 4 })).toEqual({
    caloriesPer100g: 400, proteinPer100g: 10, carbsPer100g: 66.7, fatPer100g: 13.3,
  });
});
test.each([0, -1, NaN, Infinity])("rejects unknown or invalid reference portions: %s", grams => {
  expect(() => nutritionPer100({ ...drink, grams })).toThrow();
});
test("rejects impossible nutrient densities instead of saving them", () => {
  expect(() => nutritionPer100({ ...drink, grams: 1 })).toThrow();
  expect(() => nutritionPer100({ ...drink, calories: NaN })).toThrow();
});
