import { startOfDay, endOfDay, subDays } from "date-fns";

export type PeriodKey = "today" | "7d" | "30d" | "custom";

export function resolvePeriod(
  period: PeriodKey,
  customFrom?: string | null,
  customTo?: string | null
): { start: Date; end: Date } {
  const now = new Date();

  if (period === "today") {
    return { start: startOfDay(now), end: endOfDay(now) };
  }

  if (period === "7d") {
    return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
  }

  if (period === "30d") {
    return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
  }

  if (period === "custom" && customFrom && customTo) {
    return {
      start: startOfDay(new Date(customFrom)),
      end: endOfDay(new Date(customTo)),
    };
  }

  return { start: startOfDay(now), end: endOfDay(now) };
}
