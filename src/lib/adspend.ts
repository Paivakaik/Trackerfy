import { prisma } from "@/lib/prisma";

// Soma todas as linhas de AdSpend (lançadas manualmente ou sincronizadas da
// Meta Ads) cujo período cai dentro do intervalo [start, end] selecionado no
// dashboard. Isso permite que entradas diárias automáticas (Meta) e entradas
// manuais (que cobrem o período exato escolhido) se somem sem conflito.
export async function getAdSpendTotal(
  productId: string,
  campaign: string | null,
  start: Date,
  end: Date
): Promise<number> {
  const rows = await prisma.adSpend.findMany({
    where: {
      productId,
      campaign: campaign ?? "__all__",
      periodStart: { gte: start },
      periodEnd: { lte: end },
    },
    select: { amount: true },
  });

  return rows.reduce((sum, r) => sum + r.amount, 0);
}
