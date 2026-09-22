"use client";

import { useRef } from "react";
import type { PeriodKey } from "@/lib/types";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "yesterday", label: "Ontem" },
  { key: "7d", label: "7 dias" },
  { key: "30d", label: "30 dias" },
  { key: "custom", label: "Personalizado" },
];

export default function FiltersBar({
  period,
  onPeriodChange,
  from,
  to,
  onFromChange,
  onToChange,
  campaigns,
  campaign,
  onCampaignChange,
  platforms,
  platform,
  onPlatformChange,
  adAccounts,
  adAccount,
  onAdAccountChange,
  periodOnly,
}: FiltersBarProps) {
  const fromRef = useRef<HTMLInputElement>(null);

  function handlePeriodClick(key: PeriodKey) {
    onPeriodChange(key);
    if (key === "custom") {
      // Abre o calendário nativo direto, em vez de deixar só um campo de
      // texto parado esperando alguém notar o iconezinho.
      requestAnimationFrame(() => {
        fromRef.current?.showPicker?.();
      });
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        alignItems: "center",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: 3,
        }}
      >
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => handlePeriodClick(p.key)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              background: period === p.key ? "var(--accent)" : "transparent",
              color: period === p.key ? "white" : "var(--text-muted)",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === "custom" && (
        <>
          <input
            ref={fromRef}
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            style={dateInput}
          />
          <span style={{ color: "var(--text-muted)" }}>até</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            style={dateInput}
          />
        </>
      )}

      {!periodOnly && (
        <>
          <select
            value={adAccount}
            onChange={(e) => onAdAccountChange(e.target.value)}
            style={{ ...dateInput, minWidth: 160 }}
          >
            <option value="">Todas as contas</option>
            {adAccounts.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          <select
            value={platform}
            onChange={(e) => onPlatformChange(e.target.value)}
            style={{ ...dateInput, minWidth: 150 }}
          >
            <option value="">Qualquer plataforma</option>
            {platforms.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={campaign}
            onChange={(e) => onCampaignChange(e.target.value)}
            style={{ ...dateInput, minWidth: 180 }}
          >
            <option value="">Todas as campanhas</option>
            {campaigns.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}

interface FiltersBarProps {
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  campaigns: string[];
  campaign: string;
  onCampaignChange: (c: string) => void;
  platforms: string[];
  platform: string;
  onPlatformChange: (p: string) => void;
  adAccounts: string[];
  adAccount: string;
  onAdAccountChange: (a: string) => void;
  periodOnly?: boolean;
}

const dateInput: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-elevated)",
  color: "var(--text)",
  fontSize: 13,
  outline: "none",
};
