import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/requireSession";
import { prisma } from "@/lib/prisma";
import { exchangeForLongLivedToken, fetchMetaUser } from "@/lib/meta";

// Caminho alternativo ao OAuth: cola um token de acesso gerado na ferramenta
// "Obter token de acesso" do próprio painel da Meta (Casos de uso >
// Personalizar > Ferramentas). Útil quando o fluxo de redirecionamento OAuth
// está bloqueado por configuração do app (ex: domínio) e conectar a própria
// conta não exige o vaivém completo do navegador.
export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const body = await req.json();
  const { productId, token } = body;

  if (!productId || !token) {
    return NextResponse.json(
      { error: "productId e token são obrigatórios" },
      { status: 400 }
    );
  }

  try {
    let accessToken = token.trim();
    let tokenExpiresAt: Date | null = null;

    try {
      const longLived = await exchangeForLongLivedToken(accessToken);
      accessToken = longLived.accessToken;
      tokenExpiresAt = longLived.expiresInSeconds
        ? new Date(Date.now() + longLived.expiresInSeconds * 1000)
        : null;
    } catch {
      // Se não for possível trocar por um token de vida longa (ex: já é um
      // token de sistema sem expiração), seguimos com o token original.
    }

    const metaUser = await fetchMetaUser(accessToken);

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

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Token inválido" }, { status: 400 });
  }
}
