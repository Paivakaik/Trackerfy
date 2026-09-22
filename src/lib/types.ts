export type Product = {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
};

export type PeriodKey = "today" | "yesterday" | "7d" | "30d" | "custom";

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  pct: number;
};

export type FunnelResponse = {
  stages: FunnelStage[];
  revenue: number;
  spend: number;
  costPerSale: number | null;
  range: { start: string; end: string };
};

export type PaymentBreakdown = {
  method: "pix" | "card" | "boleto" | "other";
  count: number;
  pct: number;
};

export type CampaignRow = {
  name: string;
  spend: number;
  clicks: number;
  pageViews: number;
  ics: number;
  salesInit: number;
  salesApproved: number;
  revenue: number;
  roas: number | null;
  cpa: number | null;
  convRate: number;
};

export type SummaryResponse = {
  netRevenue: number;
  grossRevenue: number;
  spend: number;
  roas: number | null;
  profit: number;
  roi: number | null;
  profitMargin: number | null;
  pendingRevenue: number;
  refundedRevenue: number;
  refundRate: number;
  chargebackRate: number;
  arpu: number;
  tax: number;
  paidCount: number;
  totalSalesCount: number;
  paymentBreakdown: PaymentBreakdown[];
};
