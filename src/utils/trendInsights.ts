import { DayStat, ProgressMetric } from "./progressStats";
import { WeightTrendPoint } from "@/services/weightService";

export interface SvgPoint {
  x: number;
  y: number;
}

/**
 * Construye un path SVG suavizado (Catmull-Rom / Bézier cúbico) a partir de coordenadas.
 */
export function buildSmoothSvgPath(points: SvgPoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  }
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export interface BmiSummary {
  bmi: number;
  label: string;
  tone: "success" | "warning" | "danger";
}

export function computeBmiSummary(
  weightKg: number | null,
  heightCm?: number | null
): BmiSummary | null {
  if (!weightKg || !heightCm || heightCm < 100 || heightCm > 250) return null;
  const h = heightCm / 100;
  const bmi = Math.round((weightKg / (h * h)) * 10) / 10;
  if (bmi < 18.5) return { bmi, label: "Bajo peso", tone: "warning" };
  if (bmi < 25) return { bmi, label: "Saludable", tone: "success" };
  if (bmi < 30) return { bmi, label: "Sobrepeso", tone: "warning" };
  return { bmi, label: "Obesidad", tone: "danger" };
}

/**
 * Calcula la velocidad semanal de cambio de peso (kg/semana) a partir de los puntos visibles.
 */
export function computeWeeklyWeightRate(points: WeightTrendPoint[]): number | null {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const msDiff =
    new Date(`${last.date}T12:00:00Z`).getTime() -
    new Date(`${first.date}T12:00:00Z`).getTime();
  const days = Math.max(1, msDiff / (1000 * 60 * 60 * 24));
  const rate = ((last.weightKg - first.weightKg) / days) * 7;
  // Limitar a un rango razonable para evitar ruido cuando los registros son de 1 día
  const clamped = Math.max(-3, Math.min(3, rate));
  return Math.round(clamped * 100) / 100;
}

export interface MetricTrendInsights {
  average: number;
  targetPct: number | null;
  daysOnTarget: number;
  loggedDays: number;
  peakDay: DayStat | null;
  minDay: DayStat | null;
}

export function isDayOnMetricTarget(
  value: number,
  metric: ProgressMetric,
  target?: number
): boolean {
  if (!target || target <= 0 || value <= 0) return false;
  const ratio = value / target;
  if (metric === "protein") {
    return ratio >= 0.85;
  }
  return ratio >= 0.8 && ratio <= 1.12;
}

export function computeMetricTrendInsights(
  days: DayStat[],
  metric: ProgressMetric,
  target?: number
): MetricTrendInsights {
  const logged = days.filter((d) => d.mealCount > 0);
  if (logged.length === 0) {
    return {
      average: 0,
      targetPct: null,
      daysOnTarget: 0,
      loggedDays: 0,
      peakDay: null,
      minDay: null,
    };
  }

  const total = logged.reduce((sum, d) => sum + d[metric], 0);
  const average = Math.round(total / logged.length);
  const targetPct = target && target > 0 ? Math.round((average / target) * 100) : null;
  const daysOnTarget = logged.filter((d) =>
    isDayOnMetricTarget(d[metric], metric, target)
  ).length;

  let peakDay = logged[0];
  let minDay = logged[0];
  for (const d of logged) {
    if (d[metric] > peakDay[metric]) peakDay = d;
    if (d[metric] < minDay[metric]) minDay = d;
  }

  return {
    average,
    targetPct,
    daysOnTarget,
    loggedDays: logged.length,
    peakDay,
    minDay,
  };
}

export interface MacroEnergySplit {
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  hasData: boolean;
}

/**
 * Calcula el reparto porcentual de energía (Atwater 4/4/9) según los promedios de macros.
 */
export function computeMacroEnergySplit(averages?: {
  protein: number;
  carbs: number;
  fat: number;
}): MacroEnergySplit {
  if (!averages) {
    return { proteinPct: 0, carbsPct: 0, fatPct: 0, hasData: false };
  }
  const pKcal = Math.max(0, averages.protein) * 4;
  const cKcal = Math.max(0, averages.carbs) * 4;
  const fKcal = Math.max(0, averages.fat) * 9;
  const sum = pKcal + cKcal + fKcal;
  if (sum <= 0) {
    return { proteinPct: 0, carbsPct: 0, fatPct: 0, hasData: false };
  }
  const proteinPct = Math.round((pKcal / sum) * 100);
  const carbsPct = Math.round((cKcal / sum) * 100);
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct);
  return { proteinPct, carbsPct, fatPct, hasData: true };
}

/**
 * Formatea valores compactos para etiquetas sobre barras estrechas (ej. 1850 -> "1.9k").
 */
export function formatCompactMetricValue(value: number, compactMode: boolean): string {
  const rounded = Math.round(value);
  if (!compactMode || rounded < 1000) return String(rounded);
  return `${(rounded / 1000).toFixed(1)}k`;
}
