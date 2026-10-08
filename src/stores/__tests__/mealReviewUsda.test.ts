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
