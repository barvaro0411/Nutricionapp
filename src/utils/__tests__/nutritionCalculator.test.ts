import { calculateBMR, calculateTDEE, calculateNutritionGoals } from "../nutritionCalculator";
import { OnboardingProfile } from "@/types/profile";

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
});
