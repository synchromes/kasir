import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = Number(session.user.id);

  const days = 30;
  const out: { label: string; total: number }[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const agg = await prisma.sale.aggregate({
      where: { ownerId, createdAt: { gte: start, lt: end } },
      _sum: { total: true },
    });
    out.push({
      label: start.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      total: agg._sum.total ?? 0,
    });
  }

  return NextResponse.json(out);
}