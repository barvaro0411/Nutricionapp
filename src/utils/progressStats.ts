import { getDateKey } from "./dates";

export type ProgressPeriod = 7 | 30;
export type ProgressMetric = "calories" | "protein" | "carbs" | "fat";
export interface DayStat {
  date: string;
  dayLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealCount: number;
}
export interface DailyTotalsRow {
  log_date: string;
  total_calories: number | string | null;
  total_protein: number | string | null;
  total_carbs: number | string | null;
  total_fat: number | string | null;
  meal_count: number | string | null;
}
export interface WeeklyStats {
  days: DayStat[];
  averages: Record<ProgressMetric, number>;
  totalMeals: number;
  loggedDays: number;
}

// Shift calendar dates in UTC after resolving today in Chile. Device timezone
// and daylight-saving transitions must not shift the displayed days.
export function progressDateKeys(period: ProgressPeriod, endDate = getDateKey()) {
  const end = new Date(`${endDate}T12:00:00Z`);
  return Array.from({ length: period }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - period + 1 + index);
    return date.toISOString().slice(0, 10);
  });
}

export function buildProgressStats(rows: DailyTotalsRow[], dates: string[]): WeeklyStats {
  const byDate = new Map(rows.map(row => [row.log_date, row]));
  const number = (value: number | string | null | undefined) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };
  const days = dates.map(date => {
    const row = byDate.get(date);
    return {
      date,
      dayLabel: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][new Date(`${date}T12:00:00Z`).getUTCDay()],
      calories: number(row?.total_calories), protein: number(row?.total_protein),
      carbs: number(row?.total_carbs), fat: number(row?.total_fat), mealCount: number(row?.meal_count),
    };
  });
  const logged = days.filter(day => day.mealCount > 0);
  const average = (metric: ProgressMetric) => logged.length
    ? Math.round(logged.reduce((sum, day) => sum + day[metric], 0) / logged.length) : 0;
  return {
    days, averages: { calories: average("calories"), protein: average("protein"), carbs: average("carbs"), fat: average("fat") },
    totalMeals: days.reduce((sum, day) => sum + day.mealCount, 0), loggedDays: logged.length,
  };
}
