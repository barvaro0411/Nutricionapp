export const APP_TIME_ZONE = "America/Santiago";
const formatter = new Intl.DateTimeFormat("en", {
  timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
});
const rangeCache = new Map<string, { start: string; end: string }>();

export function getDateKey(date: Date = new Date()): string {
  if (!Number.isFinite(date.getTime())) throw new Error("Fecha inválida");
  const parts = formatter.formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

// Find the first instant of the Chilean calendar day, including DST transitions.
function startOfDate(dateKey: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) throw new Error("Fecha inválida");
  const reference = Date.parse(`${dateKey}T12:00:00Z`);
  if (!Number.isFinite(reference) || new Date(reference).toISOString().slice(0,10) !== dateKey) throw new Error("Fecha inválida");
  let low = reference - 36 * 60 * 60 * 1000;
  let high = reference + 36 * 60 * 60 * 1000;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (getDateKey(new Date(middle)) < dateKey) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function getDayRange(date: Date | string = new Date()) {
  const key = typeof date === "string" ? date : getDateKey(date);
  const cached = rangeCache.get(key);
  if (cached) return cached;
  const next = new Date(`${key}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const nextKey = next.toISOString().slice(0, 10);
  const range = { start: new Date(startOfDate(key)).toISOString(), end: new Date(startOfDate(nextKey)).toISOString() };
  if (rangeCache.size >= 128) rangeCache.clear();
  rangeCache.set(key, range);
  return range;
}

export function getWeekday(date: Date = new Date()) {
  return new Date(`${getDateKey(date)}T12:00:00Z`).getUTCDay();
}

export function parseDecimal(value: string): number {
  const clean = value.trim();
  return clean ? Number(clean.replace(",", ".")) : NaN;
}
export function loggedAtForDate(date: Date): string {
  if (getDateKey(date) === getDateKey(new Date())) return new Date().toISOString();
  const { start, end } = getDayRange(date);
  return new Date((Date.parse(start) + Date.parse(end)) / 2).toISOString();
}

export function dateForMealRoute(dateKey?: string): Date {
  if (!dateKey) return new Date();
  try {
    const { start, end } = getDayRange(dateKey);
    return new Date((Date.parse(start) + Date.parse(end)) / 2);
  } catch {
    return new Date();
  }
}
