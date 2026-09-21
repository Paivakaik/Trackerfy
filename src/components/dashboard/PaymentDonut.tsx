"use client";

import type { PaymentBreakdown } from "@/lib/types";

const LABELS: Record<PaymentBreakdown["method"], string> = {
  pix: "Pix",
  card: "Cartão",
  boleto: "Boleto",
  other: "Outros",
};

const COLORS: Record<PaymentBreakdown["method"], string> = {
  pix: "#3b6bff",
  card: "#5bc0eb",
  boleto: "#f0b93d",
  other: "#ef5a76",
};

export default function PaymentDonut({
  breakdown,
  total,
}: {
  breakdown: PaymentBreakdown[];
  total: number;
}) {
  const withData = breakdown.filter((b) => b.count > 0);

  let acc = 0;
  const stops = withData.map((b) => {
    const from = acc;
    acc += b.pct;
    return `${COLORS[b.method]} ${from}% ${acc}%`;
  });

  const gradient =
    stops.length > 0 ? `conic-gradient(${stops.join(", ")})` : "var(--bg-elevated)";

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 14,
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10 }}>
        Vendas por Pagamento
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1 }}>
        <div
          style={{
            position: "relative",
            width: 88,
            height: 88,
            flexShrink: 0,
            borderRadius: "50%",
            background: gradient,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 14,
              borderRadius: "50%",
              background: "var(--bg-card)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 9, color: "var(--text-muted)" }}>Total</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{total}</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {(Object.keys(LABELS) as PaymentBreakdown["method"][]).map((method) => {
            const entry = breakdown.find((b) => b.method === method);
            const pct = entry?.pct ?? 0;
            return (
              <div key={method} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: COLORS[method],
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {LABELS[method]}
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, marginLeft: "auto" }}>
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
