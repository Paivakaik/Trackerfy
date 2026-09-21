import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  fetchMetaUser,
} from "@/lib/meta";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("state");
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_message") || searchParams.get("error");

  const dashboardUrl = (params: Record<string, string>) => {
    const url = new URL("/dashboard", req.url);
    url.searchParams.set("productId", productId || "");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return url;
  };

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (oauthError) {
    return NextResponse.redirect(dashboardUrl({ metaError: oauthError }));
  }

  if (!code || !productId) {
    return NextResponse.redirect(
      dashboardUrl({ metaError: "Resposta inválida da Meta (sem code/state)" })
    );
  }

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new Error("Produto não encontrado");

    const shortLivedToken = await exchangeCodeForToken(code);
    const { accessToken, expiresInSeconds } = await exchangeForLongLivedToken(
      shortLivedToken
    );
    const metaUser = await fetchMetaUser(accessToken);

    const tokenExpiresAt = expiresInSeconds
      ? new Date(Date.now() + expiresInSeconds * 1000)
      : null;

    await prisma.adConnection.upsert({
      where: { productId_platform: { productId, platform: "meta" } },
      update: {
        accessToken,
        tokenExpiresAt,
        metaUserId: metaUser.id,
        adAccountId: null,
        adAccountName: null,
        lastSyncError: null,
      },
      create: {
        productId,
        platform: "meta",
        accessToken,
        tokenExpiresAt,
        metaUserId: metaUser.id,
      },
    });

    return NextResponse.redirect(dashboardUrl({ metaConnected: "1" }));
  } catch (err: any) {
    return NextResponse.redirect(dashboardUrl({ metaError: err.message || "Erro ao conectar" }));
  }
}
