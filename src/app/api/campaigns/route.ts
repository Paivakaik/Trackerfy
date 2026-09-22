import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";
import { resolvePeriod, PeriodKey } from "@/lib/dateRanges";

// O nome da campanha no gasto (Meta) é o nome puro ("CALISTENIA 4 — Cópia").
// Já o utm_campaign do clique costuma vir como "nome|id_da_campanha" (o
// padrão de UTM dinâmica da Meta), e às vezes com "+" no lugar de espaço
// dependendo de como a URL do anúncio foi montada. Normalizamos os dois
// lados pro mesmo formato pra conseguir juntar gasto com clique/venda por
// campanha.
function normalizeCampaignName(raw: string): string {
  const beforePipe = raw.split("|")[0];
  return beforePipe.replace(/\+/g, " ").trim().toLowerCase();
}

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

  const [spendRows, events, statusRows] = await Promise.all([
    prisma.adSpend.findMany({
      where: {
        productId,
        campaign: { not: "__all__" },
        periodStart: { gte: start },
        periodEnd: { lte: end },
      },
      select: {
        campaign: true,
        amount: true,
        source: true,
        impressions: true,
        linkClicks: true,
        videoHook: true,
        videoHold: true,
      },
    }),
    prisma.event.findMany({
      where: { productId, createdAt: { gte: start, lte: end }, utmCampaign: { not: null } },
      select: {
        type: true,
        sessionId: true,
        utmCampaign: true,
        saleStatus: true,
        value: true,
        netValue: true,
      },
    }),
    prisma.campaignStatus.findMany({ where: { productId }, select: { campaign: true, status: true } }),
  ]);

  type Row = {
    displayName: string;
    spend: number;
    impressions: number;
    linkClicks: number;
    videoHook: number;
    videoHold: number;
    clicks: Set<string>;
    pageViews: Set<string>;
    ics: Set<string>;
    salesInit: Set<string>;
    salesApproved: Set<string>;
    revenue: number;
  };

  const rows = new Map<string, Row>();

  function getRow(key: string, displayName: string): Row {
    let row = rows.get(key);
    if (!row) {
      row = {
        displayName,
        spend: 0,
        impressions: 0,
        linkClicks: 0,
        videoHook: 0,
        videoHold: 0,
        clicks: new Set(),
        pageViews: new Set(),
        ics: new Set(),
        salesInit: new Set(),
        salesApproved: new Set(),
        revenue: 0,
      };
      rows.set(key, row);
    }
    return row;
  }

  const statusByKey = new Map<string, string>();
  for (const s of statusRows) {
    statusByKey.set(normalizeCampaignName(s.campaign), s.status);
  }

  for (const s of spendRows) {
    const key = normalizeCampaignName(s.campaign);
    const row = getRow(key, s.campaign);
    row.spend += s.amount;
    row.impressions += s.impressions ?? 0;
    row.linkClicks += s.linkClicks ?? 0;
    row.videoHook += s.videoHook ?? 0;
    row.videoHold += s.videoHold ?? 0;
  }

  for (const e of events) {
    const key = normalizeCampaignName(e.utmCampaign!);
    const row = getRow(key, e.utmCampaign!.split("|")[0].replace(/\+/g, " ").trim());

    if (e.type === "CLICK") row.clicks.add(e.sessionId);
    else if (e.type === "PAGE_VIEW") row.pageViews.add(e.sessionId);
    else if (e.type === "INITIATE_CHECKOUT") row.ics.add(e.sessionId);
    else if (e.type === "PURCHASE") {
      row.salesInit.add(e.sessionId);
      if (e.saleStatus && e.saleStatus !== "pending") {
        row.salesApproved.add(e.sessionId);
        if (e.saleStatus === "paid") row.revenue += e.netValue ?? e.value ?? 0;
      }
    }
  }

  const campaigns = Array.from(rows.entries())
    .map(([key, r]) => {
      const clicks = r.clicks.size;
      const approved = r.salesApproved.size;
      return {
        name: r.displayName,
        status: statusByKey.get(key) ?? null,
        spend: r.spend,
        clicks,
        pageViews: r.pageViews.size,
        ics: r.ics.size,
        salesInit: r.salesInit.size,
        salesApproved: approved,
        revenue: r.revenue,
        roas: r.spend > 0 ? r.revenue / r.spend : null,
        cpa: approved > 0 ? r.spend / approved : null,
        convRate: clicks > 0 ? (approved / clicks) * 100 : 0,
        // Métricas do próprio anúncio (Meta): impressões/cliques do link, não
        // o clique rastreado pelo nosso script.
        cpc: r.linkClicks > 0 ? r.spend / r.linkClicks : null,
        cpm: r.impressions > 0 ? (r.spend / r.impressions) * 1000 : null,
        ctr: r.impressions > 0 ? (r.linkClicks / r.impressions) * 100 : null,
        hookRate: r.impressions > 0 ? (r.videoHook / r.impressions) * 100 : null,
        holdRate: r.videoHook > 0 ? (r.videoHold / r.videoHook) * 100 : null,
        roi: r.spend > 0 ? ((r.revenue - r.spend) / r.spend) * 100 : null,
      };
    })
    .sort((a, b) => b.spend - a.spend);

  return NextResponse.json({ campaigns });
}
