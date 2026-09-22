"use client";

import { useEffect, useRef, useState } from "react";
import type { PeriodKey } from "@/lib/types";

export default function AdSpendCard({
  productId,
  period,
  from,
  to,
  campaign,
  onSaved,
}: {
  productId: string;
  period: PeriodKey;
  from: string;
  to: string;
  campaign: string;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("0");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const reqId = useRef(0);

  useEffect(() => {
    setLoading(true);
    const thisReq = ++reqId.current;
    const params = new URLSearchParams({ productId, period, campaign: campaign || "__all__" });
    if (period === "custom") {
      params.set("from", from);
      params.set("to", to);
    }
    fetch(`/api/adspend?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (thisReq === reqId.current) setAmount(String(data.amount ?? 0));
      })
      .finally(() => {
        if (thisReq === reqId.current) setLoading(false);
      });
  }, [productId, period, from, to, campaign]);

  async function handleSave() {
    setSaving(true);
    setSavedMsg(false);
    try {
      const res = await fetch("/api/adspend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          period,
          from,
          to,
          campaign: campaign || "__all__",
          amount: Number(amount),
        }),
      });
      if (res.ok) {
        onSaved();
        setSavedMsg(true);
        setTimeout(() => setSavedMsg(false), 1800);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "8px 10px",
        marginBottom: 12,
      }}
    >
      <span style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
        Gasto com anúncios {campaign ? `(${campaign})` : "(todas as campanhas)"}
      </span>
      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>R$</span>
      <input
        type="number"
        min={0}
        step="0.01"
        value={amount}
        disabled={loading}
        onChange={(e) => setAmount(e.target.value)}
        style={{
          width: 110,
          padding: "5px 8px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          color: "var(--text)",
          fontSize: 13,
          outline: "none",
        }}
      />
      <button
        onClick={handleSave}
        disabled={saving || loading}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          border: "none",
          background: "var(--accent)",
          color: "white",
          fontWeight: 600,
          fontSize: 12,
        }}
      >
        {saving ? "Salvando..." : savedMsg ? "Salvo ✓" : "Salvar"}
      </button>
    </div>
  );
}
