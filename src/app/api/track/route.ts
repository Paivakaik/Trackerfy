import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const EVENT_MAP: Record<string, string> = {
  click: "CLICK",
  page_view: "PAGE_VIEW",
  initiate_checkout: "INITIATE_CHECKOUT",
  purchase: "PURCHASE",
};

const SALE_STATUSES = new Set(["paid", "pending", "refunded", "chargeback"]);
const PAYMENT_METHODS = new Set(["pix", "card", "boleto", "other"]);

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { product, event, session_id: sessionId } = body;

    if (!product || typeof product !== "string") {
      return NextResponse.json(
        { error: "campo 'product' é obrigatório" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!event || !EVENT_MAP[event]) {
      return NextResponse.json(
        { error: "campo 'event' inválido" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "campo 'session_id' é obrigatório" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const slug = product.trim().toLowerCase().slice(0, 100);

    const productRecord = await prisma.product.upsert({
      where: { slug },
      update: {},
      create: { slug, name: slug },
    });

    let value: number | null = null;
    let taxAmount: number | null = null;
    let saleStatus: string | null = null;
    let paymentMethod: string | null = null;

    if (event === "purchase") {
      const parsed = Number(body.value);
      value = Number.isFinite(parsed) ? parsed : null;

      const parsedTax = Number(body.tax);
      taxAmount = Number.isFinite(parsedTax) ? parsedTax : null;

      const statusInput =
        typeof body.status === "string" ? body.status.toLowerCase() : null;
      saleStatus = statusInput && SALE_STATUSES.has(statusInput) ? statusInput : "paid";

      const methodInput =
        typeof body.payment_method === "string" ? body.payment_method.toLowerCase() : null;
      paymentMethod =
        methodInput && PAYMENT_METHODS.has(methodInput) ? methodInput : "other";
    }

    await prisma.event.create({
      data: {
        productId: productRecord.id,
        type: EVENT_MAP[event],
        sessionId: sessionId.slice(0, 100),
        value,
        // Sem gateway/marketplace no meio (venda lançada direto pelo script),
        // o valor recebido é o valor cheio.
        netValue: value,
        taxAmount,
        saleStatus,
        paymentMethod,
        url: typeof body.url === "string" ? body.url.slice(0, 2000) : null,
        referrer:
          typeof body.referrer === "string" ? body.referrer.slice(0, 2000) : null,
        utmSource: normalizeUtm(body.utm_source),
        utmMedium: normalizeUtm(body.utm_medium),
        utmCampaign: normalizeUtm(body.utm_campaign),
        utmContent: normalizeUtm(body.utm_content),
        adAccount: normalizeUtm(body.ad_account),
      },
    });

    return NextResponse.json({ ok: true }, { status: 201, headers: CORS_HEADERS });
  } catch (err) {
    console.error("Erro em /api/track", err);
    return NextResponse.json(
      { error: "erro interno" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

function normalizeUtm(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 200);
}
