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
    setError(null);
    const valid = lines.filter((l) => l.productId && l.qty > 0);
    if (!valid.length) { setError("Minimal satu item"); return; }
    setLoading(true);
    const res = await createPurchase({
      supplierId: supplierId ? Number(supplierId) : null,
      items: valid.map((l) => ({ productId: Number(l.productId), qty: l.qty, cost: l.cost })),
    });
    setLoading(false);
    if (res?.error) { setError(res.error); return; }
    setOpen(false);
    router.refresh();
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
              <Label>Supplier</Label>
              <Select value={supplierId || undefined} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
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
                <div key={i} className="grid grid-cols-[1fr_70px_110px_36px] items-center gap-2">
                  <Select value={l.productId || undefined} onValueChange={(v) => onProductChange(i, v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Produk" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input type="number" min="1" value={l.qty || ""} onChange={(e) => setLine(i, { qty: Number(e.target.value) || 0 })} placeholder="Qty" />
                  <Input type="number" min="0" value={l.cost || ""} onChange={(e) => setLine(i, { cost: Number(e.target.value) || 0 })} placeholder="Harga beli" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(i)} className="text-destructive" aria-label="Hapus baris">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4" /> Tambah item</Button>
            </div>

            <div className="flex justify-between border-t pt-3 font-bold"><span>Total</span><span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(total)}</span></div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="accent" type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan Pembelian"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}