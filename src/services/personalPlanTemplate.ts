import { MasterPlanData } from "@/data/masterPlan";
import type { ActivityLevel, Gender, Objective } from "@/types/profile";
import { calculateBMR, calculateNutritionGoals } from "@/utils/nutritionCalculator";
import {
  clampPlanInteger,
  formatWeekdaysLabel,
  normalizeWeekdays,
  WEEKDAY_OPTIONS,
} from "@/utils/personalPlan";

export interface LocalPlanTemplateInput {
  fullName?: string | null;
  gender?: Gender | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  targetWeightKg?: number | null;
  activityLevel?: ActivityLevel | null;
  objective?: Objective | null;
  matchDayWeekdays?: number[];
  trainingDaysPerWeek?: number;
  trainingFocus?: string;
  mealsPerDay?: number;
  includeSupplements?: boolean;
}

const OBJECTIVE_TITLES: Record<Objective, { title: string; desc: string; pace: string }> = {
  lose_weight: {
    title: "Definición y control calórico",
    desc: "Déficit moderado priorizando proteína y saciedad para preservar masa muscular.",
    pace: "-0.4 a -0.5 kg/semana",
  },
  maintain: {
    title: "Mantención y rendimiento diario",
    desc: "Balance energético estable para sostener energía, hábitos y composición corporal.",
    pace: "Peso estable",
  },
  gain_muscle: {
    title: "Ganancia de masa muscular",
    desc: "Superávit ligero sostenido con entrenamiento de fuerza progresiva.",
    pace: "+0.2 a +0.3 kg/semana",
  },
};

const MEAL_TEMPLATES: Record<number, Array<{ time: string; block: string; ratio: number; detail: string }>> = {
  3: [
    {
      time: "08:00",
      block: "Desayuno",
      ratio: 0.28,
      detail: "Avena con yogur proteico, fruta de estación y frutos secos o huevo con pan integral",
    },
    {
      time: "13:30",
      block: "Almuerzo",
      ratio: 0.4,
      detail: "Proteína magra (pollo, pescado o legumbres) con carbohidrato complejo y ensalada abundante",
    },
    {
      time: "20:00",
      block: "Cena",
      ratio: 0.32,
      detail: "Porción proteica liviana con verduras salteadas o al horno y aceite de oliva",
    },
  ],
  4: [
    {
      time: "08:00",
      block: "Desayuno",
      ratio: 0.24,
      detail: "Huevos revueltos con marraqueta integral o avena con yogur alto en proteína",
    },
    {
      time: "13:30",
      block: "Almuerzo",
      ratio: 0.36,
      detail: "Proteína principal con arroz, papas o quinoa y ensalada chilena",
    },
    {
      time: "17:30",
      block: "Colación",
      ratio: 0.14,
      detail: "Yogur natural/proteico o batido con fruta fresca",
    },
    {
      time: "20:30",
      block: "Cena",
      ratio: 0.26,
      detail: "Pechuga a la plancha, jurel o tofu con verduras grilladas y guarnición moderada",
    },
  ],
  5: [
    {
      time: "08:00",
      block: "Desayuno",
      ratio: 0.22,
      detail: "Avena con leche/bebida vegetal, fruta y porción de proteína",
    },
    {
      time: "11:00",
      block: "Media mañana",
      ratio: 0.1,
      detail: "Fruta con puñado pequeño de frutos secos o huevo duro",
    },
    {
      time: "13:30",
      block: "Almuerzo",
      ratio: 0.34,
      detail: "Plato principal equilibrado en proteína, grano/tubérculo y vegetales",
    },
    {
      time: "17:30",
      block: "Colación PM",
      ratio: 0.12,
      detail: "Yogur proteico o pan pita integral con quesillo/palta",
    },
    {
      time: "20:30",
      block: "Cena",
      ratio: 0.22,
      detail: "Proteína magra con ensalada o crema de verduras casera",
    },
  ],
  6: [
    {
      time: "08:00",
      block: "Desayuno",
      ratio: 0.2,
      detail: "Desayuno completo alto en proteína y fibra",
    },
    {
      time: "11:00",
      block: "Colación AM",
      ratio: 0.1,
      detail: "Fruta fresca y fuente proteica rápida",
    },
    {
      time: "13:30",
      block: "Almuerzo",
      ratio: 0.3,
      detail: "Proteína magra, carbohidrato de absorción media y vegetales",
    },
    {
      time: "16:30",
      block: "Pre-entreno",
      ratio: 0.1,
      detail: "Plátano, tostada o avena liviana de energía rápida",
    },
    {
      time: "19:30",
      block: "Post-entreno",
      ratio: 0.1,
      detail: "Yogur proteico o batido de recuperación",
    },
    {
      time: "21:30",
      block: "Cena",
      ratio: 0.2,
      detail: "Cena balanceada y fácil de digerir",
    },
  ],
};

