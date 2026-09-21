import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/requireSession";
import { prisma } from "@/lib/prisma";
import { syncMetaAdConnection } from "@/lib/metaSync";

export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const body = await req.json();
  const { productId } = body;
  if (!productId) {
    return NextResponse.json({ error: "productId é obrigatório" }, { status: 400 });
  }

  const connection = await prisma.adConnection.findUnique({
    where: { productId_platform: { productId, platform: "meta" } },
  });

  if (!connection) {
    return NextResponse.json({ error: "Nenhuma conexão encontrada" }, { status: 404 });
  }

  try {
    const result = await syncMetaAdConnection(connection);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    await prisma.adConnection.update({
      where: { id: connection.id },
      data: { lastSyncError: err.message },
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
