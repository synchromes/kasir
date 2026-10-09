"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { saveExpense, deleteExpense } from "@/lib/actions";
import { formatRupiah, formatDate } from "@/lib/utils";
import {
  Button,
  Input,
  Label,
  Card,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui";
import { TablePagination } from "@/components/table-pagination";
import { useConfirm } from "@/components/confirm-dialog";
import { GuideDialog } from "@/components/guide-dialog";
import { Pencil, Trash2 } from "lucide-react";

type Expense = { id: number; amount: number; note: string; createdAt: Date };

export default function ExpensesPage({
  expenses,
  grandTotal,
  todayTotal,
  total,
  page,
  per,
}: {
  expenses: Expense[];
  grandTotal: number;
  todayTotal: number;
  total: number;
  page: number;
  per: number;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ amount: 0, note: "" });

  function openNew() {
    setEditing(null);
    setForm({ amount: 0, note: "" });
    setError(null);
    setOpen(true);
  }
  function openEdit(e: Expense) {
    setEditing(e);
    setForm({ amount: e.amount, note: e.note });
    setError(null);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await saveExpense({ id: editing?.id, amount: form.amount, note: form.note });
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Gagal menyimpan pengeluaran. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    const ok = await confirm({
      title: "Hapus pengeluaran?",
      message: "Data pengeluaran ini akan dihapus permanen dan tidak bisa dikembalikan.",
    });
    if (!ok) return;
    try {
      await deleteExpense(id);
      router.refresh();
    } catch {
      setError("Gagal menghapus pengeluaran. Periksa koneksi lalu coba lagi.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Pengeluaran</h1>
          <p className="text-sm text-muted-foreground">Catat biaya operasional</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GuideDialog variant="chip" initialCategory="reports" />
          <Button variant="accent" onClick={openNew}>+ Catat Pengeluaran</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Total Pengeluaran</p>
          <p className="mt-1 font-display text-2xl font-bold">{formatRupiah(grandTotal)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Pengeluaran Hari Ini</p>
          <p className="mt-1 font-display text-2xl font-bold">{formatRupiah(todayTotal)}</p>
        </Card>
      </div>

      {error && !open && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Card className="overflow-hidden">
        <div role="region" aria-label="Daftar pengeluaran, tabel dapat digeser" tabIndex={0} className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Catatan</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-xs">{formatDate(e.createdAt)}</TableCell>
                <TableCell>{e.note}</TableCell>
                <TableCell className="text-right font-semibold text-destructive">{formatRupiah(e.amount)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="sm" aria-label={`Edit pengeluaran ${e.note}`} onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" aria-label={`Hapus pengeluaran ${e.note}`} className="text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {expenses.length === 0 && (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-on-surface-variant">Belum ada pengeluaran. Catat biaya operasional pertama.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
        <TablePagination total={total} page={page} per={per} unit="pengeluaran" />
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Pengeluaran" : "Catat Pengeluaran"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Jumlah (Rp) *</Label>
                <Input id="amount" type="number" min="0" required value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note">Catatan *</Label>
                <Input id="note" required value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Misal: bayar listrik, gaji karyawan" />
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="accent" type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
