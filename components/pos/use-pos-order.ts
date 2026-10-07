"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { checkout } from "@/lib/actions";
import { validateQRIS } from "@/lib/qris";
import { resizeImageToDataUrl, PROOF_IMAGE_MAX_DIM, PROOF_IMAGE_QUALITY } from "@/lib/image";
import { CART_KEY, PENDING_KEY } from "@/lib/storage";
import { setCartBar } from "@/components/pos/cart-bar-store";
import type { CartLine, Customer, Product, Setting } from "@/components/pos/order-types";

// Kunci idempotensi: dipakai server untuk mencegah sale ganda saat retry
// (mis. response hilang karena timeout lalu kasir menekan bayar lagi).
function genKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

// Seluruh state pesanan (keranjang + pembayaran) dalam satu hook agar
// halaman POS dan halaman Rangkuman memakai logika yang sama persis.
// Keranjang dipulihkan/disimpan via sessionStorage sehingga bertahan saat
// pindah halaman.
export function usePosOrder({ customers, setting }: { customers: Customer[]; setting: Setting }) {
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [discountType, setDiscountType] = React.useState<"FIXED" | "PERCENT">("FIXED");
  const [discountValue, setDiscountValue] = React.useState(0);
  const [customerId, setCustomerId] = React.useState<string>("");
  const [usePoints, setUsePoints] = React.useState(false);
  const [paymentMethod, setPaymentMethod] = React.useState("CASH");
  const [paid, setPaid] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const router = useRouter();

  // Kunci idempotensi transaksi. Harus STABIL selama retry keranjang yang sama
  // (agar tidak menciptakan sale ganda), tetapi BERUBAH saat isi keranjang
  // berubah (transaksi baru). Dibaca lewat microtask karena lint set-state-in-effect.
  const [saleKey, setSaleKey] = React.useState(() => genKey());
  React.useEffect(() => {
    Promise.resolve().then(() => setSaleKey(genKey()));
  }, [cart]);

  // Foto bukti pembayaran (Transfer)
  const [proofImage, setProofImage] = React.useState<string | null>(null);
  const [proofError, setProofError] = React.useState<string | null>(null);
  const proofRef = React.useRef<HTMLInputElement>(null);

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
  const paidNum = Number(paid.replace(/\D/g, "")) || 0;
  const change = paidNum - total;
  const pointsEarned = Math.floor(total / 10000) * setting.pointsPer10k;
  const totalQty = cart.reduce((s, i) => s + i.qty, 0);

  // QRIS: QR dinamis berukuran besar ditampilkan di halaman Konfirmasi
  // Pembayaran, di sini cukup validasi konfigurasi QRIS statis toko.
  const showQris = paymentMethod === "QRIS" && cart.length > 0 && total > 0;
  const qrisStaticTrim = setting.qrisStatic?.trim() ?? "";
  const qrisValidation = qrisStaticTrim ? validateQRIS(qrisStaticTrim) : null;
  const qrisConfigError =
    showQris
      ? !qrisStaticTrim
        ? "QRIS statis belum diatur, buka menu Pengaturan lalu upload/tempel string QRIS statis."
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
        // Keranjang disimpan terpisah (CART_KEY). Pending QRIS TIDAK dihapus
        // di sini: menghapusnya di mount membuat kasir kehilangan transaksi
        // berjalan saat menekan browser-back dari konfirmasi lalu forward lagi.
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
      // restore selesai, mencegah keranjang kosong menimpa data saat mount.
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

  // Kabari bar bawah mobile setiap ringkasan berubah.
  React.useEffect(() => {
    setCartBar({ count: totalQty, total });
  }, [totalQty, total]);

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

  function clearProof() {
    setProofImage(null);
    if (proofRef.current) proofRef.current.value = "";
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
  }

  function changeQty(productId: number, delta: number) {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const nq = l.qty + delta;
          if (nq < 0 || nq > l.stock) return l;
          return { ...l, qty: nq };
        })
        .filter((l) => l.qty > 0)
    );
  }
  function removeLine(productId: number) {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  async function handleCheckout() {
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await checkout({
        items: cart,
        discountType,
        discountValue,
        paid: paymentMethod === "CASH" ? paidNum || total : total,
        paymentMethod,
        customerId: selectedCustomer ? Number(selectedCustomer.id) : null,
        usePoints: pointsToUse > 0,
        paymentProof: proofImage,
        saleKey,
        pointsUsed: pointsToUse,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      // Sukses → server melakukan redirect ke halaman sukses.
    } catch {
      // Jangan biarkan tombol "Bayar" terkunci selamanya saat request gagal.
      setError("Gagal memproses pembayaran. Periksa koneksi lalu coba lagi.");
    } finally {
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

  return {
    cart,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    customerId,
    changeCustomer,
    usePoints,
    setUsePoints,
    paymentMethod,
    setPaymentMethod,
    paid,
    setPaid,
    error,
    loading,
    proofImage,
    setProofImage,
    proofError,
    proofRef,
    handleProofChange,
    clearProof,
    addToCart,
    changeQty,
    removeLine,
    selectedCustomer,
    subtotal,
    discountPct,
    effDiscount,
    tax,
    maxPoints,
    pointsToUse,
    total,
    paidNum,
    change,
    pointsEarned,
    totalQty,
    showQris,
    qrisConfigError,
    handleCheckout,
    handleContinue,
  };
}

export type PosOrder = ReturnType<typeof usePosOrder>;
