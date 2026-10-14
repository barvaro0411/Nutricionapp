jest.mock('expo-crypto', () => ({ randomUUID: () => 'test-request-id' }));
import { useMealReviewStore } from '../useMealReviewStore';
import { DetectedFoodItemSchema } from '@/types/meal';

const reference = { source: 'USDA FoodData Central' as const, fdc_id: 168878, description: 'Cooked rice' };
beforeEach(() => useMealReviewStore.getState().initializeReview({
  imagePath: '', localImageUri: '', mealType: 'almuerzo', items: [
    { food: 'Arroz blanco cocido', grams: 150, unit: 'g', calories: 195, protein: 4, carbs: 42.3, fat: 0.4, confidence: 0.9, nutrition_reference: reference },
  ],
}));

test('quantity edits scale the USDA nutrients and preserve the reference', () => {
  useMealReviewStore.getState().updateItemGrams(0, 300);
  const item = useMealReviewStore.getState().items[0];
  expect(item.calories).toBe(390);
  expect(item.nutrition_reference).toEqual(reference);
  expect(DetectedFoodItemSchema.parse(item).nutrition_reference).toEqual(reference);
});

test('changing preparation clears the previous USDA attribution', () => {
  useMealReviewStore.getState().updateItemVariant(0, { food: 'Arroz integral', caloriesPer100g: 112, proteinPer100g: 2.6, carbsPer100g: 23, fatPer100g: 0.9 });
  expect(useMealReviewStore.getState().items[0].nutrition_reference).toBeUndefined();
});

test('changing unit clears a reference expressed per gram', () => {
  useMealReviewStore.getState().updateItemUnit(0, 'ml');
  expect(useMealReviewStore.getState().items[0].nutrition_reference).toBeUndefined();
});

test('replacing an estimate with a manually selected reference rebuilds ratios and preserves identity', () => {
  const previousId = useMealReviewStore.getState().items[0].id;
  const selected = { food: 'Fideos cocidos', grams: 200, unit: 'g' as const, calories: 316, protein: 11.6, carbs: 61.6, fat: 1.8, confidence: 1,
    nutrition_reference: { ...reference, fdc_id: 2708357, description: 'Pasta, cooked', data_type: 'Survey (FNDDS)', basis: '100g' as const } };
  useMealReviewStore.getState().replaceItem(0, selected);
  useMealReviewStore.getState().updateItemGrams(0, 100);
  expect(useMealReviewStore.getState().items[0]).toMatchObject({id: previousId, calories: 158, grams: 100, nutrition_reference: selected.nutrition_reference});
});

test('loadFavoriteCombo replaces items with combo items and configures review state', () => {
  const breakfastCombo = {
    title: 'Desayuno Campeón',
    meal_type: 'desayuno' as const,
    items: [
      { food_name: 'Marraqueta chilena', grams: 100, unit: 'g' as const, calories: 270, protein: 8.5, carbs: 56, fat: 1 },
      { food_name: 'Café con leche', grams: 200, unit: 'ml' as const, calories: 96, protein: 5.2, carbs: 7.6, fat: 5 },
    ],
  };

  useMealReviewStore.getState().loadFavoriteCombo(breakfastCombo);
  const state = useMealReviewStore.getState();
  expect(state.items.length).toBe(2);
  expect(state.mealType).toBe('desayuno');
  expect(state.userNotes).toContain('Desayuno Campeón');
  expect(state.items[0].food).toBe('Marraqueta chilena');
  expect(state.items[1].unit).toBe('ml');

  const totals = state.getTotals();
  expect(totals.calories).toBe(366);
});

test('addComboItems appends items to current meal review', () => {
  const initialItemsCount = useMealReviewStore.getState().items.length;
  const sideCombo = {
    title: 'Postre y café',
    items: [
      { food_name: 'Café expreso', grams: 60, unit: 'ml' as const, calories: 2, protein: 0.1, carbs: 0.3, fat: 0 },
    ],
  };

  useMealReviewStore.getState().addComboItems(sideCombo);
  expect(useMealReviewStore.getState().items.length).toBe(initialItemsCount + 1);
});

test('updateItemVariant with preset grams updates food, grams, and calculates calories', () => {
  useMealReviewStore.getState().updateItemVariant(0, {
    food: 'Pechuga a la plancha',
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    grams: 200,
  });

  const item = useMealReviewStore.getState().items[0];
  expect(item.food).toBe('Pechuga a la plancha');
  expect(item.grams).toBe(200);
  expect(item.calories).toBe(330);
  expect(item.protein).toBe(62);
});
