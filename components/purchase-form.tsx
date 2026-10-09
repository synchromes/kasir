"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createPurchase } from "@/lib/actions";
import { Plus, Trash2 } from "lucide-react";
import { WarningNote } from "@/components/warning-note";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";

type Supplier = { id: number; name: string; phone: string | null; address: string | null };
type Product = { id: number; name: string; sku: string; costPrice: number };
type Line = { productId: string; qty: number; cost: number };

export function PurchaseForm({ suppliers, products }: { suppliers: Supplier[]; products: Product[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [supplierId, setSupplierId] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>([{ productId: "", qty: 1, cost: 0 }]);

  function setLine(i: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((ls) => [...ls, { productId: "", qty: 1, cost: 0 }]);
  }
  function removeLine(i: number) {
    setLines((ls) => ls.filter((_, idx) => idx !== i));
  }
  function onProductChange(i: number, id: string) {
    const prod = products.find((p) => String(p.id) === id);
    setLine(i, { productId: id, cost: prod?.costPrice ?? 0 });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    const valid = lines.filter((l) => l.productId && l.qty > 0);
    if (!valid.length) { setError("Minimal satu item"); return; }
    setLoading(true);
    try {
      const res = await createPurchase({
        supplierId: supplierId ? Number(supplierId) : null,
        items: valid.map((l) => ({ productId: Number(l.productId), qty: l.qty, cost: l.cost })),
      });
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Gagal menyimpan pembelian. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  const total = lines.reduce((s, l) => s + l.qty * (l.cost || 0), 0);
  // Supplier tanpa kontak: beri tahu kasir agar kontaknya dilengkapi dulu
  // (telepon/alamat kosong di data master Supplier).
  const selectedSupplier = suppliers.find((s) => String(s.id) === supplierId);
  const supplierNoContact = !!selectedSupplier && !selectedSupplier.phone && !selectedSupplier.address;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="accent">+ Pembelian Baru</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pembelian / Stok Masuk</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="purchase-supplier">Supplier</Label>
              <Select value={supplierId || undefined} onValueChange={setSupplierId}>
                <SelectTrigger id="purchase-supplier"><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {supplierNoContact && (
                <WarningNote>
                  Supplier ini belum punya kontak (telepon/alamat kosong). Lengkapi di menu Supplier agar mudah dihubungi untuk pengiriman atau pembayaran.
                </WarningNote>
              )}
            </div>

            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_44px] items-end gap-2 rounded-lg border border-outline-variant p-3 sm:grid-cols-[minmax(0,1fr)_70px_110px_44px] sm:border-0 sm:p-0">
                  <div className="col-span-3 min-w-0 space-y-1.5 sm:col-span-1">
                    <Label htmlFor={`purchase-product-${i}`}>Produk {i + 1}</Label>
                    <Select value={l.productId || undefined} onValueChange={(v) => onProductChange(i, v)}>
                      <SelectTrigger id={`purchase-product-${i}`} className="min-w-0 [&>span]:truncate"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor={`purchase-qty-${i}`}>Jumlah</Label>
                    <Input id={`purchase-qty-${i}`} type="number" min="1" step="1" required value={l.qty || ""} onChange={(e) => setLine(i, { qty: Number(e.target.value) || 0 })} placeholder="Qty" />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor={`purchase-cost-${i}`}>Harga beli</Label>
                    <Input id={`purchase-cost-${i}`} type="number" min="0" value={l.cost || ""} onChange={(e) => setLine(i, { cost: Number(e.target.value) || 0 })} placeholder="Harga beli" />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)} className="text-destructive" aria-label={`Hapus baris ${i + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4" /> Tambah item</Button>
            </div>

            <div className="flex justify-between border-t pt-3 font-bold"><span>Total</span><span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(total)}</span></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="accent" type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan Pembelian"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
