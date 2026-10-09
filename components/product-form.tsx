"use client";

import * as React from "react";
import { saveProduct } from "@/lib/actions";
import { resizeImageToDataUrl, PRODUCT_IMAGE_MAX_DIM, PRODUCT_IMAGE_QUALITY } from "@/lib/image";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Button,
  Input,
  Label,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  type ButtonVariant,
  type ButtonSize,
} from "@/components/ui";

type Category = { id: number; name: string };
type Unit = { id: number; name: string; short: string };
type Product = {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  image: string | null;
  categoryId: number | null;
  unitId: number | null;
  costPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
};

export function ProductForm({
  categories,
  units,
  product,
  triggerLabel,
  triggerVariant = "accent",
  triggerSize = "default",
}: {
  categories: Category[];
  units: Unit[];
  product?: Product;
  triggerLabel?: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: ButtonSize;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [image, setImage] = React.useState<string | null>(product?.image ?? null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [form, setForm] = React.useState({
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    name: product?.name ?? "",
    categoryId: product?.categoryId ? String(product.categoryId) : "",
    unitId: product?.unitId ? String(product.unitId) : "",
    costPrice: product?.costPrice ?? 0,
    sellPrice: product?.sellPrice ?? 0,
    stock: product?.stock ?? 0,
    minStock: product?.minStock ?? 0,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setImageError(null);
    if (!file.type.startsWith("image/")) {
      setImageError("File harus berupa gambar (JPG/PNG/WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError("Ukuran gambar maksimal 5 MB.");
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file, PRODUCT_IMAGE_MAX_DIM, PRODUCT_IMAGE_QUALITY);
      setImage(dataUrl);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Gagal memuat gambar.");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    void pickFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void pickFile(e.dataTransfer.files?.[0]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await saveProduct({
        id: product?.id,
        sku: form.sku,
        barcode: form.barcode || undefined,
        name: form.name,
        image: image ?? null,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        unitId: form.unitId ? Number(form.unitId) : null,
        costPrice: form.costPrice,
        sellPrice: form.sellPrice,
        stock: form.stock,
        minStock: form.minStock,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
    } catch {
      setError("Gagal menyimpan produk. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize}>{triggerLabel ?? "+ Produk Baru"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
          <DialogDescription>Lengkapi informasi produk</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            {/* Foto produk */}
            <div className="space-y-1.5">
               <Label htmlFor="product-image">Foto Produk</Label>
               <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
                  dragOver
                    ? "border-primary bg-primary-fixed-dim/20"
                    : "border-outline-variant bg-surface-container-lowest hover:border-primary/60 hover:bg-surface-container-low"
                )}
              >
                 <input id="product-image" ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                 <button type="button" onClick={() => fileRef.current?.click()} aria-label={image ? "Ganti foto produk" : "Upload foto produk"} className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                {image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- data URL base64, tidak bisa dioptimasi next/image */}
                    <img src={image} alt="Pratinjau produk" className="h-28 w-28 rounded-lg border border-outline-variant object-cover shadow-sm" />
                    <p className="text-xs text-on-surface-variant">Klik untuk mengganti foto</p>
                  </>
                ) : (
                  <>
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-fixed-dim/40 text-primary">
                      <ImagePlus className="h-6 w-6" />
                    </span>
                    <p className="text-sm font-semibold">Upload foto produk</p>
                    <p className="text-xs text-on-surface-variant">Klik atau seret & letakkan gambar di sini · JPG/PNG/WebP</p>
                  </>
                )}
                {image && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage(null);
                    }}
                    aria-label="Hapus foto"
                     className="absolute -right-2 -top-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow transition-transform hover:scale-110"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {imageError && <p className="text-sm text-destructive">{imageError}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sku">SKU *</Label>
                <Input id="sku" value={form.sku} onChange={(e) => set("sku", e.target.value)} required placeholder="SKU-011" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="barcode">Barcode</Label>
                <Input id="barcode" value={form.barcode} onChange={(e) => set("barcode", e.target.value)} placeholder="8991001..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama Produk *</Label>
              <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Nama produk" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                 <Label htmlFor="product-category">Kategori</Label>
                 <Select value={form.categoryId || undefined} onValueChange={(v) => set("categoryId", v)}>
                   <SelectTrigger id="product-category"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                 <Label htmlFor="product-unit">Satuan</Label>
                 <Select value={form.unitId || undefined} onValueChange={(v) => set("unitId", v)}>
                   <SelectTrigger id="product-unit"><SelectValue placeholder="Pilih satuan" /></SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="costPrice">Harga Beli</Label>
                <Input id="costPrice" type="number" value={form.costPrice} onChange={(e) => set("costPrice", Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sellPrice">Harga Jual *</Label>
                <Input id="sellPrice" type="number" value={form.sellPrice} onChange={(e) => set("sellPrice", Number(e.target.value))} required />
              </div>
            </div>
            {!product && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="stock">Stok Awal</Label>
                  <Input id="stock" type="number" value={form.stock} onChange={(e) => set("stock", Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="minStock">Stok Minimum</Label>
                  <Input id="minStock" type="number" value={form.minStock} onChange={(e) => set("minStock", Number(e.target.value))} />
                </div>
              </div>
            )}
            {product && (
              <div className="space-y-1.5">
                <Label htmlFor="minStock">Stok Minimum</Label>
                <Input id="minStock" type="number" value={form.minStock} onChange={(e) => set("minStock", Number(e.target.value))} />
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="accent" type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
