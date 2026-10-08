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
