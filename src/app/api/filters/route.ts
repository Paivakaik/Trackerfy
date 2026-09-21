import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";
import { resolvePeriod, PeriodKey } from "@/lib/dateRanges";

export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId é obrigatório" }, { status: 400 });
  }

  const period = (searchParams.get("period") as PeriodKey) || "30d";
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const { start, end } = resolvePeriod(period, from, to);

  const where = { productId, createdAt: { gte: start, lte: end } };

  const [campaignRows, sourceRows, adAccountRows] = await Promise.all([
    prisma.event.findMany({
      where: { ...where, utmCampaign: { not: null } },
      select: { utmCampaign: true },
      distinct: ["utmCampaign"],
    }),
    prisma.event.findMany({
      where: { ...where, utmSource: { not: null } },
      select: { utmSource: true },
      distinct: ["utmSource"],
    }),
    prisma.event.findMany({
      where: { ...where, adAccount: { not: null } },
      select: { adAccount: true },
      distinct: ["adAccount"],
    }),
  ]);

  const clean = (arr: (string | null)[]) =>
    arr.filter((v): v is string => Boolean(v)).sort((a, b) => a.localeCompare(b));

  return NextResponse.json({
    campaigns: clean(campaignRows.map((r) => r.utmCampaign)),
    platforms: clean(sourceRows.map((r) => r.utmSource)),
    adAccounts: clean(adAccountRows.map((r) => r.adAccount)),
  });
}
