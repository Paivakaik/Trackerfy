import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/requireSession";
import { buildMetaAuthUrl } from "@/lib/meta";

export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId é obrigatório" }, { status: 400 });
  }

  const dashboardError = (message: string) => {
    const url = new URL("/dashboard", req.url);
    url.searchParams.set("productId", productId);
    url.searchParams.set("metaError", message);
    return NextResponse.redirect(url);
  };

  if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
    return dashboardError(
      "META_APP_ID / META_APP_SECRET não configurados no servidor. Veja o README (Conectar Meta Ads) para o passo a passo."
    );
  }

  try {
    const url = buildMetaAuthUrl(productId);
    return NextResponse.redirect(url);
  } catch (err: any) {
    return dashboardError(err.message);
  }
}
