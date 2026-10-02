import { AIStructuredOutputSchema } from "../../../supabase/functions/analyze-meal/types";

describe("AIStructuredOutputSchema", () => {
  test("validates a correct AI vision response", () => {
    const validResponse = {
      meal_type_guess: "almuerzo",
      items: [
        {
          food: "Pechuga de pollo a la plancha",
          grams: 180,
          calories: 297,
          protein: 55,
          carbs: 0,
          fat: 6,
          confidence: 0.92,
        },
        {
          food: "Arroz blanco",
          grams: 150,
          calories: 195,
          protein: 4,
          carbs: 42,
          fat: 0.5,
          confidence: 0.88,
        },
      ],
    };

    const parsed = AIStructuredOutputSchema.safeParse(validResponse);
    expect(parsed.success).toBe(true);
  });

  test("rejects negative grams or calories", () => {
    const invalidResponse = {
      meal_type_guess: "almuerzo",
      items: [
        {
          food: "Pechuga de pollo",
          grams: -50,
          calories: 100,
          protein: 20,
          carbs: 0,
          fat: 2,
          confidence: 0.8,
        },
      ],
    };

    const parsed = AIStructuredOutputSchema.safeParse(invalidResponse);
    expect(parsed.success).toBe(false);
  });

  test("rejects invalid meal type", () => {
    const invalidMealType = {
      meal_type_guess: "brunch_no_permitido",
      items: [],
    };

    const parsed = AIStructuredOutputSchema.safeParse(invalidMealType);
    expect(parsed.success).toBe(false);
  });
});
