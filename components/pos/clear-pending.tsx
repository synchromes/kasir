"use client";

import { useEffect } from "react";
import { CART_KEY, PENDING_KEY } from "@/lib/storage";

// Membersihkan transaksi yang sudah selesai dari sessionStorage (keranjang POS
// + payload pembayaran QRIS) begitu halaman sukses dimuat, agar transaksi
// berikutnya mulai dari keranjang kosong.

export function ClearPending() {
  useEffect(() => {
    try {
      sessionStorage.removeItem(CART_KEY);
      sessionStorage.removeItem(PENDING_KEY);
    } catch {
      /* abaikan bila storage tidak tersedia */
    }
  }, []);
  return null;
}
