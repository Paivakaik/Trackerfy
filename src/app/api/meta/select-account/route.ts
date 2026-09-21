import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/requireSession";
import { prisma } from "@/lib/prisma";
import { syncMetaAdConnection } from "@/lib/metaSync";

export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const body = await req.json();
  const { productId, adAccountId, adAccountName } = body;

  if (!productId || !adAccountId) {
    return NextResponse.json(
      { error: "productId e adAccountId são obrigatórios" },
      { status: 400 }
    );
  }

  const connection = await prisma.adConnection.update({
    where: { productId_platform: { productId, platform: "meta" } },
    data: { adAccountId, adAccountName: adAccountName ?? adAccountId },
  });

  try {
    await syncMetaAdConnection(connection);
  } catch (err: any) {
    await prisma.adConnection.update({
      where: { id: connection.id },
      data: { lastSyncError: err.message },
    });
    return NextResponse.json(
      { ok: true, warning: `Conta salva, mas a primeira sincronização falhou: ${err.message}` },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true });
}
