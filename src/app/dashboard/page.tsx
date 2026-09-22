"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ProductSidebar from "@/components/dashboard/ProductSidebar";
import FiltersBar from "@/components/dashboard/FiltersBar";
import FunnelChart from "@/components/dashboard/FunnelChart";
import AdSpendCard from "@/components/dashboard/AdSpendCard";
import SummaryCards from "@/components/dashboard/SummaryCards";
import MetaConnect from "@/components/dashboard/MetaConnect";
import InstallSnippet from "@/components/dashboard/InstallSnippet";
import TrackerIA from "@/components/dashboard/TrackerIA";
import CampaignsTable from "@/components/dashboard/CampaignsTable";
import type { Product, PeriodKey, FunnelResponse, SummaryResponse, CampaignRow } from "@/lib/types";

function todayISO() {
  // Data de hoje no fuso de São Paulo (não UTC), pra bater com o período que
  // o servidor calcula pro filtro "Personalizado".
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ color: "var(--text-muted)" }}>Carregando...</div>}>
      <DashboardInner />
    </Suspense>
  );
}

function DashboardInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

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
  const [view, setView] = useState<"dashboard" | "campaigns" | "settings">("dashboard");
  const [campaignRows, setCampaignRows] = useState<CampaignRow[] | null>(null);
  // Contadores pra ignorar respostas de fetch antigas que chegam depois de
  // uma mais nova (ex: trocar de produto/período rápido) — sem isso, uma
  // requisição lenta podia sobrescrever os dados certos com os de um filtro
  // anterior, fazendo alguma métrica "sumir" às vezes.
  const funnelReq = useRef(0);
  const summaryReq = useRef(0);
  const campaignsReq = useRef(0);

  const returnedProductId = searchParams.get("productId");
  const metaConnected = searchParams.get("metaConnected") === "1";
  const metaError = searchParams.get("metaError");

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        const list: Product[] = data.products || [];
        setProducts(list);
        if (returnedProductId && list.some((p) => p.id === returnedProductId)) {
          setSelectedId(returnedProductId);
        } else if (list.length) {
          setSelectedId(list[0].id);
        }
      })
      .finally(() => setLoadingProducts(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Limpa os parâmetros de retorno do OAuth da URL depois de consumi-los, pra
  // não reprocessar se a pessoa der refresh na página. Só roda depois que os
  // produtos carregarem (loadingProducts=false), pra garantir que o
  // MetaConnect já montou e leu metaConnected/metaError antes deles sumirem
  // da URL — senão a mensagem de erro nunca chega a aparecer.
  useEffect(() => {
    if (!loadingProducts && (metaConnected || metaError)) {
      const url = new URL(window.location.href);
      url.searchParams.delete("metaConnected");
      url.searchParams.delete("metaError");
      router.replace(url.pathname + url.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProducts]);

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
    const reqId = ++funnelReq.current;
    fetch(`/api/funnel?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (reqId === funnelReq.current) setFunnel(data);
      });
  }, [commonParams]);

  const loadSummary = useCallback(() => {
    const params = commonParams();
    if (!params) return;
    const reqId = ++summaryReq.current;
    fetch(`/api/summary?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (reqId === summaryReq.current) setSummary(data);
      });
  }, [commonParams]);

  const loadCampaigns = useCallback(() => {
    if (!selectedId) return;
    const params = new URLSearchParams({ productId: selectedId, period });
    if (period === "custom") {
      params.set("from", from);
      params.set("to", to);
    }
    const reqId = ++campaignsReq.current;
    fetch(`/api/campaigns?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (reqId === campaignsReq.current) setCampaignRows(data.campaigns ?? []);
      });
  }, [selectedId, period, from, to]);

  useEffect(() => {
    loadFunnel();
    loadSummary();
  }, [loadFunnel, loadSummary]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const selectedProduct = products.find((p) => p.id === selectedId) || null;

  return (
    <div style={{ display: "flex", gap: 20, maxWidth: 1600, margin: "0 auto" }}>
      <ProductSidebar
        products={products}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onCreated={(p) => {
          setProducts((prev) => [p, ...prev]);
          setSelectedId(p.id);
        }}
        onDeleted={(id) => {
          setProducts((prev) => {
            const next = prev.filter((p) => p.id !== id);
            if (selectedId === id) setSelectedId(next[0]?.id ?? null);
            return next;
          });
        }}
        view={view}
        onViewChange={setView}
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

            {view === "dashboard" ? (
              <>
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

                <SectionLabel>Resumo</SectionLabel>
                {summary ? (
                  <div style={{ marginBottom: 20 }}>
                    <SummaryCards summary={summary} />
                  </div>
                ) : (
                  <div style={{ color: "var(--text-muted)", marginBottom: 20 }}>Carregando...</div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      letterSpacing: 0.4,
                    }}
                  >
                    FUNIL DE CONVERSÃO
                  </span>
                  <span
                    title="Cliques/Vis. Página/ICs vêm do script instalado no seu site. Vendas Inic./Apr. vêm das vendas registradas (manual, Lastlink etc)."
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: "1px solid var(--text-muted)",
                      color: "var(--text-muted)",
                      fontSize: 10,
                      cursor: "default",
                    }}
                  >
                    i
                  </span>
                </div>
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

                <TrackerIA funnel={funnel} summary={summary} />
              </>
            ) : view === "campaigns" ? (
              <>
                <FiltersBar
                  period={period}
                  onPeriodChange={setPeriod}
                  from={from}
                  to={to}
                  onFromChange={setFrom}
                  onToChange={setTo}
                  campaigns={[]}
                  campaign=""
                  onCampaignChange={() => {}}
                  platforms={[]}
                  platform=""
                  onPlatformChange={() => {}}
                  adAccounts={[]}
                  adAccount=""
                  onAdAccountChange={() => {}}
                  periodOnly
                />
                <CampaignsTable campaigns={campaignRows} />
              </>
            ) : (
              <>
                <SectionLabel>Integração com anúncios</SectionLabel>
                <MetaConnect
                  productId={selectedProduct.id}
                  justConnected={metaConnected}
                  connectError={metaError}
                  onSynced={() => {
                    loadFunnel();
                    loadSummary();
                  }}
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

                <div style={{ marginTop: 20 }}>
                  <SectionLabel>Instalar script de rastreamento</SectionLabel>
                  <InstallSnippet slug={selectedProduct.slug} />
                </div>
              </>
            )}
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
