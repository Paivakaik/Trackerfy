"use client";

import type { SummaryResponse } from "@/lib/types";
import PaymentDonut from "./PaymentDonut";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPct(v: number | null) {
  if (v === null) return "—";
  return `${v.toFixed(1)}%`;
}

export default function SummaryCards({ summary }: { summary: SummaryResponse }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
          gap: 10,
        }}
      >
        <Card label="Faturamento Bruto" value={formatBRL(summary.grossRevenue)} />
        <Card label="Valor Real (sua comissão)" value={formatBRL(summary.netRevenue)} />
        <Card label="Gastos com anúncios" value={formatBRL(summary.spend)} />
        <Card
          label="ROAS"
          value={summary.roas !== null ? `${summary.roas.toFixed(2)}x` : "—"}
          tone={summary.roas !== null ? (summary.roas >= 1 ? "good" : "bad") : undefined}
        />
        <Card
          label="Lucro"
          value={formatBRL(summary.profit)}
          tone={summary.profit >= 0 ? "good" : "bad"}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 1fr 1fr 1fr",
          gridTemplateRows: "auto auto",
          gap: 10,
        }}
      >
        <div style={{ gridRow: "1 / span 2" }}>
          <PaymentDonut breakdown={summary.paymentBreakdown} total={summary.paidCount} />
        </div>

        <Card label="Vendas Pendentes" value={formatBRL(summary.pendingRevenue)} />
        <Card
          label="ROI"
          value={formatPct(summary.roi)}
          tone={summary.roi !== null ? (summary.roi >= 0 ? "good" : "bad") : undefined}
        />
        <Card
          label="Margem de Lucro"
          value={formatPct(summary.profitMargin)}
          tone={summary.profitMargin !== null ? (summary.profitMargin >= 0 ? "good" : "bad") : undefined}
        />

        <Card label="Vendas Reembolsadas" value={formatBRL(summary.refundedRevenue)} />
        <Card label="Reembolso" value={formatPct(summary.refundRate)} />
        <Card label="ARPU" value={formatBRL(summary.arpu)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Card label="Imposto" value={formatBRL(summary.tax)} />
        <Card label="Chargeback" value={formatPct(summary.chargebackRate)} />
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "12px 14px",
        minHeight: 68,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{label}</div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          marginTop: 4,
          color:
            tone === "good" ? "var(--accent-2)" : tone === "bad" ? "var(--danger)" : "var(--text)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
