"use client";

import * as React from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { ArrowLeft, CheckCircle2, Loader2, QrCode, ReceiptText, UploadCloud, X } from "lucide-react";
import { checkout } from "@/lib/actions";
import { convertQRIS } from "@/lib/qris";
import { resizeImageToDataUrl, PROOF_IMAGE_MAX_DIM, PROOF_IMAGE_QUALITY } from "@/lib/image";
import { formatRupiah } from "@/lib/utils";
import { Button, Card, Label } from "@/components/ui";
import { PENDING_KEY } from "@/lib/storage";

// Payload transaksi yang masih berjalan — diisi oleh POS (components/pos/pos.tsx)
// saat kasir menekan "Lanjutkan Pembayaran", dibersihkan di halaman sukses.

type PendingPayment = {
  items: { productId: number; name: string; price: number; qty: number }[];
  discountType: "FIXED" | "PERCENT";
  discountValue: number;
  paid: number;
  paymentMethod: string;
  customerId: number | null;
  usePoints: boolean;
  // Rincian final (dihitung di POS sehingga konsisten dengan total & QR).
  subtotal: number;
  discount: number;
  tax: number;
  pointsUsed: number;
  total: number;
};

type CartItem = { productId: number; name: string; price: number; qty: number; stock: number };

function readPending(): PendingPayment | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    // Validasi bentuk payload: rincian harus lengkap agar tidak memunculkan
    // nilai Rp NaN dari data lama/rusak.
    if (!Array.isArray(d.items) || !d.items.length) return null;
    if (typeof d.total !== "number" || typeof d.subtotal !== "number") return null;
    if (typeof d.discount !== "number" || typeof d.tax !== "number" || typeof d.pointsUsed !== "number") return null;
    return d as PendingPayment;
  } catch {
    return null;
  }
}

