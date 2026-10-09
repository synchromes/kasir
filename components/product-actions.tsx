"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { deleteProduct, toggleProductActive } from "@/lib/actions";
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";
import { Power, Trash2 } from "lucide-react";
import { ConsequenceChip } from "@/components/consequence-chip";

export function DeleteProductButton({
  id,
  name,
  historyCount = 0,
  movementCount = 0,
}: {
  id: number;
  name: string;
  // Jumlah item transaksi (penjualan+pembelian) yang mereferensikan produk -
  // jika > 0 produk TIDAK bisa dihapus (integritas riwayat).
  historyCount?: number;
  // Jumlah riwayat pergerakan stok, ikut terhapus saat produk dihapus.
  movementCount?: number;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const blocked = historyCount > 0;
  const consequence = blocked
    ? `Produk sudah tercatat dalam ${historyCount} item transaksi (penjualan/pembelian), sehingga tidak dapat dihapus. Nonaktifkan saja agar tidak muncul di kasir.`
    : movementCount > 0
      ? `${movementCount} riwayat pergerakan stok produk ini akan ikut terhapus permanen.`
      : null;

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await deleteProduct(id);
      if (res?.error) {
        setError(res.error);
        setLoading(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Gagal menghapus produk. Coba lagi.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span className="relative inline-flex items-center">
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" aria-label={`Hapus ${name}`} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
        </DialogTrigger>
          {blocked ? (
            <span className="pointer-events-none absolute -right-1.5 -top-1.5">
              <ConsequenceChip title="Tidak dapat dihapus, sudah tercatat di transaksi">{historyCount}×</ConsequenceChip>
            </span>
          ) : movementCount > 0 ? (
            <span className="pointer-events-none absolute -right-1.5 -top-1.5">
              <ConsequenceChip title={`${movementCount} riwayat stok akan ikut terhapus`}>{movementCount}</ConsequenceChip>
            </span>
          ) : null}
      </span>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus Produk</DialogTitle>
          <DialogDescription>
            {blocked
              ? `"${name}" tidak dapat dihapus karena masih memiliki riwayat transaksi.`
              : `Yakin ingin menghapus "${name}"?${consequence ? ` ${consequence}` : ""}`}
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{blocked ? "Tutup" : "Batal"}</Button>
          {!blocked && (
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Menghapus..." : "Hapus"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ToggleActiveButton({ id, active }: { id: number; active: boolean }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await toggleProductActive(id, !active);
        router.refresh();
      }}
      aria-label={active ? "Nonaktifkan" : "Aktifkan"}
    >
      <Power className={active ? "h-4 w-4 text-accent" : "h-4 w-4 text-muted-foreground"} />
    </Button>
  );
}
