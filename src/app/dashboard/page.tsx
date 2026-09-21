"use client";

import { useEffect, useState, useCallback } from "react";
import ProductSidebar from "@/components/dashboard/ProductSidebar";
import FiltersBar from "@/components/dashboard/FiltersBar";
import FunnelChart from "@/components/dashboard/FunnelChart";
import AdSpendCard from "@/components/dashboard/AdSpendCard";
import SummaryCards from "@/components/dashboard/SummaryCards";
import InstallSnippet from "@/components/dashboard/InstallSnippet";
import type { Product, PeriodKey, FunnelResponse, SummaryResponse } from "@/lib/types";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [campaign, setCampaign] = useState("");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [platform, setPlatform] = useState("");
  const [adAccounts, setAdAccounts] = useState<string[]>([]);
  const [adAccount, setAdAccount] = useState("");
  const [funnel, setFunnel] = useState<FunnelResponse | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products || []);
        if (data.products?.length) setSelectedId(data.products[0].id);
      })
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const params = new URLSearchParams({ productId: selectedId, period });
    if (period === "custom") {
      params.set("from", from);
      params.set("to", to);
    }
    fetch(`/api/filters?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setCampaigns(data.campaigns || []);
        setPlatforms(data.platforms || []);
        setAdAccounts(data.adAccounts || []);
      });
  }, [selectedId, period, from, to]);

  const commonParams = useCallback(() => {
    if (!selectedId) return null;
    const params = new URLSearchParams({ productId: selectedId, period });
    if (period === "custom") {
      params.set("from", from);
      params.set("to", to);
    }
    if (campaign) params.set("campaign", campaign);
    if (platform) params.set("platform", platform);
    if (adAccount) params.set("adAccount", adAccount);
    return params;
  }, [selectedId, period, from, to, campaign, platform, adAccount]);

  const loadFunnel = useCallback(() => {
    const params = commonParams();
    if (!params) return;
    fetch(`/api/funnel?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setFunnel(data));
  }, [commonParams]);

  const loadSummary = useCallback(() => {
    const params = commonParams();
    if (!params) return;
    fetch(`/api/summary?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => setSummary(data));
  }, [commonParams]);

  useEffect(() => {
    loadFunnel();
    loadSummary();
  }, [loadFunnel, loadSummary]);

  const selectedProduct = products.find((p) => p.id === selectedId) || null;

  return (
    <div style={{ display: "flex", gap: 20, maxWidth: 1200, margin: "0 auto" }}>
      <ProductSidebar
        products={products}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreated={(p) => {
          setProducts((prev) => [p, ...prev]);
          setSelectedId(p.id);
        }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {loadingProducts ? (
          <div style={{ color: "var(--text-muted)" }}>Carregando...</div>
        ) : !selectedProduct ? (
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
            Crie seu primeiro produto na barra lateral para começar a rastrear vendas.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <h1 style={{ fontSize: 22, margin: 0 }}>{selectedProduct.name}</h1>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {selectedProduct.slug}
              </span>
            </div>

            <FiltersBar
              period={period}
              onPeriodChange={setPeriod}
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
              campaigns={campaigns}
              campaign={campaign}
              onCampaignChange={setCampaign}
              platforms={platforms}
              platform={platform}
              onPlatformChange={setPlatform}
              adAccounts={adAccounts}
              adAccount={adAccount}
              onAdAccountChange={setAdAccount}
            />

            <AdSpendCard
              productId={selectedProduct.id}
              period={period}
              from={from}
              to={to}
              campaign={campaign}
              onSaved={() => {
                loadFunnel();
                loadSummary();
              }}
            />

            <SectionLabel>Resumo</SectionLabel>
            {summary ? (
              <div style={{ marginBottom: 20 }}>
                <SummaryCards summary={summary} />
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", marginBottom: 20 }}>Carregando...</div>
            )}

            <SectionLabel>Funil de Conversão</SectionLabel>
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px 16px 8px",
                marginBottom: 20,
                overflow: "hidden",
              }}
            >
              {funnel ? (
                <FunnelChart stages={funnel.stages} />
              ) : (
                <div style={{ color: "var(--text-muted)" }}>Carregando funil...</div>
              )}
            </div>

            <InstallSnippet slug={selectedProduct.slug} />
          </>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "var(--text-muted)",
        marginBottom: 8,
        letterSpacing: 0.4,
      }}
    >
      {String(children).toUpperCase()}
    </div>
  );
}
