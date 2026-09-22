const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ${name} não configurada`);
  return value;
}

export function getMetaRedirectUri(): string {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/api/meta/callback`;
}

// Usa o fluxo "Login do Facebook para Empresas": as permissões (ads_read)
// ficam definidas na configuração (config_id) criada no painel da Meta, em
// vez de virem via parâmetro "scope" (fluxo clássico, que exige o produto
// "Facebook Login" tradicional — apps novos só ganham a variante "para
// Empresas").
export function buildMetaAuthUrl(state: string): string {
  const appId = requireEnv("META_APP_ID");
  const configId = requireEnv("META_CONFIG_ID");
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: getMetaRedirectUri(),
    state,
    response_type: "code",
    config_id: configId,
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
}

async function graphFetch(path: string, params: Record<string, string>) {
  const url = `${GRAPH_BASE}${path}?${new URLSearchParams(params).toString()}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok || data.error) {
    const msg = data?.error?.message || `Erro na Graph API (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const data = await graphFetch("/oauth/access_token", {
    client_id: requireEnv("META_APP_ID"),
    client_secret: requireEnv("META_APP_SECRET"),
    redirect_uri: getMetaRedirectUri(),
    code,
  });
  return data.access_token as string;
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<{ accessToken: string; expiresInSeconds: number | null }> {
  const data = await graphFetch("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: requireEnv("META_APP_ID"),
    client_secret: requireEnv("META_APP_SECRET"),
    fb_exchange_token: shortLivedToken,
  });
  return {
    accessToken: data.access_token as string,
    expiresInSeconds: typeof data.expires_in === "number" ? data.expires_in : null,
  };
}

export async function fetchMetaUser(accessToken: string): Promise<{ id: string; name: string }> {
  const data = await graphFetch("/me", { access_token: accessToken, fields: "id,name" });
  return { id: data.id, name: data.name };
}

export type MetaAdAccount = { id: string; accountId: string; name: string };

export async function fetchAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const data = await graphFetch("/me/adaccounts", {
    access_token: accessToken,
    fields: "id,account_id,name",
    limit: "200",
  });
  return (data.data || []).map((a: any) => ({
    id: a.id,
    accountId: a.account_id,
    name: a.name || a.account_id,
  }));
}

export type DailyCampaignSpend = {
  date: string; // YYYY-MM-DD
  campaign: string;
  amount: number;
  impressions: number;
  linkClicks: number;
  videoHook: number;
  videoHold: number;
};

// Alguns campos de vídeo/ação da Insights API voltam como número simples e
// outros como array de { action_type, value } (um por tipo de ação) — soma
// os valores desse array, ou usa direto se já vier como número.
function sumActionField(raw: any): number {
  if (raw == null) return 0;
  if (typeof raw === "number" || typeof raw === "string") return Number(raw) || 0;
  if (Array.isArray(raw)) {
    return raw.reduce((sum, entry) => sum + (Number(entry?.value) || 0), 0);
  }
  return 0;
}

// Busca gasto + impressões/cliques/vídeo por campanha, por dia, num
// intervalo. adAccountId já deve vir no formato "act_123..." (é o que a
// Graph API retorna em /me/adaccounts). video_p25_watched_actions (chegou
// no primeiro quarto do vídeo) e video_p100_watched_actions (assistiu até o
// fim) alimentam Hook rate / Hold rate — o campo antigo de "3 segundos" foi
// descontinuado pela Meta.
export async function fetchDailyCampaignSpend(
  accessToken: string,
  adAccountId: string,
  sinceISODate: string,
  untilISODate: string
): Promise<DailyCampaignSpend[]> {
  const data = await graphFetch(`/${adAccountId}/insights`, {
    access_token: accessToken,
    level: "campaign",
    fields:
      "campaign_name,spend,impressions,inline_link_clicks,video_p25_watched_actions,video_p100_watched_actions",
    time_increment: "1",
    time_range: JSON.stringify({ since: sinceISODate, until: untilISODate }),
    limit: "500",
  });

  return (data.data || []).map((row: any) => ({
    date: row.date_start,
    campaign: row.campaign_name,
    amount: Number(row.spend) || 0,
    impressions: Number(row.impressions) || 0,
    linkClicks: Number(row.inline_link_clicks) || 0,
    videoHook: sumActionField(row.video_p25_watched_actions),
    videoHold: sumActionField(row.video_p100_watched_actions),
  }));
}

export type CampaignStatusInfo = { campaign: string; status: string };

// Status atual (ACTIVE/PAUSED/...) de cada campanha da conta — pro filtro
// "só ativas" na aba de Campanhas. É estado agora, não histórico.
export async function fetchCampaignStatuses(
  accessToken: string,
  adAccountId: string
): Promise<CampaignStatusInfo[]> {
  const data = await graphFetch(`/${adAccountId}/campaigns`, {
    access_token: accessToken,
    fields: "name,status",
    limit: "500",
  });

  return (data.data || []).map((row: any) => ({
    campaign: row.name,
    status: row.status,
  }));
}
