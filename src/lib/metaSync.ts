import { prisma } from "@/lib/prisma";
import { fetchDailyCampaignSpend, fetchCampaignStatuses } from "@/lib/meta";
import type { AdConnection } from "@prisma/client";
import { subDays, format } from "date-fns";
import { dayBoundsBRT } from "@/lib/dateRanges";

// Sincroniza os últimos `daysBack` dias (padrão 3, para cobrir atraso de
// atribuição/fuso horário) de gasto por campanha da Meta Ads para dentro do
// AdSpend. Cada dia gera uma linha por campanha (source="meta") mais uma
// linha "__all__" com o total do dia, para que o filtro "todas as campanhas"
// funcione mesmo que o nome da campanha na Meta não bata com o utm_campaign.
export async function syncMetaAdConnection(connection: AdConnection, daysBack = 3) {
  if (!connection.adAccountId) {
    throw new Error("Nenhuma conta de anúncios selecionada para esta conexão");
  }

  const until = new Date();
  const since = subDays(until, daysBack - 1);
  const sinceStr = format(since, "yyyy-MM-dd");
  const untilStr = format(until, "yyyy-MM-dd");

  const [rows, statuses] = await Promise.all([
    fetchDailyCampaignSpend(connection.accessToken, connection.adAccountId, sinceStr, untilStr),
    fetchCampaignStatuses(connection.accessToken, connection.adAccountId).catch(() => []),
  ]);

  const totalsByDay = new Map<
    string,
    { amount: number; impressions: number; linkClicks: number; video3s: number; videoThru: number }
  >();
  for (const row of rows) {
    const acc = totalsByDay.get(row.date) ?? {
      amount: 0,
      impressions: 0,
      linkClicks: 0,
      video3s: 0,
      videoThru: 0,
    };
    acc.amount += row.amount;
    acc.impressions += row.impressions;
    acc.linkClicks += row.linkClicks;
    acc.video3s += row.video3s;
    acc.videoThru += row.videoThru;
    totalsByDay.set(row.date, acc);
  }

  const writes = [];

  for (const row of rows) {
    const { start: periodStart, end: periodEnd } = dayBoundsBRT(row.date);
    const fields = {
      amount: row.amount,
      impressions: row.impressions,
      linkClicks: row.linkClicks,
      video3s: row.video3s,
      videoThru: row.videoThru,
    };
    writes.push(
      prisma.adSpend.upsert({
        where: {
          productId_campaign_periodStart_periodEnd_source: {
            productId: connection.productId,
            campaign: row.campaign,
            periodStart,
            periodEnd,
            source: "meta",
          },
        },
        update: fields,
        create: {
          productId: connection.productId,
          campaign: row.campaign,
          periodStart,
          periodEnd,
          source: "meta",
          ...fields,
        },
      })
    );
  }

  for (const [dateStr, total] of totalsByDay) {
    const { start: periodStart, end: periodEnd } = dayBoundsBRT(dateStr);
    writes.push(
      prisma.adSpend.upsert({
        where: {
          productId_campaign_periodStart_periodEnd_source: {
            productId: connection.productId,
            campaign: "__all__",
            periodStart,
            periodEnd,
            source: "meta",
          },
        },
        update: total,
        create: {
          productId: connection.productId,
          campaign: "__all__",
          periodStart,
          periodEnd,
          source: "meta",
          ...total,
        },
      })
    );
  }

  for (const s of statuses) {
    writes.push(
      prisma.campaignStatus.upsert({
        where: { productId_campaign: { productId: connection.productId, campaign: s.campaign } },
        update: { status: s.status },
        create: { productId: connection.productId, campaign: s.campaign, status: s.status },
      })
    );
  }

  await prisma.$transaction(writes);

  await prisma.adConnection.update({
    where: { id: connection.id },
    data: { lastSyncedAt: new Date(), lastSyncError: null },
  });

  return { days: totalsByDay.size, campaigns: rows.length };
}
