import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/requireSession";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId é obrigatório" }, { status: 400 });
  }

  const connection = await prisma.adConnection.findUnique({
    where: { productId_platform: { productId, platform: "meta" } },
    select: {
      adAccountId: true,
      adAccountName: true,
      lastSyncedAt: true,
      lastSyncError: true,
      tokenExpiresAt: true,
    },
  });

  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  const tokenExpired = connection.tokenExpiresAt
    ? connection.tokenExpiresAt.getTime() < Date.now()
    : false;

  return NextResponse.json({ connected: true, ...connection, tokenExpired });
}
