import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Recebe eventos de venda do Lastlink (checkout externo) e registra como
// evento PURCHASE no produto indicado. Necessário porque o checkout do
// Lastlink roda no domínio deles, então o track.js nunca vê a venda
// acontecer — isso preenche o "Vendas" do funil e os cards de faturamento.
//
// URL configurada no Lastlink (Integrações > Lastlink - Webhook):
//   https://SEU-DOMINIO/api/webhooks/lastlink?token=SEU_TOKEN&product=slug-do-produto
//
// Cada compra (identificada pelo PaymentId) vira UMA linha de Event que é
// atualizada conforme o status muda (pendente -> pago -> reembolsado /
// chargeback), em vez de uma linha nova por evento — assim o faturamento e
// o funil não contam a mesma venda duas vezes.

const PAYMENT_METHOD_MAP: Record<string, string> = {
  credit_card: "card",
  pix: "pix",
  bankslip: "boleto",
};

function mapPaymentMethod(method: unknown): string {
  if (typeof method !== "string") return "other";
  return PAYMENT_METHOD_MAP[method.toLowerCase()] || "other";
}

function extractValue(purchase: any): number | null {
  const raw = purchase?.Price?.Value ?? purchase?.OriginalPrice?.Value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const productSlug = searchParams.get("product");

  if (!process.env.LASTLINK_WEBHOOK_TOKEN || token !== process.env.LASTLINK_WEBHOOK_TOKEN) {
    return NextResponse.json({ error: "token inválido" }, { status: 401 });
  }
  if (!productSlug) {
    return NextResponse.json({ error: "parâmetro 'product' é obrigatório" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "payload inválido" }, { status: 400 });
  }

  // Eventos de teste (botão "Testar" no painel do Lastlink) só confirmam que
  // a URL está no ar — não devem virar venda no dashboard.
  if (body?.IsTest) {
    return NextResponse.json({ ok: true, test: true });
  }

  const eventName = body?.Event as string | undefined;
  const purchase = body?.Data?.Purchase;
  const paymentId = purchase?.PaymentId as string | undefined;

  const STATUS_BY_EVENT: Record<string, string> = {
    Purchase_Order_Confirmed: "paid",
    Recurrent_Payment: "paid",
    Purchase_Request_Confirmed: "pending",
    Payment_Refund: "refunded",
    Payment_Chargeback: "chargeback",
  };

  const saleStatus = eventName ? STATUS_BY_EVENT[eventName] : undefined;
  if (!saleStatus || !paymentId) {
    // Evento que não nos interessa (ex: assinatura cancelada) — responde ok
    // para o Lastlink não ficar retentando.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const productRecord = await prisma.product.upsert({
    where: { slug: productSlug },
    update: {},
    create: { slug: productSlug, name: productSlug },
  });

  const sessionKey = `lastlink:${paymentId}`;
  const value = extractValue(purchase);
  const paymentMethod = mapPaymentMethod(purchase?.Payment?.PaymentMethod);
  const utm = body?.Data?.Utm;

  const existing = await prisma.event.findFirst({
    where: { productId: productRecord.id, sessionId: sessionKey, type: "PURCHASE" },
  });

  // Não deixa um refund/chargeback atrasado "reviver" a venda como paga, nem
  // um Purchase_Request_Confirmed pendente sobrescrever uma venda já paga.
  const RANK: Record<string, number> = { pending: 0, paid: 1, refunded: 2, chargeback: 2 };
  if (existing && RANK[saleStatus] < RANK[existing.saleStatus || "pending"]) {
    return NextResponse.json({ ok: true, skipped: "status mais antigo que o atual" });
  }

  if (existing) {
    await prisma.event.update({
      where: { id: existing.id },
      data: {
        saleStatus,
        value: value ?? existing.value,
        paymentMethod: existing.paymentMethod || paymentMethod,
      },
    });
  } else {
    await prisma.event.create({
      data: {
        productId: productRecord.id,
        type: "PURCHASE",
        sessionId: sessionKey,
        value,
        saleStatus,
        paymentMethod,
        utmSource: utm?.UtmSource || null,
        utmMedium: utm?.UtmMedium || null,
        utmCampaign: utm?.UtmCampaign || null,
        utmContent: utm?.UtmContent || null,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
