"use client";

import { useMemo, useState } from "react";
import type { CampaignRow } from "@/lib/types";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPct(v: number | null) {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}

function isActiveStatus(status: string | null) {
  return status === "ACTIVE";
}

export default function CampaignsTable({ campaigns }: { campaigns: CampaignRow[] | null }) {
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);

  const filtered = useMemo(() => {
    if (!campaigns) return null;
    return campaigns.filter((c) => {
      if (activeOnly && !isActiveStatus(c.status)) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [campaigns, search, activeOnly]);

  if (!campaigns) {
    return <div style={{ color: "var(--text-muted)" }}>Carregando campanhas...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Buscar campanha pelo nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            maxWidth: 320,
            padding: "7px 10px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text)",
            fontSize: 13,
            outline: "none",
          }}
        />
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-muted)",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
          />
          Só ativas
        </label>
      </div>

      {!filtered || filtered.length === 0 ? (
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
          {campaigns.length === 0
            ? "Nenhuma campanha com gasto ou clique nesse período."
            : "Nenhuma campanha bate com esse filtro."}
        </div>
      ) : (
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
                  <Th>Status</Th>
                  <Th>Gasto</Th>
                  <Th>CPC</Th>
                  <Th>CPM</Th>
                  <Th>CTR</Th>
                  <Th>Cliques</Th>
                  <Th>Vis. Página</Th>
                  <Th>ICs</Th>
                  <Th>Vendas Apr.</Th>
                  <Th>Conversão</Th>
                  <Th>CPA</Th>
                  <Th>Hook</Th>
                  <Th>Hold</Th>
                  <Th>Faturamento</Th>
                  <Th>ROAS</Th>
                  <Th>ROI</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.name} style={{ borderBottom: "1px solid var(--border)" }}>
                    <Td align="left" title={c.name}>
                      <span
                        style={{
                          display: "block",
                          maxWidth: 240,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.name}
                      </span>
                    </Td>
                    <Td>
                      {c.status ? (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 20,
                            background: isActiveStatus(c.status)
                              ? "rgba(0,212,160,0.15)"
                              : "rgba(255,255,255,0.08)",
                            color: isActiveStatus(c.status) ? "var(--accent-2)" : "var(--text-muted)",
                          }}
                        >
                          {isActiveStatus(c.status) ? "Ativa" : c.status}
                        </span>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>{formatBRL(c.spend)}</Td>
                    <Td>{c.cpc !== null ? formatBRL(c.cpc) : "—"}</Td>
                    <Td>{c.cpm !== null ? formatBRL(c.cpm) : "—"}</Td>
                    <Td>{formatPct(c.ctr)}</Td>
                    <Td>{c.clicks.toLocaleString("pt-BR")}</Td>
                    <Td>{c.pageViews.toLocaleString("pt-BR")}</Td>
                    <Td>{c.ics.toLocaleString("pt-BR")}</Td>
                    <Td>{c.salesApproved.toLocaleString("pt-BR")}</Td>
                    <Td>{c.convRate.toFixed(1)}%</Td>
                    <Td>{c.cpa !== null ? formatBRL(c.cpa) : "—"}</Td>
                    <Td>{formatPct(c.hookRate)}</Td>
                    <Td>{formatPct(c.holdRate)}</Td>
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
                    <Td
                      style={{
                        color:
                          c.roi === null
                            ? "var(--text-muted)"
                            : c.roi >= 0
                            ? "var(--accent-2)"
                            : "var(--danger)",
                        fontWeight: 700,
                      }}
                    >
                      {formatPct(c.roi)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
