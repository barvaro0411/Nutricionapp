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
    // TDEE is 2759, 20% deficit -> 2759 * 0.8 = 2207
    expect(goals.calories).toBe(2207);
    // Protein: 80 * 2.0 = 160g
    expect(goals.proteinG).toBe(160);
    // Fat: 2207 * 0.28 = 617.96 / 9 = ~69g
    expect(goals.fatG).toBe(69);
    // Carbs: (2207 - (160*4 + 69*9)) / 4 = (2207 - (640 + 621)) / 4 = 946 / 4 = ~237g
    expect(goals.carbsG).toBe(237);
  });
});
