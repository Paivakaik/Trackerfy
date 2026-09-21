import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncMetaAdConnection } from "@/lib/metaSync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "não autorizado" }, { status: 401 });
    }
  }

  const connections = await prisma.adConnection.findMany({
    where: { platform: "meta", adAccountId: { not: null } },
  });

  const results = [];
  for (const connection of connections) {
    try {
      const result = await syncMetaAdConnection(connection);
      results.push({ productId: connection.productId, ok: true, ...result });
    } catch (err: any) {
      await prisma.adConnection.update({
        where: { id: connection.id },
        data: { lastSyncError: err.message },
      });
      results.push({ productId: connection.productId, ok: false, error: err.message });
    }
  }

  return NextResponse.json({ synced: results.length, results });
}
