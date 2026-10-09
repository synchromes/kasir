import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Button, Card } from "@/components/ui";
import { PrintButton } from "@/components/print-button";
import { ClearPending } from "@/components/pos/clear-pending";
import Link from "next/link";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Struk transaksi #${id}` };
}

const methodLabel: Record<string, string> = { CASH: "Tunai", QRIS: "QRIS", TRANSFER: "Transfer" };

export default async function SuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const ownerId = Number(session.user.id);
  const { id } = await params;
  const sale = await prisma.sale.findFirst({
    where: { id: Number(id), ownerId },
    include: {
      items: { include: { product: true } },
      customer: true,
      cashier: true,
    },
  });
  if (!sale) notFound();
  const setting = await prisma.setting.findUnique({ where: { ownerId } });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <ClearPending ownerId={ownerId} saleKey={sale.saleKey} />
      <Card className="no-print flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="min-w-0 text-sm font-medium text-accent sm:flex-1">Transaksi berhasil disimpan</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild className="flex-1 whitespace-nowrap sm:flex-none">
            <Link href="/pos">Transaksi Baru</Link>
          </Button>
          <PrintButton className="flex-1 sm:flex-none" />
        </div>
      </Card>

      <div className="print-area mx-auto w-full rounded-xl border bg-card p-4 shadow-sm sm:p-6">
        <div className="mb-4 text-center">
          <div className="font-display text-lg font-bold">{setting?.storeName}</div>
          <div className="text-xs text-muted-foreground">{setting?.address}</div>
          <div className="text-xs text-muted-foreground">Telp: {setting?.phone}</div>
        </div>
        <div className="mb-4 border-t border-dashed pt-2 text-sm">
          <div className="text-center font-semibold">{setting?.receiptTitle}</div>
          <div className="mt-2 flex justify-between"><span>No. {sale.invoiceNo}</span><span>{formatDate(sale.createdAt)}</span></div>
        </div>

        {/* table-fixed + lebar kolom eksplisit: nama item panjang tidak lagi
            mendesak kolom Harga/Subtotal sampai angkanya saling menempel. */}
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b">
              <th className="py-1 text-left">Item</th>
              <th className="w-8 py-1 text-center">Qty</th>
              <th className="w-[92px] py-1 text-right">Harga</th>
              <th className="w-[104px] py-1 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((it) => (
              <tr key={it.id}>
                <td className="break-words py-1 pr-1 leading-snug">{it.product.name}</td>
                <td className="py-1 text-center">{it.qty}</td>
                <td className="whitespace-nowrap py-1 text-right">{formatRupiah(it.price)}</td>
                <td className="whitespace-nowrap py-1 text-right">{formatRupiah(it.price * it.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 space-y-1 border-t pt-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatRupiah(sale.subtotal)}</span></div>
          {sale.discount > 0 && <div className="flex justify-between"><span>Diskon</span><span>-{formatRupiah(sale.discount)}</span></div>}
          {sale.tax > 0 && <div className="flex justify-between"><span>Pajak</span><span>{formatRupiah(sale.tax)}</span></div>}
          {sale.pointsUsed > 0 && <div className="flex justify-between"><span>Poin</span><span>-{formatRupiah(sale.pointsUsed)}</span></div>}
          <div className="flex justify-between text-lg font-bold"><span>TOTAL</span><span>{formatRupiah(sale.total)}</span></div>
          <div className="flex justify-between"><span>Bayar</span><span>{formatRupiah(sale.paid)}</span></div>
          <div className="flex justify-between"><span>Kembalian</span><span>{formatRupiah(sale.change)}</span></div>
        </div>

        <div className="mt-4 border-t border-dashed pt-2 text-sm">
          <div className="flex justify-between"><span>Metode</span><span>{methodLabel[sale.paymentMethod] ?? sale.paymentMethod}</span></div>
          <div className="flex justify-between"><span>Kasir</span><span>{sale.cashier?.name ?? "-"}</span></div>
          {sale.customer && <div className="flex justify-between"><span>Pelanggan</span><span>{sale.customer.name}</span></div>}
          {sale.pointsEarned > 0 && <div className="flex justify-between"><span>Poin tambah</span><span>{sale.pointsEarned}</span></div>}
        </div>

        <div className="mt-4 text-center text-xs text-muted-foreground">--- {setting?.receiptFooter} ---</div>
      </div>

      {sale.paymentProof && (
        <div className="no-print rounded-xl border border-outline-variant bg-card p-4 shadow-sm">
          <h2 className="mb-2 font-display text-sm font-bold">Bukti Pembayaran ({methodLabel[sale.paymentMethod] ?? sale.paymentMethod})</h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL base64 */}
          <img src={sale.paymentProof} alt="Bukti pembayaran" className="max-h-72 rounded-lg border border-outline-variant object-contain" />
        </div>
      )}
    </div>
  );
}