function macroRange(value: number, delta: number, unit: string): string {
  return `${Math.max(1, value - delta)} - ${value + delta} ${unit}`;
}

/**
 * Builds a complete, valid local MasterPlanData using Mifflin-St Jeor targets.
 */
export function buildLocalMasterPlanTemplate(input: LocalPlanTemplateInput): MasterPlanData {
  const fullName = input.fullName?.trim() || "Mi Plan";
  const gender: Gender = input.gender ?? "male";
  const age = clampPlanInteger(input.age ?? 28, 14, 100);
  const heightCm = Math.round((input.heightCm ?? 172) * 10) / 10;
  const currentWeightKg = Math.round((input.weightKg ?? 72) * 10) / 10;
  const activityLevel: ActivityLevel = input.activityLevel ?? "moderate";
  const objective: Objective = input.objective ?? "maintain";
  const targetWeightKg = Math.round(
    (input.targetWeightKg ??
      (objective === "lose_weight"
        ? Math.max(40, currentWeightKg - 4)
        : objective === "gain_muscle"
          ? currentWeightKg + 3
          : currentWeightKg)) *
      10,
  ) / 10;

  const bmrKcal = calculateBMR(currentWeightKg, heightCm, age, gender);
  const standardGoals = calculateNutritionGoals({
    fullName,
    gender,
    age,
    heightCm,
    weightKg: currentWeightKg,
    activityLevel,
    objective,
  });

  const weekdays = normalizeWeekdays(input.matchDayWeekdays ?? []);
  const hasMatchDays = weekdays.length > 0;
  const matchCalories = hasMatchDays
    ? clampPlanInteger(standardGoals.calories + 250, 800, 8000)
    : standardGoals.calories;
  const matchCarbs = hasMatchDays
    ? clampPlanInteger(standardGoals.carbsG + 55, 10, 1600)
    : standardGoals.carbsG;

  const standardWeekdays = WEEKDAY_OPTIONS.filter((opt) => !weekdays.includes(opt.value)).map(
    (opt) => opt.name,
  );
  const standardDaysLabel =
    standardWeekdays.length === 7
      ? "Todos los días"
      : standardWeekdays.length > 0
        ? standardWeekdays.join(", ")
        : "Días estándar";

  const mealsCount = clampPlanInteger(input.mealsPerDay ?? 4, 3, 6);
  const scheduleRows = MEAL_TEMPLATES[mealsCount] ?? MEAL_TEMPLATES[4];
  const waterMl = clampPlanInteger(Math.round(currentWeightKg * 38 / 100) * 100, 2000, 4500);
  const waterLiters = (waterMl / 1000).toFixed(1);

  const trainingDays = clampPlanInteger(input.trainingDaysPerWeek ?? 4, 0, 7);
  const trainingFocus = input.trainingFocus?.trim() || "Fuerza y composición corporal";
  const weeklyRoutine = WEEKDAY_OPTIONS.map((opt, idx) => {
    const isTraining = idx < trainingDays;
    if (!isTraining) {
      return {
        day: opt.name,
        activity: "Descanso activo / caminata",
        goal: "Recuperación muscular y movilidad",
        intensity: "Baja",
      };
    }
    return {
      day: opt.name,
      activity: idx % 2 === 0 ? `Tren superior (${trainingFocus})` : `Tren inferior y core (${trainingFocus})`,
      goal: "Progresión técnica y volumen constante",
      intensity: "RIR 2",
      exercises:
        idx % 2 === 0
          ? [
              { name: "Press banca o flexiones", setsReps: "4x8-10", rir: "2", rest: "90s" },
              { name: "Remo con barra o mancuerna", setsReps: "4x10", rir: "2", rest: "90s" },
              { name: "Press militar", setsReps: "3x10-12", rir: "2", rest: "75s" },
            ]
          : [
              { name: "Sentadilla o prensa", setsReps: "4x8-10", rir: "2", rest: "120s" },
              { name: "Peso muerto rumano", setsReps: "3x10", rir: "2", rest: "90s" },
              { name: "Plancha abdominal", setsReps: "3x40s", rir: "1", rest: "60s" },
            ],
    };
  });

  const includeSupplements = input.includeSupplements ?? true;
  const supplements = includeSupplements
    ? [
        { name: "Creatina Monohidratada", dose: "5 g", timing: "Todos los días con una comida" },
        { name: "Proteína en polvo (opcional)", dose: "1 scoop", timing: "Si falta proteína para la meta" },
      ]
    : [];

  const meta = OBJECTIVE_TITLES[objective];

  return {
    user: {
      fullName,
      heightCm,
      currentWeightKg,
      targetWeightKg,
      weeklyPaceKg: meta.pace,
      bmrKcal,
      objectiveTitle: meta.title,
      objectiveDesc: meta.desc,
    },
    dailyGoals: {
      standard: {
        days: standardDaysLabel,
        calories: standardGoals.calories,
        caloriesRange: macroRange(standardGoals.calories, 75, "kcal"),
        proteinG: standardGoals.proteinG,
        proteinRange: macroRange(standardGoals.proteinG, 8, "g"),
        carbsG: standardGoals.carbsG,
        carbsRange: macroRange(standardGoals.carbsG, 15, "g"),
        fatG: standardGoals.fatG,
        fatRange: macroRange(standardGoals.fatG, 6, "g"),
      },
      matchDay: {
        days: hasMatchDays ? formatWeekdaysLabel(weekdays) : "Sin días especiales",
        weekdays,
        calories: matchCalories,
        caloriesRange: macroRange(matchCalories, 75, "kcal"),
        proteinG: standardGoals.proteinG,
        carbsG: matchCarbs,
        carbsRange: macroRange(matchCarbs, 15, "g"),
        fatG: standardGoals.fatG,
        fatRange: macroRange(standardGoals.fatG, 6, "g"),
        focus: hasMatchDays
          ? "Energía extra para entrenamiento intenso o partido"
          : "Misma pauta equilibrada toda la semana",
      },
      waterMl,
      waterRangeL: `${waterLiters} L`,
    },
    mealSchedule: scheduleRows.map((meal) => ({
      time: meal.time,
      block: meal.block,
      detail: meal.detail,
      energyKcal: Math.round(standardGoals.calories * meal.ratio),
      proteinG: `${Math.round(standardGoals.proteinG * meal.ratio)}g`,
    })),
    weeklyRoutine,
    supplements,
    dailyChecklist: [
      `Alcanzar ${standardGoals.proteinG}g de proteína diaria`,
      `Beber ${waterLiters} L de agua durante el día`,
      "Registrar tus comidas en el diario",
      ...(includeSupplements ? ["Tomar creatina 5g"] : []),
      "Dormir al menos 7 horas",
    ],
  };
}
