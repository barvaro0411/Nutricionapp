// Pure multi-runtime helpers for Master Plan day-cycling and checklist persistence.
// Imported by both Expo/Metro client code and Deno Edge Functions (keep dependency-free).

export interface PlanMacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface PlanGoalsLike {
  standard: PlanMacroTargets;
  matchDay?: (PlanMacroTargets & { weekdays?: number[]; days?: string }) | null;
}

export interface PlanShapeLike {
  dailyGoals?: PlanGoalsLike | null;
  dailyChecklist?: string[] | null;
}

export interface ChecklistHistoryRowLike {
  plan_date: string;
  completed_count: number;
  total_items: number;
  checked_items?: unknown;
}

export interface DayPlanResolution extends PlanMacroTargets {
  isMatchDay: boolean;
}

export interface ChecklistDayProgress {
  dateKey: string;
  completedCount: number;
  totalItems: number;
  pct: number;
}

export interface ChecklistAdherenceSummary {
  today: {
    completedCount: number;
    totalItems: number;
    pct: number;
  };
  weeklyAveragePct: number;
  streakDays: number;
  days: ChecklistDayProgress[];
}

export const WEEKDAY_OPTIONS: ReadonlyArray<{
  value: number;
  short: string;
  name: string;
}> = [
  { value: 1, short: "L", name: "Lunes" },
  { value: 2, short: "M", name: "Martes" },
  { value: 3, short: "X", name: "Miércoles" },
  { value: 4, short: "J", name: "Jueves" },
  { value: 5, short: "V", name: "Viernes" },
  { value: 6, short: "S", name: "Sábado" },
  { value: 0, short: "D", name: "Domingo" },
];

export function formatWeekdaysLabel(weekdays: number[]): string {
  const unique = normalizeWeekdays(weekdays);
  if (unique.length === 0) return "Sin días especiales";
  return WEEKDAY_OPTIONS.filter((opt) => unique.includes(opt.value))
    .map((opt) => opt.name)
    .join(", ");
}

export function normalizeWeekdays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const valid: number[] = [];
  for (const item of raw) {
    if (typeof item === "number" && Number.isInteger(item) && item >= 0 && item <= 6 && !seen.has(item)) {
      seen.add(item);
      valid.push(item);
    }
  }
  return valid;
}

/**
 * Returns configured load/match weekdays (0 = Sunday .. 6 = Saturday).
 * Legacy plans that predate `weekdays` default to `[0]` (Sunday), whereas
 * explicit `[]` means uniform daily targets across the entire week.
 */
export function getMatchDayWeekdays(plan: PlanShapeLike | null | undefined): number[] {
  const matchDay = plan?.dailyGoals?.matchDay;
  if (!matchDay) return [];
  if (matchDay.weekdays === undefined) return [0];
  return normalizeWeekdays(matchDay.weekdays);
}

export function isConfiguredMatchDay(
  plan: PlanShapeLike | null | undefined,
  weekday: number,
): boolean {
  return getMatchDayWeekdays(plan).includes(weekday);
}

/**
 * Resolves effective macro targets for a weekday. Switches to `matchDay` when
 * the weekday is configured AND the user's active goal matches `standard`
 * (within small rounding tolerances), preserving manual goal overrides.
 */
export function resolveDayPlanTargets(
  plan: PlanShapeLike | null | undefined,
  weekday: number,
  baseGoal: PlanMacroTargets,
): DayPlanResolution {
  const standard = plan?.dailyGoals?.standard;
  const matchDay = plan?.dailyGoals?.matchDay;
  if (!plan || !standard || !matchDay) {
    return { isMatchDay: false, ...baseGoal };
  }

  if (!isConfiguredMatchDay(plan, weekday)) {
    return { isMatchDay: false, ...baseGoal };
  }

  const matchesStandard =
    Math.abs(baseGoal.calories - standard.calories) <= 5 &&
    Math.abs(baseGoal.proteinG - standard.proteinG) <= 2 &&
    Math.abs(baseGoal.carbsG - standard.carbsG) <= 2 &&
    Math.abs(baseGoal.fatG - standard.fatG) <= 2;

  if (!matchesStandard) {
    return { isMatchDay: false, ...baseGoal };
  }

  return {
    isMatchDay: true,
    calories: Math.round(matchDay.calories),
    proteinG: Math.round(matchDay.proteinG),
    carbsG: Math.round(matchDay.carbsG),
    fatG: Math.round(matchDay.fatG),
  };
}

