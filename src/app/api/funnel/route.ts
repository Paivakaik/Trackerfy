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
  const campaign = searchParams.get("campaign");
  const platform = searchParams.get("platform");
  const adAccount = searchParams.get("adAccount");
  const { start, end } = resolvePeriod(period, from, to);

  const baseWhere = {
    productId,
    createdAt: { gte: start, lte: end },
    ...(campaign ? { utmCampaign: campaign } : {}),
    ...(platform ? { utmSource: platform } : {}),
    ...(adAccount ? { adAccount: adAccount } : {}),
  };

  const [clickRows, pageViewRows, icRows, purchaseEvents] = await Promise.all([
    prisma.event.findMany({
      where: { ...baseWhere, type: "CLICK" },
      select: { sessionId: true },
    }),
    prisma.event.findMany({
      where: { ...baseWhere, type: "PAGE_VIEW" },
      select: { sessionId: true },
    }),
    prisma.event.findMany({
      where: { ...baseWhere, type: "INITIATE_CHECKOUT" },
      select: { sessionId: true },
    }),
    prisma.event.findMany({
      where: { ...baseWhere, type: "PURCHASE" },
      select: { sessionId: true, value: true, saleStatus: true },
    }),
  ]);

  const clicks = new Set(clickRows.map((r) => r.sessionId)).size;
  const pageViews = new Set(pageViewRows.map((r) => r.sessionId)).size;
  const initiateCheckouts = new Set(icRows.map((r) => r.sessionId)).size;
  // Sessões distintas com pelo menos 1 compra (qualquer status), para manter
  // o funil sempre não-crescente (mesma unidade de contagem em todas as
  // etapas) e representar quem concluiu a ação de compra.
  const purchases = new Set(purchaseEvents.map((r) => r.sessionId)).size;
  // A receita exibida no funil só considera vendas pagas — pendentes e
  // reembolsadas aparecem separadamente no card de Resumo.
  const revenue = purchaseEvents
    .filter((e) => e.saleStatus === "paid")
    .reduce((sum, e) => sum + (e.value ?? 0), 0);

  const top = clicks || 1;
  const pct = (n: number) => (clicks === 0 ? 0 : Math.round((n / top) * 1000) / 10);

  const stages = [
    { key: "click", label: "Cliques", count: clicks, pct: 100 },
    { key: "page_view", label: "Page View", count: pageViews, pct: pct(pageViews) },
    {
      key: "initiate_checkout",
      label: "Initiate Checkout",
      count: initiateCheckouts,
      pct: pct(initiateCheckouts),
    },
    { key: "purchase", label: "Vendas", count: purchases, pct: pct(purchases) },
  ];

  const adSpendRow = await prisma.adSpend.findFirst({
    where: {
      productId,
      campaign: campaign ?? "__all__",
      periodStart: start,
      periodEnd: end,
    },
  });

  const spend = adSpendRow?.amount ?? 0;
  const costPerSale = purchases > 0 && spend > 0 ? spend / purchases : null;

  return NextResponse.json({
    stages,
    revenue,
    spend,
    costPerSale,
    range: { start, end },
  });
}
