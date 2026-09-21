import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";
import { resolvePeriod, PeriodKey } from "@/lib/dateRanges";
import { getAdSpendTotal } from "@/lib/adspend";

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

  const where = {
    productId,
    type: "PURCHASE",
    createdAt: { gte: start, lte: end },
    ...(campaign ? { utmCampaign: campaign } : {}),
    ...(platform ? { utmSource: platform } : {}),
    ...(adAccount ? { adAccount: adAccount } : {}),
  };

  const [purchases, spend] = await Promise.all([
    prisma.event.findMany({
      where,
      select: { value: true, taxAmount: true, saleStatus: true, paymentMethod: true },
    }),
    getAdSpendTotal(productId, campaign, start, end),
  ]);

  const paid = purchases.filter((p) => p.saleStatus === "paid");
  const pending = purchases.filter((p) => p.saleStatus === "pending");
  const refunded = purchases.filter((p) => p.saleStatus === "refunded");
  const chargeback = purchases.filter((p) => p.saleStatus === "chargeback");

  const grossRevenue = sum(paid.map((p) => p.value));
  const tax = sum(paid.map((p) => p.taxAmount));
  const netRevenue = grossRevenue - tax;
  const pendingRevenue = sum(pending.map((p) => p.value));
  const refundedRevenue = sum(refunded.map((p) => p.value));

  const profit = netRevenue - spend;
  const roas = spend > 0 ? netRevenue / spend : null;
  const roi = spend > 0 ? (profit / spend) * 100 : null;
  const profitMargin = netRevenue > 0 ? (profit / netRevenue) * 100 : null;
  const arpu = paid.length > 0 ? netRevenue / paid.length : 0;
  const totalSalesCount = purchases.length;
  const refundRate = totalSalesCount > 0 ? (refunded.length / totalSalesCount) * 100 : 0;
  const chargebackRate =
    totalSalesCount > 0 ? (chargeback.length / totalSalesCount) * 100 : 0;

  const paymentBreakdown = ["pix", "card", "boleto", "other"].map((method) => {
    const count = paid.filter((p) => p.paymentMethod === method).length;
    return {
      method,
      count,
      pct: paid.length > 0 ? Math.round((count / paid.length) * 1000) / 10 : 0,
    };
  });

  return NextResponse.json({
    netRevenue,
    grossRevenue,
    spend,
    roas,
    profit,
    roi,
    profitMargin,
    pendingRevenue,
    refundedRevenue,
    refundRate,
    chargebackRate,
    arpu,
    tax,
    paidCount: paid.length,
    totalSalesCount,
    paymentBreakdown,
  });
}

function sum(values: (number | null)[]) {
  return values.reduce((acc: number, v) => acc + (v ?? 0), 0);
}
