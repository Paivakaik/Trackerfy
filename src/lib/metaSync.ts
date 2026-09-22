import { prisma } from "@/lib/prisma";
import { fetchDailyCampaignSpend } from "@/lib/meta";
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

  const rows = await fetchDailyCampaignSpend(
    connection.accessToken,
    connection.adAccountId,
    sinceStr,
    untilStr
  );

  const totalsByDay = new Map<string, number>();
  for (const row of rows) {
    totalsByDay.set(row.date, (totalsByDay.get(row.date) ?? 0) + row.amount);
  }

  const writes = [];

  for (const row of rows) {
    const { start: periodStart, end: periodEnd } = dayBoundsBRT(row.date);
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
        update: { amount: row.amount },
        create: {
          productId: connection.productId,
          campaign: row.campaign,
          periodStart,
          periodEnd,
          amount: row.amount,
          source: "meta",
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
        update: { amount: total },
        create: {
          productId: connection.productId,
          campaign: "__all__",
          periodStart,
          periodEnd,
          amount: total,
          source: "meta",
        },
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
