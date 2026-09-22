export type PeriodKey = "today" | "7d" | "30d" | "custom";

// O servidor roda em UTC (Vercel), mas "hoje"/"7 dias"/"30 dias" precisam
// bater com o dia no fuso do Brasil — senão um evento às 22h em São Paulo já
// conta como "amanhã" no servidor e some do filtro "Hoje". Brasil não usa
// horário de verão desde 2019, então o offset -03:00 é fixo o ano todo.
const BRAZIL_TZ = "America/Sao_Paulo";

function saoPauloDateParts(date: Date): { y: number; m: number; d: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: BRAZIL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [y, m, d] = fmt.format(date).split("-").map(Number);
  return { y, m, d };
}

function startOfDayBRT(y: number, m: number, d: number): Date {
  // 00:00:00 em São Paulo (UTC-3) = 03:00:00 UTC do mesmo dia.
  return new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0));
}

function endOfDayBRT(y: number, m: number, d: number): Date {
  // 23:59:59.999 em São Paulo = 02:59:59.999 UTC do dia seguinte.
  return new Date(Date.UTC(y, m - 1, d + 1, 2, 59, 59, 999));
}

function shiftDays(y: number, m: number, d: number, delta: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

export function resolvePeriod(
  period: PeriodKey,
  customFrom?: string | null,
  customTo?: string | null
): { start: Date; end: Date } {
  const today = saoPauloDateParts(new Date());

  if (period === "today") {
    return { start: startOfDayBRT(today.y, today.m, today.d), end: endOfDayBRT(today.y, today.m, today.d) };
  }

  if (period === "7d") {
    const from = shiftDays(today.y, today.m, today.d, -6);
    return { start: startOfDayBRT(from.y, from.m, from.d), end: endOfDayBRT(today.y, today.m, today.d) };
  }

  if (period === "30d") {
    const from = shiftDays(today.y, today.m, today.d, -29);
    return { start: startOfDayBRT(from.y, from.m, from.d), end: endOfDayBRT(today.y, today.m, today.d) };
  }

  if (period === "custom" && customFrom && customTo) {
    const [fy, fm, fd] = customFrom.split("-").map(Number);
    const [ty, tm, td] = customTo.split("-").map(Number);
    return { start: startOfDayBRT(fy, fm, fd), end: endOfDayBRT(ty, tm, td) };
  }

  return { start: startOfDayBRT(today.y, today.m, today.d), end: endOfDayBRT(today.y, today.m, today.d) };
}