export function normalizeHabitKey(label: string): string {
  return label.trim().replace(/\s+/g, " ").toLowerCase();
}

export function sanitizeCheckedItems(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    const key = normalizeHabitKey(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result.slice(0, 50);
}

export function isHabitChecked(checkedItems: readonly string[], habit: string): boolean {
  const target = normalizeHabitKey(habit);
  if (!target) return false;
  return checkedItems.some((item) => normalizeHabitKey(item) === target);
}

export function countCompletedHabits(
  checkedItems: readonly string[],
  checklist: readonly string[],
): { completedCount: number; totalItems: number; pct: number } {
  const cleanChecklist = checklist.map((item) => item.trim()).filter(Boolean);
  const totalItems = cleanChecklist.length;
  if (totalItems === 0) {
    return { completedCount: 0, totalItems: 0, pct: 0 };
  }
  const completedCount = cleanChecklist.filter((habit) => isHabitChecked(checkedItems, habit)).length;
  return {
    completedCount,
    totalItems,
    pct: Math.round((completedCount / totalItems) * 100),
  };
}

export function toggleCheckedHabit(
  checkedItems: readonly string[],
  checklist: readonly string[],
  habit: string,
): { checkedItems: string[]; completedCount: number; totalItems: number } {
  const cleanChecklist = checklist.map((item) => item.trim()).filter(Boolean);
  const targetKey = normalizeHabitKey(habit);
  const nextKeys = new Set(checkedItems.map(normalizeHabitKey).filter(Boolean));

  if (targetKey) {
    if (nextKeys.has(targetKey)) {
      nextKeys.delete(targetKey);
    } else {
      nextKeys.add(targetKey);
    }
  }

  // Canonicalize checked items against the active checklist so stale/reordered
  // labels remain clean and bounded.
  const nextChecked = cleanChecklist.filter((item) => nextKeys.has(normalizeHabitKey(item)));

  return {
    checkedItems: nextChecked,
    completedCount: nextChecked.length,
    totalItems: cleanChecklist.length,
  };
}

/**
 * Computes checklist adherence over chronological `dateKeys`.
 * Today's progress can recompute dynamically against `currentChecklist` so
 * editing habits immediately updates the progress bar; prior days preserve
 * their stored snapshot counts.
 */
export function computeChecklistAdherence(
  historyRows: readonly ChecklistHistoryRowLike[],
  dateKeys: readonly string[],
  currentChecklist?: readonly string[],
  todayKey?: string,
): ChecklistAdherenceSummary {
  const byDate = new Map<string, ChecklistHistoryRowLike>();
  for (const row of historyRows) {
    byDate.set(row.plan_date, row);
  }

  const days: ChecklistDayProgress[] = dateKeys.map((dateKey) => {
    const row = byDate.get(dateKey);
    if (dateKey === todayKey && currentChecklist) {
      const checked = sanitizeCheckedItems(row?.checked_items);
      const { completedCount, totalItems, pct } = countCompletedHabits(checked, currentChecklist);
      return { dateKey, completedCount, totalItems, pct };
    }
    const totalItems = Math.max(0, Number(row?.total_items ?? 0));
    const completedCount = Math.min(totalItems, Math.max(0, Number(row?.completed_count ?? 0)));
    const pct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
    return { dateKey, completedCount, totalItems, pct };
  });

  const activeToday =
    (todayKey ? days.find((d) => d.dateKey === todayKey) : days[days.length - 1]) ?? {
      completedCount: 0,
      totalItems: currentChecklist?.length ?? 0,
      pct: 0,
    };

  const nonZeroTracked = days.filter(
    (d) => byDate.has(d.dateKey) && d.totalItems > 0,
  );
  const weeklyAveragePct =
    nonZeroTracked.length > 0
      ? Math.round(nonZeroTracked.reduce((acc, d) => acc + d.pct, 0) / nonZeroTracked.length)
      : 0;

  let streakDays = 0;
  if (days.length > 0) {
    const lastIdx = days.length - 1;
    // Allow today to still be in progress without breaking yesterday's active streak.
    let cursor = days[lastIdx].pct >= 80 ? lastIdx : lastIdx - 1;
    while (cursor >= 0 && days[cursor].totalItems > 0 && days[cursor].pct >= 80) {
      streakDays += 1;
      cursor -= 1;
    }
  }

  return {
    today: {
      completedCount: activeToday.completedCount,
      totalItems: activeToday.totalItems,
      pct: activeToday.pct,
    },
    weeklyAveragePct,
    streakDays,
    days,
  };
}

export function clampPlanInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
