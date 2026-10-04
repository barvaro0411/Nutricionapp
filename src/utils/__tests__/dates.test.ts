import { getDateKey, getDayRange, parseDecimal } from "../dates";
test("late evening in Chile remains on the previous UTC calendar day", () => {
  expect(getDateKey(new Date("2026-10-03T01:00:00Z"))).toBe("2026-10-02");
  expect(getDayRange("2026-10-02")).toEqual({ start: "2026-10-02T03:00:00.000Z", end: "2026-10-03T03:00:00.000Z" });
});
test("Chile DST day has 23 hours and includes every instant of that date", () => {
  const { start, end } = getDayRange("2026-09-06");
  expect((Date.parse(end) - Date.parse(start)) / 3600000).toBe(23);
  expect(getDateKey(new Date(start))).toBe("2026-09-06");
  expect(getDateKey(new Date(Date.parse(end) - 1))).toBe("2026-09-06");
});
test("rejects invalid dates and blank numbers, accepts decimal commas", () => {
  expect(() => getDayRange("2026-02-30")).toThrow();
  expect(Number.isNaN(parseDecimal(""))).toBe(true);
  expect(parseDecimal("70,6")).toBe(70.6);
});
