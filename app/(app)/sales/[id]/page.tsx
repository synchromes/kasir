import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Button, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);
  const { id } = await params;
  const sale = await prisma.sale.findFirst({
    where: { id: Number(id), ownerId },
    include: { items: { include: { product: true } }, customer: true, cashier: true },
  });
  if (!sale) notFound();
  const setting = await prisma.setting.findUnique({ where: { ownerId } });
  const methodLabel: Record<string, string> = { CASH: "Tunai", QRIS: "QRIS", TRANSFER: "Transfer" };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" asChild><Link href="/sales"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold">{sale.invoiceNo}</h1>
          <p className="text-sm text-muted-foreground">{formatDate(sale.createdAt)} · {methodLabel[sale.paymentMethod]}</p>
        </div>
        <PrintButton />
      </div>

      <div className="print-area rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-4 text-center">
          <div className="font-display text-lg font-bold">{setting?.storeName}</div>
          <div className="text-xs text-muted-foreground">{setting?.address} · Telp: {setting?.phone}</div>
          <div className="mt-1 font-semibold">{setting?.receiptTitle}</div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-muted-foreground">Kasir: {sale.cashier?.name ?? "-"}</p>
            {sale.customer && <p className="text-muted-foreground">Pelanggan: {sale.customer.name}</p>}
          </div>
          <div className="text-right">
            <p className="text-muted-foreground">{sale.createdAt.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead className="text-center">Qty</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sale.items.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="whitespace-normal">{it.product.name}</TableCell>
                <TableCell className="text-center">{it.qty}</TableCell>
                <TableCell className="text-right">{formatRupiah(it.price)}</TableCell>
                <TableCell className="text-right font-medium">{formatRupiah(it.price * it.qty)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatRupiah(sale.subtotal)}</span></div>
          {sale.discount > 0 && <div className="flex justify-between"><span>Diskon</span><span>-{formatRupiah(sale.discount)}</span></div>}
          {sale.tax > 0 && <div className="flex justify-between"><span>Pajak</span><span>{formatRupiah(sale.tax)}</span></div>}
          {sale.pointsUsed > 0 && <div className="flex justify-between"><span>Poin</span><span>-{formatRupiah(sale.pointsUsed)}</span></div>}
          <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span>{formatRupiah(sale.total)}</span></div>
          <div className="flex justify-between"><span>Bayar</span><span>{formatRupiah(sale.paid)}</span></div>
          <div className="flex justify-between"><span>Kembalian</span><span>{formatRupiah(sale.change)}</span></div>
          {sale.pointsEarned > 0 && <div className="flex justify-between"><span>Poin didapat</span><span>{sale.pointsEarned}</span></div>}
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">--- {setting?.receiptFooter} ---</div>
      </div>

      {sale.paymentProof && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-2 font-display text-sm font-bold">Bukti Pembayaran ({methodLabel[sale.paymentMethod]})</h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL base64 */}
          <img src={sale.paymentProof} alt="Bukti pembayaran" className="max-h-72 rounded-lg border border-outline-variant object-contain" />
        </div>
      )}
    </div>
  );
}