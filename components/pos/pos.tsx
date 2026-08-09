"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Minus, Trash2, Package, Coins, ArrowRight, Banknote, QrCode, ArrowLeftRight, UserRound, UploadCloud, X } from "lucide-react";
import { checkout } from "@/lib/actions";
import { validateQRIS } from "@/lib/qris";
import { resizeImageToDataUrl, PROOF_IMAGE_MAX_DIM, PROOF_IMAGE_QUALITY } from "@/lib/image";
import { formatRupiah, cn } from "@/lib/utils";
import { Button, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui";
import { CART_KEY, PENDING_KEY } from "@/lib/storage";

// Keranjang disimpan di sessionStorage agar tidak hilang saat kasir pindah ke
// halaman Konfirmasi Pembayaran (QRIS) dan kembali. Dihapus setelah transaksi
// berhasil di halaman sukses.

type Product = {
  id: number;
  name: string;
  sku: string;
  barcode: string | null;
  image: string | null;
  price: number;
  stock: number;
  unit: string;
  category: string;
};
type Customer = {
  id: number;
  name: string;
  points: number;
  isMember: boolean;
};
type Setting = {
  taxRate: number;
  pointsPer10k: number;
  storeName: string;
  address: string;
  phone: string;
  receiptTitle: string;
  receiptFooter: string;
  qrisStatic: string;
};
type CartLine = { productId: number; name: string; price: number; qty: number; stock: number; unit: string };

const methods = [
  { id: "CASH", label: "Tunai", icon: Banknote },
  { id: "QRIS", label: "QRIS", icon: QrCode },
  { id: "TRANSFER", label: "Transfer", icon: ArrowLeftRight },
] as const;

export default function POSClient({
  products,
  customers,
  setting,
}: {
  products: Product[];
  customers: Customer[];
  setting: Setting;
}) {
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState("all");
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [discountType, setDiscountType] = React.useState<"FIXED" | "PERCENT">("FIXED");
  const [discountValue, setDiscountValue] = React.useState(0);
  const [customerId, setCustomerId] = React.useState<string>("");
  const [usePoints, setUsePoints] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState("CASH");
  const [paid, setPaid] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const router = useRouter();

  // Foto bukti pembayaran (Transfer)
  const [proofImage, setProofImage] = React.useState<string | null>(null);
  const [proofError, setProofError] = React.useState<string | null>(null);
  const proofRef = React.useRef<HTMLInputElement>(null);

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  const filtered = products.filter((p) => {
    const matchesQuery =
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase()) ||
      (p.barcode && p.barcode.includes(query));
    const matchesCategory = category === "all" || p.category === category;
    return matchesQuery && matchesCategory;
  });

  const selectedCustomer = customers.find((c) => String(c.id) === String(customerId)) ?? null;
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountPct = Math.min(Math.max(discountValue, 0), 100);
  const rawDiscount = discountType === "PERCENT" ? Math.round((subtotal * discountPct) / 100) : discountValue;
  const effDiscount = Math.min(rawDiscount, subtotal);
  const tax = ((subtotal - effDiscount) * setting.taxRate) / 100;
  const totalBeforePoints = Math.round(subtotal - effDiscount + tax);
  const maxPoints = selectedCustomer?.isMember ? Math.min(selectedCustomer.points, Math.floor(totalBeforePoints / 100)) : 0;
  const pointsToUse = usePoints ? maxPoints : 0;
  const total = Math.max(totalBeforePoints - pointsToUse, 0);
  const paidNum = Number(paid) || 0;
  const change = paidNum - total;
  const pointsEarned = Math.floor(total / 10000) * setting.pointsPer10k;

  // QRIS: QR dinamis berukuran besar ditampilkan di halaman Konfirmasi
  // Pembayaran — di sini cukup validasi konfigurasi QRIS statis toko.
  const showQris = paymentMethod === "QRIS" && cart.length > 0 && total > 0;
  const qrisStaticTrim = setting.qrisStatic?.trim() ?? "";
  const qrisValidation = qrisStaticTrim ? validateQRIS(qrisStaticTrim) : null;
  const qrisConfigError =
    showQris
      ? !qrisStaticTrim
        ? "QRIS statis belum diatur — buka menu Pengaturan lalu upload/tempel string QRIS statis."
        : qrisValidation && !qrisValidation.valid
          ? "QRIS statis tidak valid: " + qrisValidation.errors[0]
          : null
      : null;

  // Pulihkan keranjang saat kembali dari halaman konfirmasi / setelah refresh.
  // Pembacaan dilakukan lewat microtask (bukan setState sinkron di effect)
  // agar lolos aturan lint react-hooks/set-state-in-effect.
  const restoredRef = React.useRef(false);
  React.useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      try {
        // Transaksi pending yang ditinggalkan (mis. kasir tekan browser-back
        // dari halaman konfirmasi) tidak boleh muncul lagi — keranjang tetap
        // tersimpan terpisah di CART_KEY, jadi tidak ada data yang hilang.
        sessionStorage.removeItem(PENDING_KEY);
        const raw = sessionStorage.getItem(CART_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (Array.isArray(d.items) && d.items.length && cart.length === 0) {
            setCart(d.items);
            if (d.discountType) setDiscountType(d.discountType);
            if (typeof d.discountValue === "number") setDiscountValue(d.discountValue);
            if (d.customerId) setCustomerId(String(d.customerId));
            setUsePoints(!!d.usePoints);
          }
        }
      } catch {
        /* abaikan data korup */
      }
      // Baru izinkan efek penyimpanan menulis storage setelah percobaan
      // restore selesai — mencegah keranjang kosong menimpa data saat mount.
      restoredRef.current = true;
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hanya saat mount
  }, []);

  // Simpan keranjang setiap berubah agar tidak hilang saat pindah halaman.
  React.useEffect(() => {
    if (!restoredRef.current) return;
    try {
      sessionStorage.setItem(
        CART_KEY,
        JSON.stringify({ items: cart, discountType, discountValue, customerId, usePoints })
      );
    } catch {
      /* abaikan */
    }
  }, [cart, discountType, discountValue, customerId, usePoints]);

  async function handleProofChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProofError(null);
    if (!file.type.startsWith("image/")) {
      setProofError("File harus berupa gambar (JPG/PNG/WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProofError("Ukuran gambar maksimal 5 MB.");
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file, PROOF_IMAGE_MAX_DIM, PROOF_IMAGE_QUALITY);
      setProofImage(dataUrl);
    } catch (err) {
      setProofError(err instanceof Error ? err.message : "Gagal memuat gambar.");
    }
  }

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((l) => (l.productId === product.id ? { ...l, qty: l.qty + 1 } : l));
      }
      if (product.stock <= 0) return prev;
      return [...prev, { productId: product.id, name: product.name, price: product.price, qty: 1, stock: product.stock, unit: product.unit }];
    });
    setQuery("");
    searchRef.current?.focus();
  }

  function changeQty(productId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const nq = l.qty + delta;
          if (nq <= 0 || nq > l.stock) return l;
          return { ...l, qty: nq };
        })
        .filter((l) => l.qty > 0)
    );
  }
  function removeLine(productId: number) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length) addToCart(filtered[0]);
    }
  };

  async function handleCheckout() {
    setError(null);
    setLoading(true);
    const res = await checkout({
      items: cart,
      discountType,
      discountValue,
      paid: paymentMethod === "CASH" ? paidNum || total : total,
      paymentMethod,
      customerId: selectedCustomer ? Number(selectedCustomer.id) : null,
      usePoints: pointsToUse > 0,
      paymentProof: proofImage,
    });
    if (res?.error) {
      setError(res.error);
      setLoading(false);
    }
  }

  // QRIS: lanjut ke halaman Konfirmasi Pembayaran (QR besar untuk dipindai
  // pelanggan). Keranjang & rincian disimpan di sessionStorage; dibersihkan
  // setelah transaksi sukses di halaman sukses.
  function handleContinue() {
    const pending = {
      items: cart,
      discountType,
      discountValue,
      paid: total,
      paymentMethod: "QRIS",
      customerId: selectedCustomer ? Number(selectedCustomer.id) : null,
      usePoints: pointsToUse > 0,
      // Rincian final untuk halaman konfirmasi (dihitung sekali di sini agar
      // total yang ditampilkan & dipakai untuk QR konsisten dengan POS).
      subtotal,
      discount: effDiscount,
      tax,
      pointsUsed: pointsToUse,
      total,
    };
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
    } catch {
      /* abaikan */
    }
    router.push("/pos/confirm");
  }

  const changeCustomer = (v: string) => {
    setCustomerId(v);
    setUsePoints(false);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:h-[calc(100vh-8rem)] lg:grid-cols-[1fr_400px]">
      {/* Left: products */}
      <div className="flex min-h-0 flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari produk, SKU, atau scan barcode..."
            className="h-11 rounded-lg border-outline-variant bg-surface-container-low pl-10 text-base shadow-none"
            autoFocus
          />
        </div>

        {/* Category chips */}
        <div className="scrollbar-hide flex shrink-0 gap-2 overflow-x-auto pb-0.5">
          <button
            onClick={() => setCategory("all")}
            className={cn(
              "shrink-0 cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-colors",
              category === "all"
                ? "bg-primary-fixed-dim text-on-primary-fixed"
                : "border border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
            )}
          >
            Semua Item
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "shrink-0 cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-colors",
                category === c
                  ? "bg-primary-fixed-dim text-on-primary-fixed"
                  : "border border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock <= 0}
                className={cn(
                  "group overflow-hidden rounded-lg border border-outline-variant bg-card text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]",
                  p.stock <= 0 && "cursor-not-allowed opacity-50"
                )}
              >
                <div className="relative flex h-24 items-center justify-center overflow-hidden bg-surface-container-high">
                  {p.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- data URL base64, tidak bisa dioptimasi next/image */
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-on-surface-variant transition-transform group-hover:scale-110" />
                  )}
                  <span className="absolute right-2 top-2 rounded-md bg-card/95 px-2 py-0.5 font-mono text-xs font-semibold">
                    {formatRupiah(p.price)}
                  </span>
                </div>
                <div className="p-2.5">
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className={cn("mt-0.5 truncate text-xs", p.stock <= 5 ? "font-medium text-tertiary" : "text-on-surface-variant")}>
                    {p.category} · Stok {p.stock} {p.unit}
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full rounded-xl border border-dashed border-outline-variant p-8 text-center text-sm text-on-surface-variant">
                Tidak ada produk. Coba istilah lain atau scan barcode.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right: cart & checkout */}
      <div className="flex min-h-0 flex-col gap-4">
        {/* Order header */}
        <div className="shrink-0 rounded-xl border border-outline-variant bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold">Pesanan Saat Ini</h2>
            <span className="font-mono text-xs text-on-surface-variant">{cart.length} item</span>
          </div>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <Select value={customerId} onValueChange={changeCustomer}>
              <SelectTrigger className="h-10 rounded-md border-outline-variant bg-surface pl-9 text-sm">
                <SelectValue placeholder="Tambah Pelanggan (Opsional)" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                    {c.isMember ? ` · ${c.points} poin` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedCustomer?.isMember && (
            <div className="mt-3 space-y-1 rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-on-surface-variant">
                  <Coins className="h-4 w-4 text-accent" /> Poin: {selectedCustomer.points}
                </span>
                {maxPoints > 0 && (
                  <button
                    onClick={() => setUsePoints(!usePoints)}
                    className={cn(
                      "cursor-pointer text-xs font-semibold",
                      usePoints ? "text-accent" : "text-on-surface-variant hover:text-on-surface"
                    )}
                  >
                    {usePoints ? `Pakai poin (${pointsToUse})` : "Pakai poin"}
                  </button>
                )}
              </div>
              {pointsEarned > 0 && <p className="text-[11px] text-on-surface-variant">Akan dapat +{pointsEarned} poin</p>}
            </div>
          )}
        </div>

        {/* Cart items */}
        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-outline-variant bg-card p-3 shadow-sm">
          {cart.length === 0 && (
            <p className="py-10 text-center text-sm text-on-surface-variant">Keranjang kosong</p>
          )}
          <ul className="space-y-2">
            {cart.map((l) => (
              <li key={l.productId} className="rounded-lg border border-outline-variant bg-surface p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{l.name}</div>
                    <div className="text-xs text-on-surface-variant">
                      {formatRupiah(l.price)} × {l.qty}
                    </div>
                  </div>
                  <div className="shrink-0 font-mono text-sm font-semibold">{formatRupiah(l.price * l.qty)}</div>
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <button
                    onClick={() => changeQty(l.productId, -1)}
                    aria-label="Kurangi"
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-low"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-5 text-center font-mono text-sm font-semibold">{l.qty}</span>
                  <button
                    onClick={() => changeQty(l.productId, 1)}
                    aria-label="Tambah"
                    className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-low"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => removeLine(l.productId)}
                    aria-label="Hapus"
                    className="ml-auto flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive-container"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Totals & payment */}
        <div className="shrink-0 rounded-xl border border-outline-variant bg-card p-4 shadow-sm">
          <div className="mb-4 space-y-1.5 text-sm">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="discount" className="text-xs font-semibold text-on-surface-variant">
                  Diskon
                </Label>
                <div className="flex overflow-hidden rounded-md border border-outline-variant">
                  <button
                    type="button"
                    onClick={() => setDiscountType("FIXED")}
                    aria-pressed={discountType === "FIXED"}
                    className={cn(
                      "cursor-pointer px-2 py-1 text-xs font-semibold transition-colors",
                      discountType === "FIXED"
                        ? "bg-primary-fixed-dim text-on-primary-fixed"
                        : "bg-surface text-on-surface-variant hover:bg-surface-container-low"
                    )}
                  >
                    Rp
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType("PERCENT")}
                    aria-pressed={discountType === "PERCENT"}
                    className={cn(
                      "cursor-pointer border-l border-outline-variant px-2 py-1 text-xs font-semibold transition-colors",
                      discountType === "PERCENT"
                        ? "bg-primary-fixed-dim text-on-primary-fixed"
                        : "bg-surface text-on-surface-variant hover:bg-surface-container-low"
                    )}
                  >
                    %
                  </button>
                </div>
              </div>
              <div className="relative">
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max={discountType === "PERCENT" ? 100 : undefined}
                  value={discountValue || ""}
                  onChange={(e) =>
                    setDiscountValue(
                      discountType === "PERCENT"
                        ? Math.min(100, Math.max(0, Number(e.target.value) || 0))
                        : Math.max(0, Number(e.target.value) || 0)
                    )
                  }
                  placeholder="0"
                  className="h-8 w-28 rounded-md border-outline-variant bg-surface pr-8 text-right text-sm"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-on-surface-variant">
                  {discountType === "PERCENT" ? "%" : "Rp"}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Subtotal</span>
              <span className="font-mono">{formatRupiah(subtotal)}</span>
            </div>
            {effDiscount > 0 && (
              <div className="flex justify-between text-on-surface-variant">
                <span>Diskon{discountType === "PERCENT" ? ` (${discountPct}%)` : ""}</span>
                <span className="font-mono">-{formatRupiah(effDiscount)}</span>
              </div>
            )}
            {setting.taxRate > 0 && (
              <div className="flex justify-between text-on-surface-variant">
                <span>Pajak ({setting.taxRate}%)</span>
                <span className="font-mono">{formatRupiah(tax)}</span>
              </div>
            )}
            {pointsToUse > 0 && (
              <div className="flex justify-between text-on-surface-variant">
                <span>Poin</span>
                <span className="font-mono">-{formatRupiah(pointsToUse)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-dashed border-outline-variant pt-2 font-display text-base font-bold">
              <span>Total</span>
              <span className="font-mono">{formatRupiah(total)}</span>
            </div>
          </div>

          {/* Payment methods */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setPaymentMethod(m.id);
                  // Bukti hanya relevan untuk Transfer — bersihkan saat pindah metode lain
                  if (m.id !== "TRANSFER") setProofImage(null);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border py-2.5 transition-colors",
                  paymentMethod === m.id
                    ? "border-2 border-primary bg-primary-fixed-dim/20 font-semibold text-primary"
                    : "border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
                )}
              >
                <m.icon className="h-5 w-5" />
                <span className="text-[11px] font-semibold">{m.label}</span>
              </button>
            ))}
          </div>

          {paymentMethod === "CASH" && (
            <div className="mb-3 space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Label htmlFor="paid" className="sr-only">Dibayar</Label>
                  <Input
                    id="paid"
                    type="number"
                    value={paid}
                    onChange={(e) => setPaid(e.target.value)}
                    placeholder="Masukkan nominal tunai"
                    className="h-10 rounded-md border-outline-variant bg-surface"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => setPaid(String(Math.ceil(total / 1000) * 1000))} className="h-10">
                  Pas
                </Button>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Kembalian</span>
                <span className={cn("font-mono font-semibold", change < 0 ? "text-destructive" : "text-accent")}>
                  {formatRupiah(Math.max(change, 0))}
                </span>
              </div>
            </div>
          )}

          {paymentMethod === "QRIS" && qrisConfigError && (
            <div className="mb-3 rounded-lg border border-outline-variant bg-surface p-3">
              <p className="flex items-start gap-2 text-xs text-destructive">
                <QrCode className="mt-0.5 h-4 w-4 shrink-0" /> {qrisConfigError}
              </p>
            </div>
          )}

          {paymentMethod === "QRIS" && !qrisConfigError && showQris && (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-outline-variant bg-surface p-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed-dim/40 text-primary">
                <QrCode className="h-5 w-5" />
              </span>
              <div className="text-xs text-on-surface-variant">
                <p className="font-semibold text-on-surface">QRIS Dinamis</p>
                <p>QR berisi nominal akan ditampilkan besar di halaman Konfirmasi Pembayaran.</p>
              </div>
            </div>
          )}

          {paymentMethod === "TRANSFER" && (
            <div className="mb-3 rounded-lg border border-outline-variant bg-surface p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <Label className="text-xs font-semibold text-on-surface-variant">Foto Bukti Pembayaran</Label>
                <span className="text-[10px] font-medium text-on-surface-variant">Opsional</span>
              </div>
              <input ref={proofRef} type="file" accept="image/*" className="hidden" onChange={handleProofChange} />
              {proofImage ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data URL base64 */}
                  <img src={proofImage} alt="Bukti pembayaran" className="h-16 w-16 rounded-lg border border-outline-variant object-cover" />
                  <p className="flex-1 text-xs text-on-surface-variant">Bukti pembayaran terlampir</p>
                  <button
                    type="button"
                    onClick={() => {
                      setProofImage(null);
                      if (proofRef.current) proofRef.current.value = "";
                    }}
                    className="flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-destructive transition-colors hover:bg-destructive-container"
                  >
                    <X className="h-3.5 w-3.5" /> Hapus
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => proofRef.current?.click()}
                  className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-outline-variant py-4 text-xs text-on-surface-variant transition-colors hover:border-primary/60 hover:bg-surface-container-low"
                >
                  <UploadCloud className="h-5 w-5" /> Foto bukti transfer — klik untuk pilih
                </button>
              )}
              {proofError && <p className="mt-1 text-xs text-destructive">{proofError}</p>}
            </div>
          )}

          {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

          <Button
            variant="accent"
            className="h-12 w-full rounded-lg text-base font-bold shadow-sm"
            disabled={
              cart.length === 0 ||
              loading ||
              (paymentMethod === "CASH" && paidNum < total) ||
              (paymentMethod === "QRIS" && !!qrisConfigError)
            }
            onClick={paymentMethod === "QRIS" ? handleContinue : handleCheckout}
          >
            {loading ? "Memproses..." : paymentMethod === "QRIS" ? "Lanjutkan Pembayaran" : `Bayar ${formatRupiah(total)}`}
            {!loading && <ArrowRight className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
