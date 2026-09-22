import type { FunnelResponse, SummaryResponse } from "@/lib/types";

export type TrackerInsight = {
  headline: string;
  detail: string;
  suggestion: string;
  severity: "ok" | "warn" | "bad";
};

// Cada etapa consecutiva do funil vira uma "aresta" — a taxa de conversão de
// uma pra outra. A aresta com a MENOR conversão relativa é o gargalo, e cada
// uma tem um diagnóstico/sugestão específico porque a causa provável é
// diferente (página lenta vs. checkout abandonado vs. pagamento recusado).
const EDGE_COPY: Record<
  number,
  { label: string; diagnose: (pct: number) => string; suggest: string }
> = {
  0: {
    label: "Cliques → Vis. Página",
    diagnose: (pct) =>
      `só ${pct.toFixed(0)}% de quem clicou chegou a ver a página carregada`,
    suggest:
      "verifique a velocidade de carregamento da página e se o link do anúncio está apontando pro lugar certo.",
  },
  1: {
    label: "Vis. Página → ICs",
    diagnose: (pct) =>
      `apenas ${pct.toFixed(0)}% de quem viu a página clicou em comprar`,
    suggest:
      "a página de vendas pode não estar convencendo — revise a oferta, prova social ou o botão de compra (visibilidade, texto, urgência).",
  },
  2: {
    label: "ICs → Vendas Inic.",
    diagnose: (pct) =>
      `${pct.toFixed(0)}% de quem clicou em comprar realmente gerou um pedido`,
    suggest:
      "muita gente está abandonando o checkout — confira se o processo tem poucos campos, se o preço/frete some no meio do caminho, e se o checkout carrega rápido.",
  },
  3: {
    label: "Vendas Inic. → Vendas Apr.",
    diagnose: (pct) =>
      `só ${pct.toFixed(0)}% dos pedidos gerados viraram venda aprovada`,
    suggest:
      "olhe as vendas pendentes: pix/boleto pode estar vencendo sem pagamento, ou cartão sendo recusado. Considere lembretes de pagamento pendente.",
  },
};

export function analyzeFunnel(
  funnel: FunnelResponse,
  summary: SummaryResponse | null
): TrackerInsight | null {
  const stages = funnel.stages;
  if (stages.length < 2) return null;
  if (stages[0].count === 0) {
    return {
      headline: "Sem cliques nesse período",
      detail:
        "Não há dados suficientes pra analisar o funil — nenhum clique registrado no período/filtro selecionado.",
      suggestion: "Tente ampliar o período ou remova os filtros de campanha/conta.",
      severity: "warn",
    };
  }

  let worstEdge = 0;
  let worstConversion = 100;
  for (let i = 0; i < stages.length - 1; i++) {
    const prevCount = stages[i].count || 1;
    const conversion = (stages[i + 1].count / prevCount) * 100;
    if (conversion < worstConversion) {
      worstConversion = conversion;
      worstEdge = i;
    }
  }

  const copy = EDGE_COPY[worstEdge];
  const approvedStage = stages[stages.length - 1];
  const overallApproved = (approvedStage.count / (stages[0].count || 1)) * 100;

  const severity: TrackerInsight["severity"] =
    worstConversion < 20 ? "bad" : worstConversion < 50 ? "warn" : "ok";

  const spendNote =
    summary && summary.spend > 0 && summary.roas !== null
      ? summary.roas < 1
        ? ` Com o ROAS atual (${summary.roas.toFixed(2)}x), cada venda a mais nesse ponto tem impacto direto no lucro.`
        : ""
      : "";

  const pendingNote =
    worstEdge === 3 && summary && summary.pendingRevenue > 0
      ? ` Hoje tem R$ ${summary.pendingRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} parado em vendas pendentes.`
      : "";

  return {
    headline: `Maior perda: ${copy.label}`,
    detail: `${copy.diagnose(worstConversion)}.${pendingNote} No total, ${overallApproved.toFixed(1)}% de quem clicou virou venda aprovada.`,
    suggestion: `${copy.suggest}${spendNote}`,
    severity,
  };
}
