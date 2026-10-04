import { getDateKey } from "./dates";
type Meal = { meal_type: string; logged_at: string; total_calories: number; total_protein: number; total_carbs: number; total_fat: number; meal_items: { food_name: string; grams: number }[] };
type Water = { amount_ml: number; logged_at: string };
type Profile = { full_name: string | null; current_weight_kg: number | null; height_cm: number | null; objective: string | null };
export function buildNutritionistReport(profile: Profile, meals: Meal[], water: Water[], startDate: string, endDate: string) {
  const daily: Record<string, { calories: number; protein: number; carbs: number; fat: number; water: number; meals: string[]; hasWater: boolean }> = {};
  const row = (key: string) => daily[key] ??= { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, meals: [], hasWater: false };
  meals.forEach(m => {
    const d = row(getDateKey(new Date(m.logged_at)));
    d.calories += Number(m.total_calories); d.protein += Number(m.total_protein); d.carbs += Number(m.total_carbs); d.fat += Number(m.total_fat);
    d.meals.push(m.meal_type.toUpperCase() + ": " + m.meal_items.map(i => i.food_name).join(" + "));
  });
  water.forEach(w => { const d = row(getDateKey(new Date(w.logged_at))); d.water += Number(w.amount_ml); d.hasWater = true; });
  const days = Object.keys(daily).sort();
  const foodDays = days.filter(d => daily[d].meals.length > 0);
  const waterDays = days.filter(d => daily[d].hasWater);
  const average = (keys: string[], field: "calories" | "protein" | "carbs" | "fat" | "water") => keys.length ? Math.round(keys.reduce((sum, key) => sum + daily[key][field], 0) / keys.length) : 0;
  const result = {
    patientName: profile.full_name || "Usuario", weightKg: Number(profile.current_weight_kg || 0),
    heightCm: Number(profile.height_cm || 0), objective: profile.objective || "Sin definir",
    startDate, endDate, avgCalories: average(foodDays, "calories"), avgProtein: average(foodDays, "protein"),
    avgCarbs: average(foodDays, "carbs"), avgFat: average(foodDays, "fat"), avgWaterMl: average(waterDays, "water"),
    totalDaysLogged: days.length,
  };
  const csvCell = (value: string | number) => '"' + String(value).replace(/"/g, '""') + '"';
  const csvContent = "Fecha,Calorias_kcal,Proteina_g,Carbohidratos_g,Grasas_g,Agua_ml,Comidas\r\n" + days.map(d => {
    const r = daily[d];
    return [d, r.meals.length ? Math.round(r.calories) : "", r.meals.length ? Math.round(r.protein) : "", r.meals.length ? Math.round(r.carbs) : "", r.meals.length ? Math.round(r.fat) : "", r.hasWater ? r.water : "", r.meals.join(" | ")].map(csvCell).join(",");
  }).join("\r\n");
  const formattedText = [
    "INFORME NUTRICIONAL", result.patientName, "Período: " + startDate + " al " + endDate,
    "Días registrados: " + days.length + " (comidas: " + foodDays.length + ", agua: " + waterDays.length + ")",
    "Promedios sobre días con registros; los días sin datos no representan consumo cero.",
    "Energía: " + result.avgCalories + " kcal | Proteína: " + result.avgProtein + " g | Carbohidratos: " + result.avgCarbs + " g | Grasas: " + result.avgFat + " g",
    "Agua: " + result.avgWaterMl + " ml",
    ...days.map(d => d + ": " + (daily[d].meals.length ? Math.round(daily[d].calories) + " kcal" : "sin comidas registradas") + " | " + (daily[d].hasWater ? daily[d].water + " ml" : "sin agua registrada")),
  ].join("\n");
  return { ...result, csvContent, formattedText };
}
