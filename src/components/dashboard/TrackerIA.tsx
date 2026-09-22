"use client";

import { useMemo } from "react";
import type { FunnelResponse, SummaryResponse } from "@/lib/types";
import { analyzeFunnel } from "@/lib/trackerIA";

const SEVERITY_COLOR: Record<string, string> = {
  ok: "var(--good, #2fbf71)",
  warn: "var(--warn, #e0a72f)",
  bad: "var(--danger, #e0227f)",
};

export default function TrackerIA({
  funnel,
  summary,
}: {
  funnel: FunnelResponse | null;
  summary: SummaryResponse | null;
}) {
  const insight = useMemo(() => (funnel ? analyzeFunnel(funnel, summary) : null), [funnel, summary]);

  if (!insight) return null;

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        display: "flex",
        gap: 12,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: 9,
          background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
        }}
      >
        🤖
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Tracker IA</span>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: SEVERITY_COLOR[insight.severity],
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{insight.headline}</span>
        </div>
        <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
          {insight.detail}
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
          💡 {insight.suggestion}
        </p>
      </div>
    </div>
  );
}