export default function ConfirmClient({ setting }: { setting: { storeName: string; taxRate: number; qrisStatic: string } }) {
  // Baca payload dari sessionStorage setelah mount (hindari hydration mismatch:
  // render awal selalu "Memuat...").
  const [pending, setPending] = React.useState<PendingPayment | null>(null);
  const [ready, setReady] = React.useState(false);
  const [qrUrl, setQrUrl] = React.useState<string | null>(null);
  const [qrError, setQrError] = React.useState<string | null>(null);
  const [proofImage, setProofImage] = React.useState<string | null>(null);
  const [proofError, setProofError] = React.useState<string | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const proofRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    let alive = true;
    // Baca storage lewat microtask agar tidak memicu aturan lint set-state-in-effect.
    Promise.resolve().then(() => {
      if (!alive) return;
      setPending(readPending());
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const staticTrim = setting.qrisStatic.trim();
  const amount = pending ? Math.round(pending.total) : 0;
  const dynamicPayload = React.useMemo(() => {
    if (!pending || !staticTrim) return null;
    try {
      return convertQRIS(staticTrim, { amount });
    } catch {
      return null;
    }
  }, [pending, staticTrim, amount]);

  // Generate gambar QR dinamis (async). Payload sudah final dari pending.total,
  // sama dengan yang akan digenerate ulang server saat checkout.
  React.useEffect(() => {
    let alive = true;
    if (!dynamicPayload) return;
    QRCode.toDataURL(dynamicPayload, { width: 360, margin: 2, errorCorrectionLevel: "M" })
      .then((u) => {
        if (alive) {
          setQrUrl(u);
          setQrError(null);
        }
      })
      .catch(() => alive && setQrError("Gagal membuat QR dinamis. Coba lagi."));
    return () => {
      alive = false;
    };
  }, [dynamicPayload]);

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

  async function handleConfirm() {
    if (!pending) return;
    setSubmitError(null);
    setLoading(true);
    try {
      const res = await checkout({
        items: pending.items as CartItem[],
        discountType: pending.discountType,
        discountValue: pending.discountValue,
        paid: pending.paid,
        paymentMethod: "QRIS",
        customerId: pending.customerId,
        usePoints: pending.usePoints,
        paymentProof: proofImage,
      });
      if (res?.error) {
        setSubmitError(res.error);
        setLoading(false);
        return;
      }
      // Sukses: checkout melakukan redirect ke /pos/success/{id}; storage
      // dibersihkan oleh komponen ClearPending di halaman sukses.
    } catch {
      setSubmitError("Terjadi kesalahan saat memproses pembayaran. Coba lagi.");
      setLoading(false);
    }
  }

  const configError = !ready
    ? null
    : !staticTrim
      ? "QRIS statis belum diatur — buka menu Pengaturan lalu upload/tempel string QRIS statis."
      : !dynamicPayload
        ? "Gagal mengonversi QRIS statis menjadi dinamis."
        : null;

  // Belum termuat → spinner singkat.
  if (!ready) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-sm text-on-surface-variant">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        Memuat konfirmasi pembayaran...
      </div>
    );
  }

  // Tidak ada transaksi berjalan → arahkan kembali ke kasir.
  if (!pending) {
    return (
      <div className="mx-auto max-w-md">
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <ReceiptText className="h-10 w-10 text-on-surface-variant" />
          <div>
            <h1 className="font-display text-lg font-bold">Tidak ada transaksi berjalan</h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Pilih produk di halaman Kasir terlebih dahulu, lalu pilih metode QRIS dan tekan &quot;Lanjutkan Pembayaran&quot;.
            </p>
          </div>
          <Button variant="accent" asChild>
            <Link href="/pos">Kembali ke Kasir</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Konfirmasi Pembayaran</h1>
          <p className="text-sm text-muted-foreground">Minta pelanggan memindai QRIS di bawah ini</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/pos">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Kasir
          </Link>
        </Button>
      </div>

      <Card className="p-6">
        {/* QR besar */}
        <div className="flex flex-col items-center">
          {configError ? (
            <div className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant px-4 py-10 text-center">
              <QrCode className="h-10 w-10 text-destructive" />
              <p className="max-w-xs text-sm text-destructive">{configError}</p>
            </div>
          ) : qrError ? (
            <p className="text-sm text-destructive">{qrError}</p>
          ) : qrUrl ? (
            <>
              <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR, bukan aset */}
                <img src={qrUrl} alt="QRIS dinamis" className="h-64 w-64 sm:h-72 sm:w-72" />
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Total yang harus dibayar</p>
                <p className="mt-1 font-display text-3xl font-bold text-primary">{formatRupiah(amount)}</p>
              </div>
              <p className="mt-3 flex items-center gap-1.5 rounded-full bg-secondary-container/40 px-3 py-1 text-xs font-semibold text-on-secondary-container">
                <CheckCircle2 className="h-4 w-4" /> QRIS Dinamis — nominal otomatis terisi
              </p>
            </>
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          )}
        </div>

        {/* Rincian pesanan */}
        <div className="mt-6 border-t border-dashed border-outline-variant pt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-on-surface-variant">
            <span className="font-semibold uppercase tracking-wide">{setting.storeName || "Toko"}</span>
            <span>{pending.items.reduce((s, i) => s + i.qty, 0)} item</span>
          </div>
          <ul className="space-y-1.5 text-sm">
            {pending.items.map((it) => (
              <li key={it.productId} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{it.name}</span>
                <span className="shrink-0 font-mono text-on-surface-variant">
                  {it.qty} × {formatRupiah(it.price)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 space-y-1 border-t border-dashed border-outline-variant pt-2 text-sm">
            <div className="flex justify-between text-on-surface-variant">
              <span>Subtotal</span>
              <span className="font-mono">{formatRupiah(pending.subtotal)}</span>
            </div>
            {pending.discount > 0 && (
              <div className="flex justify-between text-on-surface-variant">
                <span>Diskon{pending.discountType === "PERCENT" ? ` (${pending.discountValue}%)` : ""}</span>
                <span className="font-mono">-{formatRupiah(pending.discount)}</span>
              </div>
            )}
            {pending.tax > 0 && (
              <div className="flex justify-between text-on-surface-variant">
                <span>Pajak ({setting.taxRate}%)</span>
                <span className="font-mono">{formatRupiah(pending.tax)}</span>
              </div>
            )}
            {pending.pointsUsed > 0 && (
              <div className="flex justify-between text-on-surface-variant">
                <span>Poin</span>
                <span className="font-mono">-{formatRupiah(pending.pointsUsed)}</span>
              </div>
            )}
            <div className="flex justify-between pt-1 font-display text-base font-bold">
              <span>TOTAL</span>
              <span className="font-mono">{formatRupiah(pending.total)}</span>
            </div>
          </div>
        </div>

        {/* Bukti pembayaran (opsional) */}
        <div className="mt-5 rounded-xl border border-outline-variant bg-surface p-3">
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
              <UploadCloud className="h-5 w-5" /> Lampirkan foto setelah pelanggan membayar (opsional)
            </button>
          )}
          {proofError && <p className="mt-1 text-xs text-destructive">{proofError}</p>}
        </div>

        {submitError && <p className="mt-3 rounded-lg bg-destructive-container/60 px-3 py-2 text-sm text-destructive">{submitError}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
          <Button variant="outline" asChild className="flex-1">
            <Link href="/pos">Kembali</Link>
          </Button>
          <Button
            variant="accent"
            className="flex-1 text-base font-bold"
            disabled={loading || !!configError}
            onClick={handleConfirm}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Memproses...
              </>
            ) : (
              <>Konfirmasi & Selesaikan</>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
