"use client";

import type { FunnelStage } from "@/lib/types";

const WIDTH = 800;
const HEIGHT = 108;
const TOP_LABEL_AREA = 26;
const BOTTOM_COUNT_AREA = 26;
const MIN_PCT = 4; // piso visual: uma etapa em 0% ainda aparece como um fio fino

export default function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const n = stages.length;
  if (n === 0) return null;

  const segW = WIDTH / n;
  const centerY = TOP_LABEL_AREA + HEIGHT / 2;
  const heightAt = (i: number) => (Math.max(stages[i].pct, MIN_PCT) / 100) * (HEIGHT - 16);

  let topPath = `M 0 ${(centerY - heightAt(0) / 2).toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const rightH = i + 1 < n ? heightAt(i + 1) : heightAt(i);
    const x1 = (i + 1) * segW;
    const midX = i * segW + segW / 2;
    const topStartY = centerY - heightAt(i) / 2;
    const topEndY = centerY - rightH / 2;
    topPath += ` C ${midX.toFixed(2)} ${topStartY.toFixed(2)}, ${midX.toFixed(2)} ${topEndY.toFixed(2)}, ${x1.toFixed(2)} ${topEndY.toFixed(2)}`;
  }

  let bottomPath = "";
  for (let i = n - 1; i >= 0; i--) {
    const leftH = heightAt(i);
    const rightH = i + 1 < n ? heightAt(i + 1) : heightAt(i);
    const x0 = i * segW;
    const x1 = (i + 1) * segW;
    const midX = x0 + segW / 2;
    const bottomStartY = centerY + rightH / 2;
    const bottomEndY = centerY + leftH / 2;
    if (i === n - 1) {
      bottomPath += ` L ${x1.toFixed(2)} ${bottomStartY.toFixed(2)}`;
    }
    bottomPath += ` C ${midX.toFixed(2)} ${bottomStartY.toFixed(2)}, ${midX.toFixed(2)} ${bottomEndY.toFixed(2)}, ${x0.toFixed(2)} ${bottomEndY.toFixed(2)}`;
  }

  const fullPath = `${topPath} ${bottomPath} Z`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${TOP_LABEL_AREA + HEIGHT + BOTTOM_COUNT_AREA}`}
      width="100%"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id="funnelFill" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2f6bff" />
          <stop offset="50%" stopColor="#8b3ce0" />
          <stop offset="100%" stopColor="#e0227f" />
        </linearGradient>
      </defs>

      <path d={fullPath} fill="url(#funnelFill)" fillOpacity={0.9} />

      {Array.from({ length: n - 1 }).map((_, i) => (
        <line
          key={i}
          x1={(i + 1) * segW}
          y1={TOP_LABEL_AREA + 4}
          x2={(i + 1) * segW}
          y2={TOP_LABEL_AREA + HEIGHT - 4}
          stroke="rgba(11,15,23,0.35)"
          strokeWidth={1}
        />
      ))}

      {stages.map((s, i) => (
        <text
          key={s.key}
          x={i * segW + segW / 2}
          y={centerY + 5}
          textAnchor="middle"
          fontSize={16}
          fontWeight={600}
          fill="#ffffff"
        >
          {s.pct.toFixed(1)}%
        </text>
      ))}

      {stages.map((s, i) => (
        <g key={s.key + "-label"}>
          <text
            x={i * segW + segW / 2}
            y={16}
            textAnchor="middle"
            fontSize={12}
            fill="var(--text)"
            fontWeight={700}
          >
            {s.label}
          </text>
          <text
            x={i * segW + segW / 2}
            y={TOP_LABEL_AREA + HEIGHT + 18}
            textAnchor="middle"
            fontSize={12}
            fill="var(--text-muted)"
          >
            {s.count.toLocaleString("pt-BR")}
          </text>
        </g>
      ))}
    </svg>
  );
}
