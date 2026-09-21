import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/requireSession";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const body = await req.json();
  const { productId } = body;
  if (!productId) {
    return NextResponse.json({ error: "productId é obrigatório" }, { status: 400 });
  }

  await prisma.adConnection
    .delete({ where: { productId_platform: { productId, platform: "meta" } } })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
