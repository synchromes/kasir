"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { saveUser, deleteUser } from "@/lib/actions";
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui";
import { TablePagination } from "@/components/table-pagination";
import { useConfirm } from "@/components/confirm-dialog";
import { ConsequenceChip } from "@/components/consequence-chip";
import { GuideDialog } from "@/components/guide-dialog";
import { Pencil, Trash2 } from "lucide-react";

type User = { id: number; name: string; email: string; role: string; active: boolean };

const empty = { name: "", email: "", role: "KASIR", active: true, password: "" };
const DEFAULT_PER = 20;

export default function UsersPage({
  users,
  currentUserId,
  dataCounts,
}: {
  users: User[];
  currentUserId: number;
  // Jumlah data toko per akun (produk/transaksi/pembelian) — untuk chip & pesan
  // konsekuensi saat akun dihapus (seluruh data ikut terhapus via cascade).
  dataCounts: Record<number, { products: number; sales: number; purchases: number }>;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ ...empty });
  const [page, setPage] = React.useState(1);
  const [per, setPer] = React.useState(DEFAULT_PER);

  const pageCount = Math.max(1, Math.ceil(users.length / per));
  const safePage = Math.min(page, pageCount);
  const paged = users.slice((safePage - 1) * per, safePage * per);

  function openNew() { setEditing(null); setForm({ ...empty }); setError(null); setActionError(null); setOpen(true); }
  function openEdit(u: User) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, role: u.role, active: u.active, password: "" });
    setError(null);
    setActionError(null);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await saveUser({
        id: editing?.id,
        name: form.name,
        email: form.email,
        role: form.role,
        active: form.active,
        password: form.password || undefined,
      });
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Gagal menyimpan pengguna. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    const d = dataCounts[id];
    const parts = [];
    if (d?.products) parts.push(`${d.products} produk`);
    if (d?.sales) parts.push(`${d.sales} transaksi`);
    if (d?.purchases) parts.push(`${d.purchases} pembelian`);
    const ok = await confirm({
      title: "Hapus akun?",
      message: parts.length
        ? `Seluruh data tokonya ikut terhapus permanen: ${parts.join(", ")}. Tidak bisa dikembalikan.`
        : "Seluruh data tokonya (produk, transaksi, dll.) ikut terhapus permanen dan tidak bisa dikembalikan.",
    });
    if (!ok) return;
    const res = await deleteUser(id);
    if (res?.error) { setActionError(res.error); return; }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Pengguna</h1>
          <p className="text-sm text-muted-foreground">Kelola akun & hak akses</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GuideDialog variant="chip" initialCategory="users" />
          <Button variant="accent" onClick={openNew}>+ Tambah Pengguna</Button>
        </div>
      </div>

      {actionError && <p role="alert" className="rounded-lg bg-destructive-container/60 px-3 py-2 text-sm text-destructive">{actionError}</p>}

      <Card className="overflow-hidden">
        <div role="region" aria-label="Daftar pengguna, tabel dapat digeser" tabIndex={0} className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name} {u.id === currentUserId && <Badge variant="outline" className="ml-1">Anda</Badge>}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell><Badge variant={u.role === "ADMIN" ? "default" : "outline"}>{u.role === "ADMIN" ? "Admin" : "Kasir"}</Badge></TableCell>
                <TableCell>{u.active ? <Badge variant="success">Aktif</Badge> : <Badge variant="destructive">Nonaktif</Badge>}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" aria-label={`Edit ${u.name}`} onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                    {u.id !== currentUserId && (
                      <Button variant="ghost" size="sm" aria-label={`Hapus ${u.name}`} className="text-destructive" onClick={() => handleDelete(u.id)}><Trash2 className="h-4 w-4" /></Button>
                    )}
                    {u.id !== currentUserId && (() => {
                      const d = dataCounts[u.id];
                      const parts = [];
                      if (d?.products) parts.push(`${d.products} produk`);
                      if (d?.sales) parts.push(`${d.sales} transaksi`);
                      if (d?.purchases) parts.push(`${d.purchases} pembelian`);
                      if (!parts.length) return null;
                      const total = parts.reduce((s, x) => s + Number(x.split(" ")[0]), 0);
                      return (
                        <ConsequenceChip title={`Seluruh data tokonya ikut terhapus: ${parts.join(", ")}`}>
                          {parts.length <= 2 ? parts.join(" · ") : `${total} data toko`}
                        </ConsequenceChip>
                      );
                    })()}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        <TablePagination
          total={users.length}
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
          <DialogHeader><DialogTitle>{editing ? "Edit Pengguna" : "Tambah Pengguna"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama *</Label>
                <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="user-role">Role</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger id="user-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {/* Role ADMIN hanya untuk akun developer (akun sendiri) —
                          akun toko selalu KASIR (1 akun = 1 toko). */}
                      <SelectItem value="ADMIN" disabled={!editing || editing.id !== currentUserId}>Admin</SelectItem>
                      <SelectItem value="KASIR">Kasir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="user-status">Status</Label>
                  <Select value={form.active ? "true" : "false"} onValueChange={(v) => setForm({ ...form, active: v === "true" })}>
                    <SelectTrigger id="user-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Aktif</SelectItem>
                      <SelectItem value="false">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">{editing ? "Password Baru (kosongkan jika tidak diganti)" : "Password *"}</Label>
                <Input id="password" type="password" required={!editing} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
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
