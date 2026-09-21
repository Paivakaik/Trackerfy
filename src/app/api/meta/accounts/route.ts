import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/requireSession";
import { prisma } from "@/lib/prisma";
import { fetchAdAccounts } from "@/lib/meta";

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
  });

  if (!connection) {
    return NextResponse.json({ error: "Nenhuma conexão com a Meta encontrada" }, { status: 404 });
  }

  try {
    const accounts = await fetchAdAccounts(connection.accessToken);
    return NextResponse.json({ accounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
