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
  const campaign = searchParams.get("campaign") || "__all__";
  const { start, end } = resolvePeriod(period, from, to);

  const row = await prisma.adSpend.findFirst({
    where: { productId, campaign, periodStart: start, periodEnd: end },
  });

  return NextResponse.json({ amount: row?.amount ?? 0 });
}

export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const body = await req.json();
  const { productId, amount } = body;
  const period = (body.period as PeriodKey) || "30d";
  const campaign = (body.campaign as string) || "__all__";

  if (!productId) {
    return NextResponse.json({ error: "productId é obrigatório" }, { status: 400 });
  }

  const parsedAmount = Number(amount);
  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    return NextResponse.json({ error: "valor inválido" }, { status: 400 });
  }

  const { start, end } = resolvePeriod(period, body.from, body.to);

  const row = await prisma.adSpend.upsert({
    where: {
      productId_campaign_periodStart_periodEnd: {
        productId,
        campaign,
        periodStart: start,
        periodEnd: end,
      },
    },
    update: { amount: parsedAmount },
    create: {
      productId,
      campaign,
      periodStart: start,
      periodEnd: end,
      amount: parsedAmount,
    },
  });

  return NextResponse.json({ adSpend: row });
}
