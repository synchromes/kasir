import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ownerId = Number(session.user.id);

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const takeRaw = Number(req.nextUrl.searchParams.get("take") ?? 20);
  // Parameter tidak valid (NaN/negatif/0) → default 20; batas atas 50.
  const take = Math.min(Math.max(Number.isFinite(takeRaw) ? Math.floor(takeRaw) : 20, 1), 50);

  const products = await prisma.product.findMany({
    where: {
      ownerId,
      active: true,
      OR: [
        { name: { contains: q } },
        { sku: { contains: q } },
        { barcode: { contains: q } },
      ],
    },
    include: { unit: true, category: true },
    orderBy: { name: "asc" },
    take,
  });

  return NextResponse.json(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.sellPrice,
      stock: p.stock,
      unit: p.unit?.short ?? "",
      category: p.category?.name ?? "",
    }))
  );
}