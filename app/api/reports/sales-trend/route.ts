import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = Number(session.user.id);

  // Satu query GROUP BY per hari (bukan 30 aggregate berurutan) untuk 30 hari
  // terakhir. DATE_FORMAT memakai zona waktu sesi DB (= zona lokal mesin).
  const days = 30;
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.$queryRaw<{ day: string; total: number }[]>`
    SELECT DATE_FORMAT(createdAt, '%Y-%m-%d') AS day,
           CAST(SUM(total) AS SIGNED) AS total
    FROM Sale
    WHERE ownerId = ${ownerId} AND createdAt >= ${since}
    GROUP BY day
  `;
  const byDay = new Map(rows.map((r) => [r.day, r.total]));

  const out: { label: string; total: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const ymd =
      d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    out.push({
      label: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }),
      total: byDay.get(ymd) ?? 0,
    });
  }

  return NextResponse.json(out);
}
