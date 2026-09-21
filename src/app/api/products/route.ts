import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/requireSession";

export async function GET() {
  const { response } = await requireSession();
  if (response) return response;

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const { response } = await requireSession();
  if (response) return response;

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slugInput = typeof body.slug === "string" ? body.slug.trim() : "";

  if (!name) {
    return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
  }

  const slug = (slugInput || name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 100);

  if (!slug) {
    return NextResponse.json({ error: "slug inválido" }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "já existe um produto com esse slug" },
      { status: 409 }
    );
  }

  const product = await prisma.product.create({ data: { slug, name } });

  return NextResponse.json({ product }, { status: 201 });
}
