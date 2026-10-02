import { supabase } from "@/services/supabase";

export interface NutritionistReportData {
  patientName: string;
  weightKg: number;
  heightCm: number;
  objective: string;
  startDate: string;
  endDate: string;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgWaterMl: number;
  totalDaysLogged: number;
  csvContent: string;
  formattedText: string;
}

export async function generateNutritionistReport(
  userId: string,
  daysBack: number = 7
): Promise<NutritionistReportData> {
  const endDateObj = new Date();
  const startDateObj = new Date();
  startDateObj.setDate(endDateObj.getDate() - (daysBack - 1));
  startDateObj.setHours(0, 0, 0, 0);

  const startDateStr = startDateObj.toISOString().split("T")[0];
  const endDateStr = endDateObj.toISOString().split("T")[0];

  // 1. Obtener perfil
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  // 2. Obtener comidas en el rango
  const { data: meals } = await supabase
    .from("meals")
    .select(`
      id,
      meal_type,
      logged_at,
      total_calories,
      total_protein,
      total_carbs,
      total_fat,
      meal_items ( food_name, grams )
    `)
    .eq("user_id", userId)
    .gte("logged_at", startDateObj.toISOString())
    .lte("logged_at", endDateObj.toISOString())
    .order("logged_at", { ascending: true });

  // 3. Obtener agua en el rango
  const { data: waterLogs } = await supabase
    .from("water_logs")
    .select("amount_ml, logged_at")
    .eq("user_id", userId)
    .gte("logged_at", startDateObj.toISOString())
    .lte("logged_at", endDateObj.toISOString());

  // Agrupar por día
  const dailyData: Record<
    string,
    { calories: number; protein: number; carbs: number; fat: number; water: number; meals: string[] }
  > = {};

  (meals || []).forEach((m: any) => {
    const d = m.logged_at.split("T")[0];
    if (!dailyData[d]) {
      dailyData[d] = { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, meals: [] };
    }
    dailyData[d].calories += Number(m.total_calories);
    dailyData[d].protein += Number(m.total_protein);
    dailyData[d].carbs += Number(m.total_carbs);
    dailyData[d].fat += Number(m.total_fat);

    const itemsStr = (m.meal_items || []).map((i: any) => i.food_name).join("+");
    dailyData[d].meals.push(`${m.meal_type.toUpperCase()}: ${itemsStr}`);
  });

  (waterLogs || []).forEach((w: any) => {
    const d = w.logged_at.split("T")[0];
    if (!dailyData[d]) {
      dailyData[d] = { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0, meals: [] };
    }
    dailyData[d].water += Number(w.amount_ml);
  });

  const loggedDays = Object.keys(dailyData);
  const totalDays = loggedDays.length || 1;

  let sumCals = 0,
    sumProt = 0,
    sumCarbs = 0,
    sumFat = 0,
    sumWater = 0;

  loggedDays.forEach((d) => {
    const row = dailyData[d];
    sumCals += row.calories;
    sumProt += row.protein;
    sumCarbs += row.carbs;
    sumFat += row.fat;
    sumWater += row.water;
  });

  const avgCalories = Math.round(sumCals / totalDays);
  const avgProtein = Math.round(sumProt / totalDays);
  const avgCarbs = Math.round(sumCarbs / totalDays);
  const avgFat = Math.round(sumFat / totalDays);
  const avgWaterMl = Math.round(sumWater / totalDays);

  // Generar CSV
  let csv = "Fecha,Calorias_kcal,Proteina_g,Carbohidratos_g,Grasas_g,Agua_ml,Comidas\n";
  loggedDays.sort().forEach((d) => {
    const row = dailyData[d];
    const mealsEscaped = `"${row.meals.join(" | ")}"`;
    csv += `${d},${Math.round(row.calories)},${Math.round(row.protein)},${Math.round(
      row.carbs
    )},${Math.round(row.fat)},${row.water},${mealsEscaped}\n`;
  });

  // Generar texto para WhatsApp o email al profesional de la salud
  const patient = profile?.full_name || "Paciente";
  const weight = profile?.current_weight_kg || 0;
  const height = profile?.height_cm || 0;
  const obj = profile?.objective || "Mantenimiento";

  const formattedText = `
📋 *INFORME NUTRICIONAL - NUTRICIÓN IA CHILE*
👤 *Paciente:* ${patient}
⚖️ *Peso actual:* ${weight} kg | *Estatura:* ${height} cm
🎯 *Objetivo:* ${obj}
📅 *Período:* ${startDateStr} al ${endDateStr} (${totalDays} días con registros)

📊 *PROMEDIOS DIARIOS LOGRADOS:*
• Energía: *${avgCalories} kcal / día*
• Proteína: *${avgProtein} g / día*
• Carbohidratos: *${avgCarbs} g / día*
• Grasas: *${avgFat} g / día*
• Hidratación: *${avgWaterMl} ml / día*

🗓️ *DETALLE POR DÍA:*
${loggedDays
  .sort()
  .map(
    (d) =>
      `• *${d}:* ${Math.round(dailyData[d].calories)} kcal | ${Math.round(
        dailyData[d].protein
      )}g P | ${Math.round(dailyData[d].carbs)}g C | ${Math.round(
        dailyData[d].fat
      )}g G | 💧 ${dailyData[d].water}ml`
  )
  .join("\n")}

_Generado automáticamente con Nutrición IA_
`.trim();

  return {
    patientName: patient,
    weightKg: Number(weight),
    heightCm: Number(height),
    objective: String(obj),
    startDate: startDateStr,
    endDate: endDateStr,
    avgCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    avgWaterMl,
    totalDaysLogged: totalDays,
    csvContent: csv,
    formattedText,
  };
}
