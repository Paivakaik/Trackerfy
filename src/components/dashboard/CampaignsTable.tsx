"use client";

import type { CampaignRow } from "@/lib/types";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CampaignsTable({ campaigns }: { campaigns: CampaignRow[] | null }) {
  if (!campaigns) {
    return <div style={{ color: "var(--text-muted)" }}>Carregando campanhas...</div>;
  }

  if (campaigns.length === 0) {
    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 32,
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        Nenhuma campanha com gasto ou clique nesse período.
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <Th align="left">Campanha</Th>
              <Th>Gasto</Th>
              <Th>Cliques</Th>
              <Th>Vis. Página</Th>
              <Th>ICs</Th>
              <Th>Vendas Apr.</Th>
              <Th>Conversão</Th>
              <Th>CPA</Th>
              <Th>Faturamento</Th>
              <Th>ROAS</Th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.name} style={{ borderBottom: "1px solid var(--border)" }}>
                <Td align="left" title={c.name}>
                  <span
                    style={{
                      display: "block",
                      maxWidth: 260,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.name}
                  </span>
                </Td>
                <Td>{formatBRL(c.spend)}</Td>
                <Td>{c.clicks.toLocaleString("pt-BR")}</Td>
                <Td>{c.pageViews.toLocaleString("pt-BR")}</Td>
                <Td>{c.ics.toLocaleString("pt-BR")}</Td>
                <Td>{c.salesApproved.toLocaleString("pt-BR")}</Td>
                <Td>{c.convRate.toFixed(1)}%</Td>
                <Td>{c.cpa !== null ? formatBRL(c.cpa) : "—"}</Td>
                <Td>{formatBRL(c.revenue)}</Td>
                <Td
                  style={{
                    color:
                      c.roas === null
                        ? "var(--text-muted)"
                        : c.roas >= 1
                        ? "var(--accent-2)"
                        : "var(--danger)",
                    fontWeight: 700,
                  }}
                >
                  {c.roas !== null ? `${c.roas.toFixed(2)}x` : "—"}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, align = "center" }: { children: React.ReactNode; align?: "left" | "center" }) {
  return (
    <th
      style={{
        textAlign: align,
        padding: "10px 12px",
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-muted)",
        letterSpacing: 0.3,
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "center",
  style,
  title,
}: {
  children: React.ReactNode;
  align?: "left" | "center";
  style?: React.CSSProperties;
  title?: string;
}) {
  return (
    <td
      title={title}
      style={{
        textAlign: align,
        padding: "10px 12px",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </td>
  );
}
