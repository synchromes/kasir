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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui";
import { TablePagination } from "@/components/table-pagination";
import { useConfirm } from "@/components/confirm-dialog";
import { ConsequenceChip } from "@/components/consequence-chip";
import { GuideDialog } from "@/components/guide-dialog";
import { Pencil, Trash2, Coins, MoreVertical, Search, X } from "lucide-react";
import { formatNumber } from "@/lib/utils";

type Customer = { id: number; name: string; phone: string | null; email: string | null; address: string | null; isMember: boolean; points: number };

const empty = { name: "", phone: "", email: "", address: "", isMember: false };
const DEFAULT_PER = 20;

function CustomerActions({ customer, onEdit, onDelete }: {
  customer: Customer;
  onEdit: (trigger: HTMLButtonElement | null) => void;
  onDelete: (trigger: HTMLButtonElement | null) => void;
}) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const actionSelected = React.useRef(false);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="ghost" size="icon" aria-label={`Aksi untuk ${customer.name}`} className="shrink-0">
          <MoreVertical aria-hidden="true" className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" collisionPadding={16} className="min-w-44" onCloseAutoFocus={event => {
        // Dialog mengambil fokus; menu yang baru ditutup tidak boleh merebutnya.
        if (actionSelected.current) { event.preventDefault(); actionSelected.current = false; }
      }}>
        <DropdownMenuItem aria-label={`Edit ${customer.name}`} className="min-h-11 gap-2" onSelect={() => {
          actionSelected.current = true;
          onEdit(triggerRef.current);
        }}>
          <Pencil aria-hidden="true" className="h-4 w-4" />Edit pelanggan
        </DropdownMenuItem>
        <DropdownMenuItem aria-label={`Hapus ${customer.name}`} className="min-h-11 gap-2 text-destructive" onSelect={() => {
          actionSelected.current = true;
          onDelete(triggerRef.current);
        }}>
          <Trash2 aria-hidden="true" className="h-4 w-4" />Hapus pelanggan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
  const searchRef = React.useRef<HTMLInputElement>(null);
  const formTriggerRef = React.useRef<HTMLButtonElement | null>(null);

  const query = q.trim().toLowerCase();
  const phoneQuery = /^[+\d\s().-]+$/.test(query) ? query.replace(/\D/g, "") : "";
  const visible = customers.filter(c => c.name.toLowerCase().includes(query)
    || (c.phone ?? "").toLowerCase().includes(query)
    || (phoneQuery !== "" && (c.phone ?? "").replace(/\D/g, "").includes(phoneQuery)));
  const pageCount = Math.max(1, Math.ceil(visible.length / per));
  const safePage = Math.min(page, pageCount);
  const paged = visible.slice((safePage - 1) * per, safePage * per);

  function clearSearch() {
    setQ("");
    setPage(1);
    searchRef.current?.focus();
  }

  function openNew(event: React.MouseEvent<HTMLButtonElement>) {
    formTriggerRef.current = event.currentTarget;
    setError(null);
    setEditing(null);
    setForm({ ...empty });
    setIsMember(false);
    setOpen(true);
  }
  function openEdit(c: Customer, trigger: HTMLButtonElement | null) {
    formTriggerRef.current = trigger;
    setError(null);
    setEditing(c);
    setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", address: c.address ?? "", isMember: c.isMember });
    setIsMember(c.isMember);
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await saveCustomer({ id: editing?.id, ...form, isMember });
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Gagal menyimpan pelanggan. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number, trigger: HTMLButtonElement | null) {
    const n = saleCounts[id] ?? 0;
    const ok = await confirm({
      title: "Hapus pelanggan?",
      message: n > 0
        ? `${n} transaksi pelanggan ini akan kehilangan data pelanggan (tetap tersimpan, hanya nama pelanggan yang hilang). Data pelanggan akan dihapus permanen.`
        : "Data pelanggan ini akan dihapus permanen dan tidak bisa dikembalikan.",
    });
    if (!ok) { requestAnimationFrame(() => trigger?.focus()); return; }
    try {
      await deleteCustomer(id);
      router.refresh();
      searchRef.current?.focus();
    } catch {
      setError("Gagal menghapus pelanggan. Periksa koneksi lalu coba lagi.");
      requestAnimationFrame(() => trigger?.focus());
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Pelanggan</h1>
          <p className="text-sm text-muted-foreground">Kelola pelanggan & member</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <GuideDialog variant="chip" initialCategory="customers" />
          <Button variant="accent" onClick={openNew}><span className="lg:hidden">+ Tambah pelanggan</span><span className="hidden lg:inline">+ Tambah</span></Button>
        </div>
      </div>

      {error && !open && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Card className="overflow-hidden shadow-none lg:shadow-sm">
        <div className="p-4">
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant lg:hidden" />
            <Input ref={searchRef} aria-label="Cari pelanggan" placeholder="Cari nama atau telepon" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} onKeyDown={event => { if (event.key === "Escape") clearSearch(); }} className="pl-10 pr-12 lg:max-w-xs lg:px-3" />
            {q && <button type="button" aria-label="Bersihkan pencarian" onClick={clearSearch} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"><X aria-hidden="true" className="h-4 w-4" /></button>}
          </div>
        </div>
        <p role="status" className="sr-only lg:hidden">{visible.length} pelanggan{query ? " ditemukan" : ""}</p>
        <ul aria-label="Daftar pelanggan" className="divide-y divide-outline-variant lg:hidden">
          {paged.map(c => (
            <li key={c.id} className="p-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-base font-semibold text-on-surface">{c.name}</h2>
                  <p className="mt-1 break-words text-sm text-on-surface-variant">{c.phone || "Telepon belum diisi"}</p>
                </div>
                <CustomerActions customer={c} onEdit={trigger => openEdit(c, trigger)} onDelete={trigger => { void handleDelete(c.id, trigger); }} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                <Badge variant={c.isMember ? "success" : "outline"}>{c.isMember ? "Member" : "Umum"}</Badge>
                <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant"><Coins aria-hidden="true" className="h-4 w-4 text-accent" />{formatNumber(c.points)} poin</span>
                {(saleCounts[c.id] ?? 0) > 0 && <span className="text-xs text-on-surface-variant">{formatNumber(saleCounts[c.id])} transaksi</span>}
              </div>
            </li>
          ))}
          {paged.length === 0 && <li className="px-4 py-8 text-center">
            <p className="text-sm text-on-surface-variant">{query ? "Tidak ada pelanggan yang cocok dengan pencarian." : "Belum ada pelanggan. Tambahkan pelanggan pertama."}</p>
            {query && <Button variant="ghost" className="mt-2" onClick={clearSearch}>Tampilkan semua pelanggan</Button>}
          </li>}
        </ul>
        <div role="region" aria-label="Daftar pelanggan, tabel dapat digeser" tabIndex={0} className="hidden overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:block">
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
                    <Button variant="ghost" size="sm" aria-label={`Edit ${c.name}`} onClick={event => openEdit(c, event.currentTarget)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" aria-label={`Hapus ${c.name}`} className="text-destructive" onClick={event => { void handleDelete(c.id, event.currentTarget); }}><Trash2 className="h-4 w-4" /></Button>
                    {(saleCounts[c.id] ?? 0) > 0 && (
                      <ConsequenceChip title={`${saleCounts[c.id]} transaksi akan kehilangan data pelanggan ini`}>
                        {saleCounts[c.id]} transaksi
                      </ConsequenceChip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center">
                  <p className="text-sm text-on-surface-variant">{query ? "Tidak ada pelanggan yang cocok dengan pencarian." : "Belum ada pelanggan. Tambahkan pelanggan pertama."}</p>
                  {query && <Button variant="ghost" className="mt-2" onClick={clearSearch}>Bersihkan pencarian</Button>}
                </TableCell>
              </TableRow>
            )}
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
          compactOnMobile
        />
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onCloseAutoFocus={event => { event.preventDefault(); formTriggerRef.current?.focus(); }}>
          <DialogHeader><DialogTitle>{editing ? "Edit Pelanggan" : "Tambah Pelanggan"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nama *</Label>
                <Input id="name" autoComplete="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telepon</Label>
                  <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Alamat</Label>
                <Input id="address" autoComplete="street-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm lg:min-h-0 lg:gap-2">
                <input type="checkbox" checked={isMember} onChange={(e) => setIsMember(e.target.checked)} className="h-4 w-4 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
                Jadikan member (poin aktif)
              </label>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" className="lg:hidden" onClick={() => setOpen(false)}>Batal</Button>
              <Button variant="accent" type="submit" disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
