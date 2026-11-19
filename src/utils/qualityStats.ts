import { getDateKey } from "@/utils/dates";
import { ChileanStampType, detectFoodWarningLabels } from "@/utils/foodAlerts";

export interface WaterLogRow {
  amount_ml: number | string | null;
  logged_at: string;
}

export interface MealItemForQuality {
  food_name: string;
  grams: number | string | null;
  unit?: string | null;
  calories: number | string | null;
  protein: number | string | null;
  carbs: number | string | null;
  fat: number | string | null;
}

export interface MealWithQualityItems {
  logged_at: string;
  meal_items?: MealItemForQuality[] | null;
}

export interface WaterDayStat {
  date: string;
  dayLabel: string;
  totalMl: number;
  targetMl: number;
  pct: number;
  metGoal: boolean;
}

export interface WaterPeriodStats {
  days: WaterDayStat[];
  avgMl: number;
  loggedDays: number;
  goalDaysCount: number;
  maxMl: number;
  targetMl: number;
}

export interface WarningStampsPeriodStats {
  totalItems: number;
  cleanItems: number;
  stampedItems: number;
  cleanPercent: number;
  stampCounts: Record<ChileanStampType, number>;
  topStamp: ChileanStampType | null;
  tip: string;
}

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const STAMP_TIPS: Record<ChileanStampType, string> = {
  calories:
    "El sello más frecuente fue Alto en Calorías. Prueba equilibrar porciones densas con ensaladas frescas o verduras al vapor.",
  sugars:
    "El sello más frecuente fue Alto en Azúcares. Cambia bebidas o snacks dulces por agua con limón, fruta natural o yogur sin azúcar.",
  fats:
    "El sello más frecuente fue Alto en Grasas Saturadas. Prefiere cortes magros, preparaciones a la plancha y grasas saludables como palta o aceite de oliva.",
  sodium:
    "El sello más frecuente fue Alto en Sodio. Modera fiambres, caldos concentrados y salsas saladas; realza el sabor con limón, orégano o merkén.",
};

function toPositiveNumber(val: number | string | null | undefined): number {
  const parsed = Number(val);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function buildWaterPeriodStats(
  rows: WaterLogRow[],
  dates: string[],
  targetMl: number
): WaterPeriodStats {
  const safeTarget = Number.isFinite(targetMl) && targetMl > 0 ? Math.round(targetMl) : 2000;
  const dateSet = new Set(dates);
  const totalsByDate = new Map<string, number>();

  for (const row of rows) {
    if (!row?.logged_at) continue;
    const key = getDateKey(new Date(row.logged_at));
    if (!dateSet.has(key)) continue;
    totalsByDate.set(key, (totalsByDate.get(key) || 0) + toPositiveNumber(row.amount_ml));
  }

  const days: WaterDayStat[] = dates.map((date) => {
    const totalMl = Math.round(totalsByDate.get(date) || 0);
    const pct = safeTarget > 0 ? Math.min(150, Math.round((totalMl / safeTarget) * 100)) : 0;
    return {
      date,
      dayLabel: DAY_LABELS[new Date(`${date}T12:00:00Z`).getUTCDay()],
      totalMl,
      targetMl: safeTarget,
      pct,
      metGoal: totalMl >= safeTarget,
    };
  });

  const logged = days.filter((d) => d.totalMl > 0);
  const avgMl = logged.length
    ? Math.round(logged.reduce((sum, d) => sum + d.totalMl, 0) / logged.length)
    : 0;
  const goalDaysCount = days.filter((d) => d.metGoal).length;
  const maxMl = days.reduce((max, d) => Math.max(max, d.totalMl), 0);

  return {
    days,
    avgMl,
    loggedDays: logged.length,
    goalDaysCount,
    maxMl,
    targetMl: safeTarget,
  };
}

export function buildWarningStampsStats(
  meals: MealWithQualityItems[],
  dates: string[]
): WarningStampsPeriodStats {
  const dateSet = new Set(dates);
  const stampCounts: Record<ChileanStampType, number> = {
    calories: 0,
    sugars: 0,
    fats: 0,
    sodium: 0,
  };

  let totalItems = 0;
  let cleanItems = 0;

  for (const meal of meals) {
    if (!meal?.logged_at) continue;
    const key = getDateKey(new Date(meal.logged_at));
    if (!dateSet.has(key)) continue;

    for (const item of meal.meal_items || []) {
      const grams = toPositiveNumber(item.grams);
      if (!item.food_name || grams <= 0) continue;

      totalItems++;
      const stamps = detectFoodWarningLabels({
        food: item.food_name,
        calories: toPositiveNumber(item.calories),
        protein: toPositiveNumber(item.protein),
        carbs: toPositiveNumber(item.carbs),
        fat: toPositiveNumber(item.fat),
        grams,
        unit: item.unit || undefined,
      });

      if (stamps.length === 0) {
        cleanItems++;
      } else {
        for (const s of stamps) {
          stampCounts[s.stamp] = (stampCounts[s.stamp] || 0) + 1;
        }
      }
    }
  }

  const stampedItems = totalItems - cleanItems;
  const cleanPercent = totalItems > 0 ? Math.round((cleanItems / totalItems) * 100) : 100;

  let topStamp: ChileanStampType | null = null;
  let topCount = 0;
  (["calories", "sugars", "fats", "sodium"] as ChileanStampType[]).forEach((key) => {
    if (stampCounts[key] > topCount) {
      topCount = stampCounts[key];
      topStamp = key;
    }
  });

  const tip =
    totalItems === 0
      ? "Registra alimentos para analizar cuántos tienen sellos negros Ley 20.606 en tu semana."
      : topStamp === null
        ? "¡Excelente calidad nutricional! Todos los alimentos evaluados en este período están libres de sellos negros."
        : cleanPercent >= 80
          ? `Gran equilibrio: ${cleanPercent}% de tus alimentos fueron libres de sellos. ${STAMP_TIPS[topStamp]}`
          : STAMP_TIPS[topStamp];

  return {
    totalItems,
    cleanItems,
    stampedItems,
    cleanPercent,
    stampCounts,
    topStamp,
    tip,
  };
}
