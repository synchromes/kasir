"use client";

import * as React from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { checkout } from "@/lib/actions";
import { validateQRIS } from "@/lib/qris";
import { resizeImageToDataUrl, PROOF_IMAGE_MAX_DIM, PROOF_IMAGE_QUALITY } from "@/lib/image";
import { cartStorageKey, pendingStorageKey, clearLegacyPosStorage } from "@/lib/storage";
import { setCartBar } from "@/components/pos/cart-bar-store";
import type { CartLine, CartProduct, Customer, Product, Setting } from "@/components/pos/order-types";

// Kunci idempotensi: dipakai server untuk mencegah sale ganda saat retry
// (mis. response hilang karena timeout lalu kasir menekan bayar lagi).
function genKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

const savedOrderSchema = z.object({
  ownerId: z.number().int().positive(),
  saleKey: z.string().min(1).max(128),
  items: z.array(z.object({ productId: z.number().int().positive(), qty: z.number().int().positive().max(2147483647) })),
  discountType: z.enum(["FIXED", "PERCENT"]),
  discountValue: z.number().finite().nonnegative(),
  customerId: z.string(),
  usePoints: z.boolean(),
  paymentMethod: z.enum(["CASH", "QRIS", "TRANSFER"]),
  paid: z.string(),
});

export function usePosOrder({ ownerId, products, customers, setting }: { ownerId: number; products: CartProduct[]; customers: Customer[]; setting: Setting }) {
  const [cart, setCart] = React.useState<CartLine[]>([]);
  const [discountType, updateDiscountType] = React.useState<"FIXED" | "PERCENT">("FIXED");
  const [discountValue, updateDiscountValue] = React.useState(0);
  const [customerId, setCustomerId] = React.useState<string>("");
  const [usePoints, updateUsePoints] = React.useState(false);
  const [paymentMethod, updatePaymentMethod] = React.useState("CASH");
  const [paid, setPaid] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  const router = useRouter();

  // Pulihkan key bersama pesanan; buat key baru hanya saat pesanan diedit.
  const [saleKey, setSaleKey] = React.useState(() => genKey());

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

  // Legacy tanpa owner tidak dapat dipindahkan dengan aman ke akun aktif.
  React.useEffect(() => {
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      try {
        clearLegacyPosStorage();
        const raw = sessionStorage.getItem(cartStorageKey(ownerId));
        if (raw) {
          const parsed = savedOrderSchema.safeParse(JSON.parse(raw));
          if (parsed.success && parsed.data.ownerId === ownerId) {
            const data = parsed.data;
            const items = data.items.flatMap((item) => {
              const product = products.find((p) => p.id === item.productId);
              return product ? [{ productId: product.id, name: product.name, price: product.price, qty: item.qty, stock: product.stock, unit: product.unit }] : [];
            });
            const customer = customers.find((c) => String(c.id) === data.customerId);
            setCart(items);
            setSaleKey(data.saleKey);
            updateDiscountType(data.discountType);
            updateDiscountValue(data.discountValue);
            setCustomerId(customer ? data.customerId : "");
            updateUsePoints(!!customer?.isMember && data.usePoints);
            updatePaymentMethod(data.paymentMethod);
            setPaid(data.paid);
          } else {
            sessionStorage.removeItem(cartStorageKey(ownerId));
          }
        }
      } catch {
        /* abaikan data korup */
      }
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [ownerId, products, customers]);

  const persistOrder = React.useCallback(() => {
    sessionStorage.setItem(
      cartStorageKey(ownerId),
      JSON.stringify({ ownerId, saleKey, items: cart, discountType, discountValue, customerId, usePoints, paymentMethod, paid })
    );
  }, [ownerId, saleKey, cart, discountType, discountValue, customerId, usePoints, paymentMethod, paid]);

  // Simpan keranjang setiap berubah agar tidak hilang saat pindah halaman.
  React.useEffect(() => {
    if (!ready) return;
    try {
      persistOrder();
    } catch {
      /* abaikan */
    }
  }, [ready, persistOrder]);

  // Kabari bar bawah mobile setiap ringkasan berubah.
  React.useEffect(() => {
    if (ready) setCartBar({ ownerId, count: totalQty, total });
  }, [ready, ownerId, totalQty, total]);

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
    if (!ready || product.stock <= 0 || (cart.find((line) => line.productId === product.id)?.qty ?? 0) >= product.stock) return;
    setSaleKey(genKey());
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
    const line = cart.find((item) => item.productId === productId);
    if (!line || (delta > 0 && line.qty + delta > line.stock)) return;
    setSaleKey(genKey());
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const nq = l.qty + delta;
          if (nq < 0 || (delta > 0 && nq > l.stock)) return l;
          return { ...l, qty: nq };
        })
        .filter((l) => l.qty > 0)
    );
  }
  function removeLine(productId: number) {
    setSaleKey(genKey());
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }

  async function handleCheckout() {
    if (!ready || loading) return;
    setError(null);
    try {
      persistOrder();
    } catch {
      setError("Pesanan tidak dapat disimpan di browser. Izinkan penyimpanan lalu coba lagi.");
      return;
    }
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
    if (!ready || loading) return;
    const pending = {
      ownerId,
      saleKey,
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
      persistOrder();
      sessionStorage.setItem(pendingStorageKey(ownerId), JSON.stringify(pending));
    } catch {
      setError("Pesanan tidak dapat disimpan di browser. Izinkan penyimpanan lalu coba lagi.");
      return;
    }
    router.push("/pos/confirm");
  }

  const changeCustomer = (v: string) => {
    if (v === customerId) return;
    setSaleKey(genKey());
    setCustomerId(v);
    updateUsePoints(false);
  };

  function setDiscountType(value: "FIXED" | "PERCENT") {
    if (value === discountType) return;
    setSaleKey(genKey());
    updateDiscountType(value);
  }
  function setDiscountValue(value: number) {
    if (value === discountValue) return;
    setSaleKey(genKey());
    updateDiscountValue(value);
  }
  function setUsePoints(value: boolean) {
    if (value === usePoints) return;
    setSaleKey(genKey());
    updateUsePoints(value);
  }
  function setPaymentMethod(value: string) {
    if (value === paymentMethod) return;
    setSaleKey(genKey());
    updatePaymentMethod(value);
  }

  return {
    ready,
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
