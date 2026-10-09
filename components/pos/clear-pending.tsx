"use client";

import { useEffect } from "react";
import { cartStorageKey, pendingStorageKey } from "@/lib/storage";
import { setCartBar } from "@/components/pos/cart-bar-store";

// Membersihkan transaksi yang sudah selesai dari sessionStorage (keranjang POS
// + payload pembayaran QRIS) begitu halaman sukses dimuat, agar transaksi
// berikutnya mulai dari keranjang kosong.

export function ClearPending({ ownerId, saleKey }: { ownerId: number; saleKey: string | null }) {
  useEffect(() => {
    try {
      if (!saleKey) return;
      for (const key of [cartStorageKey(ownerId), pendingStorageKey(ownerId)]) {
        const value = sessionStorage.getItem(key);
        if (value && JSON.parse(value).saleKey === saleKey) {
          sessionStorage.removeItem(key);
          if (key === cartStorageKey(ownerId)) setCartBar({ ownerId, count: 0, total: 0 });
        }
      }
    } catch {
      /* abaikan bila storage tidak tersedia */
    }
  }, [ownerId, saleKey]);
  return null;
}
