export interface DailyClosingInput {
  userName?: string | null;
  consumedCalories: number;
  goalCalories: number;
  consumedProtein: number;
  goalProtein: number;
  waterMl: number;
  targetWaterMl: number;
  mealCount: number;
}

export interface DailyClosingSummary {
  headline: string;
  badgeText: string;
  spokenText: string;
  achievement: string;
  tomorrowTip: string;
  coachPrompt: string;
}

/**
 * Construye el resumen estructurado y el guion de voz natural (es-CL)
 * para la función "Audio-Cierre del Día · ¿Cómo estuvo mi día?".
 */
export function buildDailyClosingSummary(
  input: DailyClosingInput
): DailyClosingSummary {
  const firstName = input.userName?.trim()?.split(" ")[0] || "";
  const greeting = firstName ? `Hola ${firstName}` : "Hola";

  const cals = Math.max(0, Math.round(input.consumedCalories));
  const goalCals = Math.max(1200, Math.round(input.goalCalories || 2000));
  const prot = Math.max(0, Math.round(input.consumedProtein));
  const goalProt = Math.max(40, Math.round(input.goalProtein || 120));
  const water = Math.max(0, Math.round(input.waterMl));
  const goalWater = Math.max(1000, Math.round(input.targetWaterMl || 2000));
  const meals = Math.max(0, Math.round(input.mealCount));

  const calPct = Math.round((cals / goalCals) * 100);
  const protPct = Math.round((prot / goalProt) * 100);
  const waterPct = Math.round((water / goalWater) * 100);

  if (meals === 0 && water === 0) {
    const spokenText = `${greeting}. Aún no tenemos comidas ni vasos de agua registrados hoy. Si ya comiste algo, puedes usar el atajo de un toque para repetir lo de ayer o dictarle tu comida al Coach. Mañana será una nueva oportunidad para ir a tu ritmo.`;
    return {
      headline: "Día en blanco · ¡Aún estás a tiempo!",
      badgeText: "Sin registros hoy",
      achievement:
        "Tomarte un minuto para revisar tu diario ya mantiene vivo el hábito.",
      tomorrowTip:
        "Deja pensado tu desayuno de mañana hoy en la noche para registrarlo en un toque.",
      spokenText,
      coachPrompt:
        "Hola Coach, hoy casi no alcancé a registrar mis comidas. Dame ánimo y 2 ideas muy simples para retomar mi desayuno y almuerzo mañana.",
    };
  }

  // Determinar el mayor logro del día
  let achievement = "";
  if (protPct >= 85) {
    achievement = `¡Gran aporte proteico! Alcanzaste ${prot} g de proteína (${protPct}% de tu meta), cuidando tu masa muscular y saciedad.`;
  } else if (waterPct >= 85) {
    achievement = `¡Excelente hidratación! Sumaste ${water} ml de agua hoy (${waterPct}% de tu meta).`;
  } else if (calPct >= 80 && calPct <= 110) {
    achievement = `Clavaste tu balance energético con ${cals} kcal (${calPct}% de tu objetivo diario).`;
  } else {
    achievement = `Registraste ${meals} ${
      meals === 1 ? "momento de comida" : "momentos de comida"
    } (${cals} kcal) manteniendo la constancia en tu diario.`;
  }

  // Determinar el consejo práctico para mañana
  let tomorrowTip = "";
  if (protPct < 75) {
    const missingProt = Math.max(10, goalProt - prot);
    tomorrowTip = `Para mañana: suma una fuente extra de proteína desde el desayuno o la once (huevos, quesillo, atún o yogur proteico) para cubrir esos ~${missingProt} g pendientes.`;
  } else if (waterPct < 70) {
    tomorrowTip = `Para mañana: parte el día con un vaso de 250 ml de agua apenas despiertes y acompáñalo en tu almuerzo para llegar cómodo a los ${goalWater} ml.`;
  } else if (calPct > 115) {
    tomorrowTip = `Para mañana: vuelve a tu rutina habitual con tranquilidad, priorizando verduras frescas y proteínas magras en el almuerzo sin saltarte comidas.`;
  } else {
    tomorrowTip = `Para mañana: mantén exactamente este ritmo. Puedes usar el botón "Repetir de ayer" en tu pantalla de inicio para ahorrar tiempo.`;
  }

  // Titular según balance general
  let headline = "¡Sólido balance en tu jornada!";
  const badgeText = `${calPct}% kcal · ${protPct}% prot`;

  if (calPct >= 85 && calPct <= 110 && protPct >= 80) {
    headline = "🌟 ¡Día sobresaliente en energía y proteína!";
  } else if (calPct > 115) {
    headline = "Día completado · La constancia semanal manda";
  } else if (meals >= 1 && calPct < 65) {
    headline = "Avance registrado · Revisa si falta tu once o cena";
  }

  const spokenText = `${greeting}, aquí tienes el cierre de tu día. Hoy registraste ${meals} ${
    meals === 1 ? "comida" : "comidas"
  }, sumando ${cals} de tus ${goalCals} kilocalorías objetivo, con ${prot} gramos de proteína y ${water} mililitros de agua. ${achievement} ${tomorrowTip} ¡Que descanses muy bien!`;

  const coachPrompt = `Hola Coach, hazme mi cierre del día: hoy registré ${cals}/${goalCals} kcal (${calPct}%), ${prot}/${goalProt}g de proteína (${protPct}%) y ${water}/${goalWater} ml de agua en ${meals} comidas. ¿Qué fue lo mejor de mi día y qué me recomiendas para mañana?`;

  return {
    headline,
    badgeText,
    spokenText,
    achievement,
    tomorrowTip,
    coachPrompt,
  };
}
