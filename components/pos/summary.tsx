"use client";

import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { OrderPanel } from "@/components/pos/order-panel";
import { usePosOrder } from "@/components/pos/use-pos-order";
import type { CartProduct, Customer, Setting } from "@/components/pos/order-types";

// Halaman Rangkuman Pesanan (mobile ala GrabFood): daftar item yang bisa
// diubah + seluruh blok pembayaran. Logika sama persis dengan kolom kanan
// POS desktop karena memakai hook dan panel yang sama.
export default function SummaryClient({ ownerId, products, customers, setting }: { ownerId: number; products: CartProduct[]; customers: Customer[]; setting: Setting }) {
  const order = usePosOrder({ ownerId, products, customers, setting });

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link
          href="/pos"
          aria-label="Kembali ke Kasir"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-lg font-bold leading-tight">Rangkuman Pesanan</h1>
          <p className="text-xs text-on-surface-variant">Periksa item lalu pilih pembayaran</p>
        </div>
        <Link
          href="/pos"
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-primary"
        >
          <Plus className="h-4 w-4" /> Tambah
        </Link>
      </div>

      {!order.ready ? <p role="status" className="py-8 text-center text-sm text-on-surface-variant">Memuat pesanan...</p> : order.cart.length === 0 ? (
        <div className="rounded-xl border border-dashed border-outline-variant bg-card p-8 text-center">
          <p className="text-sm font-medium">Keranjang masih kosong</p>
          <p className="mt-1 text-xs text-on-surface-variant">Tambahkan produk dulu dari halaman Kasir.</p>
          <Link
            href="/pos"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Ke Kasir
          </Link>
        </div>
      ) : (
        <OrderPanel order={order} customers={customers} setting={setting} />
      )}
    </div>
  );
}
