"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { adjustStock } from "@/lib/actions";
import { Button, Input, Label, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui";
import { SlidersHorizontal } from "lucide-react";
import { WarningNote } from "@/components/warning-note";

export function AdjustStockDialog({ product }: { product: { id: number; name: string; stock: number; minStock: number; unit: string } }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [qty, setQty] = React.useState(0);
  const [note, setNote] = React.useState("");
  // Stok setelah penyesuaian (tidak pernah negatif — server juga membatasi).
  const newStock = Math.max(product.stock + (qty || 0), 0);
  // Peringatan saat penyesuaian negatif melewati batas: (a) jatuh ke 0/habis,
  // atau (b) turun ke/melewati stok minimum. Beri tahu kasir konsekuensinya
  // (masuk daftar Stok menipis/Habis + notifikasi) sebelum disimpan.
  const belowMin = product.minStock > 0 && newStock <= product.minStock;
  const showStockWarning = (qty || 0) < 0 && (belowMin || newStock <= 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await adjustStock(product.id, qty, note);
    setLoading(false);
    if (res?.error) { setError(res.error); return; }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><SlidersHorizontal className="h-4 w-4" /> Sesuaikan</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sesuaikan Stok</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <p className="text-sm">{product.name} · stok sekarang {product.stock} {product.unit}</p>
            <div className="space-y-1.5">
              <Label htmlFor="qty">Perubahan (+/-)</Label>
              <Input id="qty" type="number" value={qty || ""} onChange={(e) => setQty(Number(e.target.value))} placeholder="Contoh: 10 untuk tambah, -5 untuk kurangi" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">Catatan</Label>
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Misal: opname, stok rusak" />
            </div>
            <p className="text-xs text-muted-foreground">Stok baru: {newStock} {product.unit}</p>
            {showStockWarning && (
              <WarningNote>
                {newStock <= 0
                  ? `Stok baru 0 ${product.unit} — produk menjadi HABIS dan memicu notifikasi stok. Tambahkan stok bila tidak diinginkan.`
                  : product.stock <= product.minStock
                    ? `Stok baru ${newStock} ${product.unit} akan tetap berada di bawah minimum ${product.minStock} ${product.unit} — produk tetap di daftar &ldquo;Stok menipis&rdquo;.`
                    : `Stok baru ${newStock} ${product.unit} akan berada di bawah minimum ${product.minStock} ${product.unit} — produk masuk daftar &ldquo;Stok menipis&rdquo; dan memicu notifikasi stok. Kurangi atau tambah stok bila tidak diinginkan.`}
              </WarningNote>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="accent" type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}