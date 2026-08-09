"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { ConsequenceChip } from "@/components/consequence-chip";
import { Pencil, Trash2 } from "lucide-react";

type Field = { key: string; label: string; type?: string };
type Row = { id: number } & Record<string, unknown>;

const DEFAULT_PER = 20;

export function SimpleCrud({
  title,
  subtitle,
  fields,
  rows,
  onSave,
  onDelete,
  searchKey,
  consequences,
  headerAction,
}: {
  title: string;
  subtitle: string;
  fields: Field[];
  rows: Row[];
  onSave: (data: Record<string, unknown>) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
  searchKey?: string;
  // Elemen aksi opsional di header (mis. tombol Bantuan kontekstual).
  headerAction?: React.ReactNode;
  // Konsekuensi penghapusan per baris (mis. "5 produk akan kehilangan
  // kategorinya") — ditampilkan sebagai chip amber di tombol hapus dan
  // ditambahkan ke dialog konfirmasi agar kasir tahu dampaknya.
  consequences?: Record<number, { chip: string; message: string }>;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Row | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [per, setPer] = React.useState(DEFAULT_PER);
  const [form, setForm] = React.useState<Record<string, unknown>>({});

  const visible = searchKey
    ? rows.filter((r) => String(r[searchKey] ?? "").toLowerCase().includes(q.toLowerCase()))
    : rows;
  const pageCount = Math.max(1, Math.ceil(visible.length / per));
  const safePage = Math.min(page, pageCount);
  const paged = visible.slice((safePage - 1) * per, safePage * per);

  function openNew() {
    setEditing(null);
    setForm(Object.fromEntries(fields.map((f) => [f.key, ""])));
    setError(null);
    setOpen(true);
  }
  function openEdit(row: Row) {
    setEditing(row);
    setForm(Object.fromEntries(fields.map((f) => [f.key, row[f.key]])));
    setError(null);
    setOpen(true);
  }

  function renderField(f: Field, value: unknown) {
    if (f.key === "isMember") return value ? <span className="text-accent">Member</span> : <span className="text-muted-foreground">Non-member</span>;
    return <span>{value ? String(value) : "-"}</span>;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = (await onSave(form)) as { error?: string } | null | undefined;
    setLoading(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function handleDelete(id: number) {
    const con = consequences?.[id];
    const ok = await confirm({
      title: `Hapus ${title.toLowerCase()} ini?`,
      message: con
        ? `${con.message} Data ini akan dihapus permanen dan tidak bisa dikembalikan.`
        : "Data akan dihapus permanen dan tidak bisa dikembalikan.",
    });
    if (!ok) return;
    await onDelete(id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {headerAction}
          <Button variant="accent" onClick={openNew}>+ Tambah</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {searchKey && (
          <div className="p-4">
            <Input
              placeholder={`Cari ${title.toLowerCase()}...`}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="max-w-xs"
            />
          </div>
        )}
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {fields.map((f) => (
                <TableHead key={f.key}>{f.label}</TableHead>
              ))}
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((row) => (
              <TableRow key={row.id}>
                {fields.map((f) => (
                  <TableCell key={f.key}>{renderField(f, row[f.key])}</TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4" /></Button>
                    {consequences?.[row.id] && (
                      <ConsequenceChip title={consequences[row.id].message}>{consequences[row.id].chip}</ConsequenceChip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {paged.length === 0 && (
              <TableRow><TableCell colSpan={fields.length + 1} className="py-8 text-center text-muted-foreground">Tidak ada data</TableCell></TableRow>
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
        />
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? `Edit ${title}` : `Tambah ${title}`}</DialogTitle></DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    type={f.type === "number" ? "number" : f.type === "textarea" ? undefined : "text"}
                    value={String(form[f.key] ?? "")}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value }))}
                    required
                  />
                </div>
              ))}
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