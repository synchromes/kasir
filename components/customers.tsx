"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { saveCustomer, deleteCustomer } from "@/lib/actions";
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
  Badge,
} from "@/components/ui";
import { TablePagination } from "@/components/table-pagination";
import { useConfirm } from "@/components/confirm-dialog";
import { ConsequenceChip } from "@/components/consequence-chip";
import { Pencil, Trash2, Coins } from "lucide-react";
import { formatNumber } from "@/lib/utils";

type Customer = { id: number; name: string; phone: string | null; email: string | null; address: string | null; isMember: boolean; points: number };

const empty = { name: "", phone: "", email: "", address: "", isMember: false };
const DEFAULT_PER = 20;

export default function CustomersPage({ customers, saleCounts }: { customers: Customer[]; saleCounts: Record<number, number> }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Customer | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [per, setPer] = React.useState(DEFAULT_PER);
  const [form, setForm] = React.useState({ ...empty });
  const [isMember, setIsMember] = React.useState(false);

  const visible = customers.filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  const pageCount = Math.max(1, Math.ceil(visible.length / per));
  const safePage = Math.min(page, pageCount);
  const paged = visible.slice((safePage - 1) * per, safePage * per);

  function openNew() {
    setEditing(null);
    setForm({ ...empty });
    setIsMember(false);
    setOpen(true);
  }
  function openEdit(c: Customer) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", address: c.address ?? "", isMember: c.isMember });
    setIsMember(c.isMember);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await saveCustomer({ id: editing?.id, ...form, isMember });
    setLoading(false);
    if (res?.error) { setError(res.error); return; }
    setOpen(false);
    router.refresh();
  }

  async function handleDelete(id: number) {
    const n = saleCounts[id] ?? 0;
    const ok = await confirm({
      title: "Hapus pelanggan?",
      message: n > 0
        ? `${n} transaksi pelanggan ini akan kehilangan data pelanggan (tetap tersimpan, hanya nama pelanggan yang hilang). Data pelanggan akan dihapus permanen.`
        : "Data pelanggan ini akan dihapus permanen dan tidak bisa dikembalikan.",
    });
    if (!ok) return;
    await deleteCustomer(id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Pelanggan</h1>
          <p className="text-sm text-muted-foreground">Kelola pelanggan & member</p>
        </div>
        <Button variant="accent" onClick={openNew}>+ Tambah</Button>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4"><Input placeholder="Cari pelanggan..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-xs" /></div>
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Poin</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>{c.phone ?? "-"}</TableCell>
                <TableCell>{c.isMember ? <Badge variant="success">Member</Badge> : <Badge variant="outline">Umum</Badge>}</TableCell>
                <TableCell><span className="inline-flex items-center gap-1"><Coins className="h-4 w-4 text-accent" />{formatNumber(c.points)}</span></TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    {(saleCounts[c.id] ?? 0) > 0 && (
                      <ConsequenceChip title={`${saleCounts[c.id]} transaksi akan kehilangan data pelanggan ini`}>
                        {saleCounts[c.id]} transaksi
                      </ConsequenceChip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <TablePagination
          total={visible.length}
          page={safePage}
          per={per}
          onPageChange={setPage}
          onPerPageChange={(p) => {
            setPer(p);
            setPage(1);
          }}
        />
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Pelanggan" : "Tambah Pelanggan"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama *</Label>
                <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telepon</Label>
                  <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Alamat</Label>
                <Input id="address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={isMember} onChange={(e) => setIsMember(e.target.checked)} className="h-4 w-4" />
                Jadikan member (poin aktif)
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
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