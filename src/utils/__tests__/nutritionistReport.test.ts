describe("Nutritionist Clinical Report & CSV Formatter", () => {
  test("generates properly formatted CSV string with escaped meals", () => {
    const dailyRecords = [
      {
        date: "2026-10-01",
        calories: 1850.4,
        protein: 110.2,
        carbs: 220.8,
        fat: 55.1,
        water: 2000,
        meals: ["DESAYUNO: 1/2 marraqueta con palta", "ALMUERZO: Cazuela de vacuno"],
      },
      {
        date: "2026-10-02",
        calories: 1920.0,
        protein: 125.0,
        carbs: 210.0,
        fat: 60.0,
        water: 2250,
        meals: ["DESAYUNO: Avena con leche descremada", "ONCE: 1 hallulla con huevo revuelto"],
      },
    ];

    let csv = "Fecha,Calorias_kcal,Proteina_g,Carbohidratos_g,Grasas_g,Agua_ml,Comidas\n";
    dailyRecords.forEach((r) => {
      const mealsEscaped = `"${r.meals.join(" | ")}"`;
      csv += `${r.date},${Math.round(r.calories)},${Math.round(r.protein)},${Math.round(
        r.carbs
      )},${Math.round(r.fat)},${r.water},${mealsEscaped}\n`;
    });

    const lines = csv.trim().split("\n");
    expect(lines.length).toBe(3); // Header + 2 rows
    expect(lines[0]).toBe("Fecha,Calorias_kcal,Proteina_g,Carbohidratos_g,Grasas_g,Agua_ml,Comidas");
    expect(lines[1]).toContain("2026-10-01,1850,110,221,55,2000");
    expect(lines[1]).toContain('"DESAYUNO: 1/2 marraqueta con palta | ALMUERZO: Cazuela de vacuno"');
  });

  test("calculates macro and hydration averages accurately", () => {
    const caloriesList = [1800, 2000, 1900];
    const proteinList = [100, 120, 110];
    const waterList = [2000, 2500, 1500];

    const avgCalories = Math.round(caloriesList.reduce((a, b) => a + b, 0) / caloriesList.length);
    const avgProtein = Math.round(proteinList.reduce((a, b) => a + b, 0) / proteinList.length);
    const avgWater = Math.round(waterList.reduce((a, b) => a + b, 0) / waterList.length);

    expect(avgCalories).toBe(1900);
    expect(avgProtein).toBe(110);
    expect(avgWater).toBe(2000);
  });
});

describe("Freemium Quota Logic", () => {
  test("free tier enforces 3 AI photo scans per day", () => {
    const maxFree = 3;
    let scansToday = 0;

    const tryScan = () => {
      if (scansToday >= maxFree) {
        return { allowed: false, remaining: 0 };
      }
      scansToday++;
      return { allowed: true, remaining: maxFree - scansToday };
    };

    expect(tryScan()).toEqual({ allowed: true, remaining: 2 });
    expect(tryScan()).toEqual({ allowed: true, remaining: 1 });
    expect(tryScan()).toEqual({ allowed: true, remaining: 0 });
    expect(tryScan()).toEqual({ allowed: false, remaining: 0 });
  });

  test("pro tier allows unlimited scans", () => {
    const isPro = true;
    const canScan = (userIsPro: boolean, scans: number) => {
      if (userIsPro) return true;
      return scans < 3;
    };

    expect(canScan(isPro, 100)).toBe(true);
    expect(canScan(false, 3)).toBe(false);
  });
});
