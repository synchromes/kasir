"use client";

import * as React from "react";
import { Minus, Package, Plus, Search, Trash2 } from "lucide-react";
import { formatRupiah, cn } from "@/lib/utils";
import { Input } from "@/components/ui";
import { OrderPanel } from "@/components/pos/order-panel";
import { usePosOrder } from "@/components/pos/use-pos-order";
import type { Customer, Product, Setting } from "@/components/pos/order-types";

// Halaman Kasir: pilih produk. Di desktop kolom pesanan tampil di kanan;
// di mobile hanya daftar produk + bar bawah (Rangkuman di halaman sendiri).
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
  // Stepper yang sedang terbuka; hanya satu dalam satu waktu. Setiap aksi
  // atau ketukan di luar stepper menutupnya kembali ke lingkaran angka.
  const [openId, setOpenId] = React.useState<number | null>(null);
  React.useEffect(() => {
    function onDoc(e: PointerEvent) {
      if (!(e.target as HTMLElement).closest?.("[data-stepper]")) setOpenId(null);
    }
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);
  const searchRef = React.useRef<HTMLInputElement>(null);
  // Cari produk tetap nyaman dipakai di desktop (autofokus), tapi di HP
  // fokus otomatis justru membuka keyboard dan menutupi layar — jadi hanya
  // aktif saat perangkat memakai mouse/trackpad (pointer: fine).
  function focusSearch() {
    if (typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches) {
      searchRef.current?.focus();
    }
  }
  React.useEffect(() => {
    focusSearch();
  }, []);

  const order = usePosOrder({ customers, setting });

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length) {
        order.addToCart(filtered[0]);
        setQuery("");
        focusSearch();
      }
    }
  };

  function addAndRefocus(product: Product) {
    order.addToCart(product);
    setQuery("");
    setOpenId(null);
    focusSearch();
  }

  function stepQty(productId: number, delta: number) {
    order.changeQty(productId, delta);
    setOpenId(null);
  }

  function stepRemove(productId: number) {
    order.removeLine(productId);
    setOpenId(null);
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:h-[calc(100vh-8rem)] lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* Left: products */}
      <div className="flex min-h-0 min-w-0 flex-col gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari produk, SKU, atau scan barcode..."
            aria-label="Cari produk, SKU, atau scan barcode"
            className="h-11 rounded-lg border-outline-variant bg-surface-container-low pl-10 text-base shadow-none"
          />
        </div>

        {/* Category chips */}
        <div className="scrollbar-hide flex shrink-0 gap-2 overflow-x-auto pb-0.5">
          <button
            onClick={() => setCategory("all")}
            className={cn(
              "shrink-0 inline-flex min-h-[44px] cursor-pointer items-center whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-colors",
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
                "shrink-0 inline-flex min-h-[44px] cursor-pointer items-center whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-colors",
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
            {filtered.map((p) => {
              const qty = order.cart.find((l) => l.productId === p.id)?.qty ?? 0;
              const out = p.stock <= 0;
              return (
              <div
                key={p.id}
                className={cn(
                  "group overflow-hidden rounded-lg border border-outline-variant bg-card text-left shadow-sm transition-all hover:shadow-md",
                  out && "opacity-60"
                )}
              >
                <div className="relative flex h-20 items-center justify-center overflow-hidden bg-surface-container-high sm:h-24">
                  {p.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- data URL base64, tidak bisa dioptimasi next/image */
                    <img
                      src={p.image}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <Package className="h-8 w-8 text-on-surface-variant transition-transform group-hover:scale-110" />
                  )}
                  {out ? (
                    <span className="absolute inset-x-0 bottom-0 bg-black/55 py-0.5 text-center text-[10px] font-bold uppercase tracking-wide text-white">
                      Habis
                    </span>
                  ) : qty === 0 ? (
                    <button
                      onClick={() => addAndRefocus(p)}
                      aria-label={`Tambah ${p.name}`}
                      className="absolute right-2 top-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-primary shadow-md transition-transform hover:scale-105 active:scale-95 sm:h-11 sm:w-11"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  ) : openId === p.id ? (
                    <span data-stepper className="absolute right-2 top-2 flex items-center gap-0.5 rounded-full bg-white p-0.5 shadow-md sm:p-1">
                      {qty <= 1 ? (
                        <button
                          onClick={() => stepRemove(p.id)}
                          aria-label={`Hapus ${p.name}`}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-destructive-container text-on-destructive-container transition-transform active:scale-95 sm:h-10 sm:w-10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => stepQty(p.id, -1)}
                          aria-label={`Kurangi ${p.name}`}
                          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container-low sm:h-10 sm:w-10"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      )}
                      <span aria-live="polite" className="w-5 text-center text-sm font-bold">{qty}</span>
                      <button
                        onClick={() => stepQty(p.id, 1)}
                        aria-label={`Tambah ${p.name}`}
                        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 active:scale-95 sm:h-10 sm:w-10"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </span>
                  ) : (
                    <button
                      data-stepper
                      onClick={() => setOpenId(p.id)}
                      aria-label={`Ubah jumlah ${p.name}, saat ini ${qty}`}
                      aria-expanded="false"
                      className="absolute right-2 top-2 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-sm font-bold text-on-surface shadow-md transition-transform active:scale-95 sm:h-11 sm:w-11"
                    >
                      {qty}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => !out && addAndRefocus(p)}
                  disabled={out}
                  aria-label={out ? `${p.name}, stok habis` : `Tambah ${p.name}`}
                  className="block w-full cursor-pointer p-2.5 text-left disabled:cursor-not-allowed"
                >
                  <div className="truncate text-sm font-semibold">{p.name}</div>
                  <div className="mt-0.5 text-sm font-bold text-primary">{formatRupiah(p.price)}</div>
                </button>
              </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="col-span-full rounded-xl border border-dashed border-outline-variant p-8 text-center text-sm text-on-surface-variant">
                Tidak ada produk. Coba istilah lain atau scan barcode.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Right: cart & checkout (desktop saja; mobile lewat Rangkuman). */}
      <div className="hidden min-h-0 min-w-0 lg:flex lg:flex-col lg:overflow-y-auto">
        <OrderPanel order={order} customers={customers} setting={setting} />
      </div>
    </div>
  );
}
