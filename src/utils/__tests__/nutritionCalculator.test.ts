import {
  calculateBMR,
  calculateTDEE,
  calculateNutritionGoals,
  adjustGoalsForActivity,
  recalculateGoalsFromProfile,
} from "../nutritionCalculator";
import { OnboardingProfile, Goals } from "@/types/profile";

describe("nutritionCalculator", () => {
  test("calculates BMR correctly for male", () => {
    // 80kg, 180cm, 30 years -> (10*80) + (6.25*180) - (5*30) + 5 = 800 + 1125 - 150 + 5 = 1780
    const bmr = calculateBMR(80, 180, 30, "male");
    expect(bmr).toBe(1780);
  });

  test("calculates BMR correctly for female", () => {
    // 60kg, 165cm, 25 years -> (10*60) + (6.25*165) - (5*25) - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
    const bmr = calculateBMR(60, 165, 25, "female");
    expect(bmr).toBe(1345);
  });

  test("calculates TDEE with moderate activity", () => {
    const bmr = 1780;
    // 1780 * 1.55 = 2759
    const tdee = calculateTDEE(bmr, "moderate");
    expect(tdee).toBe(2759);
  });

  test("calculates nutrition goals for weight loss with deficit", () => {
    const profile: OnboardingProfile = {
      fullName: "Alonso",
      gender: "male",
      age: 30,
      heightCm: 180,
      weightKg: 80,
      activityLevel: "moderate",
      objective: "lose_weight",
    };

    const goals = calculateNutritionGoals(profile);
    // Deficit capped at 500 kcal; macro rounding remains within 5 kcal.
    expect(goals.calories).toBe(2259);
    expect(goals.proteinG).toBe(160);
    expect(Math.abs(goals.calories - (goals.proteinG * 4 + goals.carbsG * 4 + goals.fatG * 9))).toBeLessThanOrEqual(5);
  });

  describe("adjustGoalsForActivity", () => {
    const baseGoals: Goals = {
      calories: 2000,
      proteinG: 140,
      carbsG: 220,
      fatG: 65,
    };

    test("returns base goals when burnedCalories is 0 or negative", () => {
      expect(adjustGoalsForActivity(baseGoals, 0)).toEqual(baseGoals);
      expect(adjustGoalsForActivity(baseGoals, -100)).toEqual(baseGoals);
    });

    test("adjusts calories, carbs, protein and fat proportionally when active calories are logged", () => {
      // 400 kcal burned:
      // Carbs: 400 * 0.75 / 4 = 75g extra
      // Protein: 400 * 0.15 / 4 = 15g extra
      // Fat: 400 * 0.10 / 9 = 4.44 -> 4g extra
      const adjusted = adjustGoalsForActivity(baseGoals, 400);

      expect(adjusted.calories).toBe(2400);
      expect(adjusted.carbsG).toBe(295);
      expect(adjusted.proteinG).toBe(155);
      expect(adjusted.fatG).toBe(69);
    });
  });

  describe("recalculateGoalsFromProfile", () => {
    const profile: OnboardingProfile = {
      fullName: "Alonso",
      gender: "male",
      age: 30,
      heightCm: 180,
      weightKg: 80,
      activityLevel: "moderate",
      objective: "lose_weight",
    };

    test("recalculates goals when weight updates", () => {
      const originalGoals = calculateNutritionGoals(profile);
      const updatedGoals = recalculateGoalsFromProfile(profile, { weightKg: 75 });

      expect(updatedGoals.calories).toBeLessThan(originalGoals.calories);
      expect(updatedGoals.proteinG).toBe(150); // 75kg * 2.0g
    });

    test("recalculates goals when activity level increases", () => {
      const originalGoals = calculateNutritionGoals(profile);
      const updatedGoals = recalculateGoalsFromProfile(profile, { activityLevel: "very_active" });

      expect(updatedGoals.calories).toBeGreaterThan(originalGoals.calories);
    });
  });
});
